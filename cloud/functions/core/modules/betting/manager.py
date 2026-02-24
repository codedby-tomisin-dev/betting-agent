from datetime import datetime, timezone, date, timedelta
from random import shuffle
from typing import Dict, Any, List, Optional
import os
import uuid
from pydantic import ValidationError

from core import logger
from core.timestamps import server_timestamp
from core.modules.betting.agent import betting_agent
from core.modules.betting.agent.service import make_bet_selections
from core.modules.betting.sourcing.service import gather_intelligence
from core.modules.betting.models import AnalyzeBetsRequest, BettingAgentResponse, GetOddsRequest, PlaceBetRequest
from core.modules.betting.repository import BetRepository
from core.modules.betting.suggestion_repository import SuggestionRepository
from constants import AUTOMATED_BETTING_OPTIONS, RELIABLE_COMPETITIONS
from third_party.betting_platforms.models import Event
from core.modules.betting.betfair_service import BetfairService
from core.modules.settings.manager import SettingsManager
from core.modules.learnings.manager import LearningsManager
from core.modules.wallet.service import WalletService


class BettingManager:
    """Manager for betting analysis and recommendations"""

    def __init__(
        self,
        betfair_service=None,
        bet_repo=None,
        settings_manager=None,
        suggestion_repo=None,
        learnings_manager=None,
        wallet_service=None,
    ):
        self.betfair = betfair_service or BetfairService()
        self.repo = bet_repo or BetRepository()
        self.settings_manager = settings_manager or SettingsManager()
        self._suggestion_repo = suggestion_repo
        self._learnings_manager = learnings_manager
        self._wallet_service = wallet_service

    @staticmethod
    def _build_analysis_update(existing_doc: dict, analysis_result: dict) -> dict:
        """Build the common Firestore update payload after AI analysis for both bet slips and suggestions."""
        starting_balance = existing_doc.get("balance", {}).get("starting", 0)
        total_stake = analysis_result.get("total_stake", 0)
        total_returns = analysis_result.get("total_returns", 0)
        net_profit = total_returns - total_stake
        combined_odds = total_returns / total_stake if total_stake > 0 else 1.0
        return {
            "status": "analyzed",
            "analyzed_at": server_timestamp(),
            "selections": {
                **analysis_result.get("selections", {}),
                "wager": {
                    "odds": round(combined_odds, 2),
                    "stake": total_stake,
                    "potential_returns": total_returns
                }
            },
            "balance": {
                **existing_doc.get("balance", {}),
                "predicted": starting_balance + net_profit
            },
            "ai_reasoning": analysis_result.get("overall_reasoning", ""),
        }

    @staticmethod
    def _calculate_budget(available_balance: float, bankroll_percent: float, max_bankroll: float) -> float:
        """Calculate betting budget as a capped percentage of available balance."""
        return min(available_balance * (bankroll_percent / 100), max_bankroll)

    def get_suggestion_repo(self) -> SuggestionRepository:
        """Return the injected SuggestionRepository, or create a default one lazily."""
        if self._suggestion_repo is None:
            self._suggestion_repo = SuggestionRepository()
        return self._suggestion_repo

    def get_learnings_manager(self) -> LearningsManager:
        """Return the injected LearningsManager, or create a default one lazily."""
        if self._learnings_manager is None:
            self._learnings_manager = LearningsManager()
        return self._learnings_manager

    def _is_valid_bet(self, stake: float, odds: float) -> bool:
        """Return True if a bet meets the minimum stake and profit requirements from user settings."""
        settings = self.settings_manager.get_betting_settings()
        return stake >= settings.min_stake and stake * (odds - 1) >= settings.min_profit

    def get_all_upcoming_games(self, sport: Optional[str] = None, date: Optional[str] = None, competitions: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Get all upcoming games from Betfair based on user settings.
        
        Args:
            sport: Sport to search (defaults to "Soccer").
            date: Optional date string in YYYY-MM-DD format to filter games.

        Returns:
            List of formatted game objects for the frontend.
        """
        # Use competitions from RELIABLE_TEAMS constants to ensure we show relevant leagues
        # This matches the user request to "show other options that are not AI recommended"
        # but are still in the trusted leagues.
        competitions = competitions or RELIABLE_COMPETITIONS
        
        logger.info(f"Fetching upcoming games for competitions: {competitions}" + (f" on date: {date}" if date else ""))
        
        try:
            games = self.betfair.search_market(sport=sport, competitions=competitions, date=date)
            
            formatted_games = []

            for game in games:
                formatted_games.append(game)
            
            formatted_games.sort(key=lambda x: x["time"])
            
            return formatted_games
            
        except Exception as e:
            logger.error(f"Error fetching upcoming games: {e}", exc_info=True)
            return []
    
    def analyze_betting_opportunities(self, request: AnalyzeBetsRequest) -> Dict[str, Any]:
        """
        Analyze betting opportunities using AI agent with web research.
        
        Args:
            request: AnalyzeBetsRequest containing events, risk_appetite, and budget
            
        Returns:
            Dictionary with recommendation and reasoning
            
        Raises:
            ValueError: If events cannot be parsed
            Exception: If agent analysis fails
        """
        # Parse events using Event model
        try:
            events = [Event(**event) for event in request.events]
        except Exception as e:
            logger.error(f"Failed to parse events: {e}")
            raise ValueError(f"Invalid event data: {str(e)}")
        
        # Get the centralized learnings
        try:
            learnings_markdown = self.get_learnings_manager().get_current_learnings()
        except Exception as e:
            logger.error(f"Failed to fetch learnings: {e}")
            learnings_markdown = ""
            
        learnings_section = f"\n\n    === HISTORICAL LEARNINGS ===\n    {learnings_markdown}\n    (Use these learnings to avoid past mistakes and validate your reasoning)" if learnings_markdown else ""

        from constants import RELIABLE_ALL_TEAMS, RELIABLE_COMPETITIONS
        import random

        reliable_events = []
        fallback_recommendations = []
        
        for event in events:
            is_reliable = (
                event.competition_name in RELIABLE_COMPETITIONS or
                any(team in event.event_name for team in RELIABLE_ALL_TEAMS)
            )
            if is_reliable:
                reliable_events.append(event)
            else:
                logger.info(f"Event {event.event_name} not in reliable teams/competitions. Applying scripted fallback.")
                
                # Desired options for fallback
                fallback_targets = [
                    ("OVER_UNDER_05", "Over 0.5 Goals"),
                    ("OVER_UNDER_55", "Under 5.5 Goals"),
                    ("OVER_UNDER_65", "Under 6.5 Goals")
                ]
                # Shuffle so we pick a different one if multiple are available
                random.shuffle(fallback_targets)
                
                selected_option = None
                selected_market_id = None
                
                # Find the first available fallback option
                for market_name, option_name in fallback_targets:
                    for market in event.options:
                        if market.name == market_name:
                            for opt in market.options:
                                if opt.name == option_name:
                                    selected_option = opt
                                    selected_market_id = market.market_id
                                    break
                        if selected_option:
                            break
                    if selected_option:
                        break
                        
                if selected_option:
                    import math
                    # Very simple staking rule for fallbacks: 
                    # Aim for the minimum profit plus a tiny margin to safely pass _is_valid_bet checks
                    stake = (request.min_profit + 0.1) / (selected_option.odds - 1) if selected_option.odds > 1.0 else 0
                    
                    # Round up to the nearest dollar to confidently pass validation
                    stake = math.ceil(stake) 
                    
                    # Cap at total budget. Extremely short odds may require full budget.
                    stake = min(stake, request.budget)
                    stake = max(stake, 1.0) # At least $1
                    
                    if getattr(self, '_is_valid_bet', None):
                        if not self._is_valid_bet(stake, selected_option.odds):
                            logger.info(f"Fallback {selected_option.name} @ {selected_option.odds} skipped: stake {stake:.2f} failed validation.")
                            continue # Skip if it doesn't meet minimum requirements

                    # We import the model here for the fallback injection
                    from core.modules.betting.models import BettingAgentResponse
                    
                    fallback_rec = BettingAgentResponse.BetRecommendation(
                        pick=BettingAgentResponse.BetRecommendation.Pick(
                            event_name=event.event_name,
                            market_name=market.name,
                            option_name=selected_option.name
                        ),
                        market_id=selected_market_id,
                        selection_id=selected_option.selection_id,
                        stake=round(stake, 2),
                        odds=selected_option.odds,
                        side="BACK",
                        reasoning="Scripted fallback: Low-information match in unrecognized league. Structurally safe goal ceiling chosen.",
                        confidence_rating=3,
                        stake_justification=f"Minimum profit requirement dictated a ${stake:.2f} stake."
                    )
                    fallback_recommendations.append(fallback_rec)

        logger.info(f"Analyzing {len(reliable_events)} events with AI, generated {len(fallback_recommendations)} fallback recommendations.")

        # --- Step 1: Source intelligence for all reliable events ---
        if reliable_events:
            intelligence_section = gather_intelligence(reliable_events)
        else:
            intelligence_section = ""

        # --- Step 2: Build and run the decision agent ---
        all_recommendations = []
        overall_reasoning = ""

        if reliable_events:
            try:
                response_data: BettingAgentResponse = make_bet_selections(
                    events=reliable_events,
                    intelligence_section=intelligence_section,
                    budget=request.budget,
                    min_profit=request.min_profit,
                    risk_appetite=request.risk_appetite,
                    learnings_section=learnings_section,
                )
                
                overall_reasoning = response_data.overall_reasoning
                
                for rec in response_data.recommendations:
                    if self._is_valid_bet(rec.stake, rec.odds):
                        all_recommendations.append(rec)
                    else:
                        potential_profit = rec.stake * (rec.odds - 1)
                        logger.warning(
                            f"Skipping recommendation - stake: {rec.stake}, "
                            f"profit: {potential_profit:.3f} - {rec.pick.event_name}"
                        )
                
            except Exception as e:
                logger.error(f"Error analyzing events: {e}")
                overall_reasoning = f"Failed to analyze events - {str(e)}"
        
        # Combine AI recommendations with our fallback recommendations
        all_recommendations.extend(fallback_recommendations)

        # Aggregate results (recommendations are already filtered)
        total_stake = sum(rec.stake for rec in all_recommendations)
        
        # Enforce budget constraint: if total stake exceeds budget, scale down proportionally
        if total_stake > request.budget:
            scale_factor = request.budget / total_stake
            logger.warning(
                f"Total stake ${total_stake:.2f} exceeds budget ${request.budget:.2f}. "
                f"Scaling down all stakes by {scale_factor:.2%}"
            )
            for rec in all_recommendations:
                rec.stake = rec.stake * scale_factor
            total_stake = request.budget
        
        total_returns = sum(rec.stake * rec.odds for rec in all_recommendations)
        
        # Calculate total odds as weighted average (total_returns / total_stake)
        total_odds = total_returns / total_stake if total_stake > 0 else 0
        
        # Transform to selections format with simplified items and full details
        selections_items = []
        
        for rec in all_recommendations:
            # Find the original event object that matches this recommendation
            # Match by event name (careful with exact match requirement)
            original_event = next((e for e in events if e.event_name == rec.pick.event_name), None)
            
            if not original_event:
                 # Fallback: try relaxed matching in case AI slightly altered name
                 logger.warning(f"Could not find exact event match for '{rec.pick.event_name}'. Creating simplified event data.")
                 event_data = {
                     "name": rec.pick.event_name,
                     "time": None,
                     "competition": {"name": "Unknown"}
                 }
            else:
                event_data = {
                    "name": rec.pick.event_name,
                    "time": original_event.event_time,
                    "competition": {
                        "name": original_event.competition_name
                    }
                }

            selections_items.append({
                "event": event_data,
                "market": rec.pick.option_name,
                "odds": rec.odds,
                "stake": rec.stake,
                "market_id": rec.market_id,
                "selection_id": rec.selection_id,
                "side": rec.side,
                "reasoning": rec.reasoning,
                "stake_justification": getattr(rec, 'stake_justification', None)
            })
        
        return {
            "total_stake": total_stake,
            "total_returns": total_returns,
            "selections": {
                "items": selections_items,
                "wager": {
                    "odds": round(total_odds, 2),
                    "stake": round(total_stake, 2),
                    "potential_returns": total_returns
                }
            },
            "overall_reasoning": overall_reasoning
        }
    
    def get_odds(self, request: GetOddsRequest) -> Dict[str, Any]:
        """
        Get odds from Betfair Exchange.
        
        Args:
            request: GetOddsRequest containing sport, competitions, and query filters
            
        Returns:
            Dictionary with market data
            
        Raises:
            Exception: If Betfair API call fails
        """
        result = self.betfair.search_market(
            request.sport, 
            competitions=request.competitions, 
            text_query=request.query,
            all_markets=True
        )
        return result
    
    def place_bet(self, request: PlaceBetRequest) -> Dict[str, Any]:
        """
        Place multiple bets on Betfair Exchange.
        
        Args:
            request: PlaceBetRequest containing list of bet orders
        
        Returns:
            Dictionary with bet placement results
            
        Raises:
            Exception: If Betfair API call fails
        """
        if os.environ.get("FUNCTIONS_EMULATOR") == "true":
            logger.info("Running locally, skipping actual bet placement.")
            return {
                "status": "SUCCESS",
                "bets": [
                    {
                        "market_id": bet.market_id,
                        "selection_id": bet.selection_id,
                        "status": "SUCCESS",
                        "bet_id": f"mock_local_{uuid.uuid4()}",
                        "average_price_matched": bet.odds,
                        "size_matched": bet.stake
                    }
                    for bet in request.bets
                ]
            }

        bets_data = [bet.model_dump() for bet in request.bets]
        result = self.betfair.place_bets(bets_data)
        logger.info(f"Bet placement response: {result}")
        return result
    
    def get_wallet_service(self) -> WalletService:
        """Return the injected WalletService, or create a default one lazily."""
        if self._wallet_service is None:
            self._wallet_service = WalletService()
        return self._wallet_service
    
    def execute_automated_betting(
        self, 
        competitions: List[str], 
        bankroll_percent: float, 
        max_bankroll: float, 
        risk_appetite: float,
        reliable_teams: Optional[List[str]] = None,
        target_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute automated betting strategy.
        
        Args:
            competitions: List of competition names to search
            bankroll_percent: Percentage of balance to use (0-100)
            max_bankroll: Maximum amount to bet regardless of balance
            risk_appetite: Risk level (1.0-5.0)
            target_date: Optional target date in ISO format (YYYY-MM-DD). Defaults to today.
            reliable_teams: Optional list of team names to filter for. Only matches involving these teams will be analyzed.
            
        Returns:
            Dictionary with execution results including bets placed and status
        """

        
        logger.info("Starting automated betting execution")
        
        # Check for existing bets for this date if target_date is provided
        # If not provided, we'll determine it later, so we check then.
        # But wait, target_date logic is below. Let's move the date logic up or check after date is determined.
        
        # Moving date determination up
        if target_date:
            target_date_obj = datetime.fromisoformat(target_date).date()
            target_date_str = target_date_obj.isoformat()
        else:
            target_date_obj = datetime.now(timezone.utc).date()
            target_date_str = target_date_obj.isoformat()

        # Idempotency check (REMOVED)
        # We no longer prevent creating multiple bets for the same day.

        # Get current balance from db wallet
        available_balance = self.get_wallet_service().get_available_balance()
        
        if available_balance <= 0:
            logger.warning("No available balance for automated betting")
            return {
                "status": "skipped",
                "reason": "No available balance",
                "available_balance": available_balance
            }
        
        budget = self._calculate_budget(available_balance, bankroll_percent, max_bankroll)
        logger.info(f"Available balance: {available_balance}, Betting budget: {budget}")
        
        # Search for odds across competitions
        all_events = []
        for competition in competitions:
            try:
                logger.info(f"Searching odds for {competition}")
                request = GetOddsRequest(
                    sport="Soccer",
                    competitions=[competition],
                    query=None
                )
                events = self.get_odds(request=request)
                all_events.extend(events)
            except Exception as e:
                logger.error(f"Error fetching odds for {competition}: {e}")
        
        if not all_events:
            logger.info("No events found in competitions")
            return {
                "status": "skipped",
                "reason": "No events found",
                "competitions_searched": competitions
            }
        
        # Filter for target date's matches (defaults to today)
        # Date already determined above as target_date_obj
        
        logger.info(f"Filtering matches for date: {target_date_obj}")
        target_events = []
        
        for event in all_events:
            event_time = event.get("time")  # Fixed: Betfair client returns 'time' not 'event_time'
            if event_time:
                # Parse event time and check if it matches target date

                if isinstance(event_time, str):
                    event_date = datetime.fromisoformat(event_time.replace('Z', '+00:00')).date()
                elif isinstance(event_time, datetime):
                    event_date = event_time.date()
                else:
                    continue
                
                if event_date == target_date_obj:
                    target_events.append(event)
        
        logger.info(f"Found {len(target_events)} matches scheduled for {target_date_obj}")
        
        if not target_events:
            logger.info(f"No matches scheduled for {target_date_obj}")
            return {
                "status": "skipped",
                "reason": f"No matches on {target_date_obj}",

                "total_events_found": len(all_events)
            }
        
        # Filter events by reliable teams if provided
        if reliable_teams:
            filtered_events = []
            for event in target_events:
                event_name = event.get("name", "")  # Fixed: Betfair client returns 'name' not 'event_name'
                # Check if any reliable team is in the event name
                if any(team.lower() in event_name.lower() for team in reliable_teams):
                    filtered_events.append(event)
            
            logger.info(f"Filtered to {len(filtered_events)} events involving reliable teams")
            events_to_analyze = filtered_events
        else:
            # Fallback: limit to first 10 events if no reliable teams specified
            events_to_analyze = target_events
            logger.info(f"No reliable teams filter applied, using first {len(events_to_analyze)} events")

        shuffle(events_to_analyze)
        
        if not events_to_analyze:
            logger.info("No events match reliable teams criteria")
            return {
                "status": "skipped",
                "reason": "No events involving reliable teams",
                "total_events_found": len(target_events)
            }

        try:
            intent_data = {
                "target_date": target_date_str,
                "status": "intent",
                "preferences": {
                    "risk_appetite": risk_appetite,
                    "budget": budget,
                    "reliable_teams_only": bool(reliable_teams),
                    "competitions": competitions
                },
                "balance": {
                    "starting": available_balance,
                    "predicted": None,
                    "ending": None
                },
                "events": [event for event in events_to_analyze]
            }
            
            # Use SuggestionRepository to create an initial suggestion
            # This replaces direct bet intent creation
            return self.get_suggestion_repo().create_suggestion(intent_data)
            
        except Exception as e:
            logger.error(f"Failed to create bet intent: {e}")
            raise e

    def execute_hourly_automated_betting(
        self,
        bankroll_percent: float = 5.0,
        max_bankroll: float = 100.0,
        risk_appetite: float = 3.0
    ) -> Dict[str, Any]:
        """
        Executes hourly automated betting logic:
        1. Sources "Next Games" (next 1h) from ALL leagues.
        2. Analyzes and auto-bets.
        """
        logger.info("Starting hourly automated betting execution")

        # 1. Sequential Check: Ensure no active automated bets
        try:
            # We check for any bets that are 'placed' or 'started' but not finished
            active_placed_bets = self.repo.get_placed_bets(limit=1)
            if active_placed_bets:
                logger.info("Active placed bets found. Skipping hourly execution to prevent stacking risk.")
                return {
                    "status": "skipped",
                    "reason": "Active bets in progress"
                }
        except Exception as e:
            logger.error(f"Error checking active bets: {e}")
            # Fail safe or continue? Better to fail safe.
            return {"status": "error", "reason": f"Failed to check active bets: {e}"}

        # 1. Source Games (Next 1 Hour)
        try:
            now = datetime.now(timezone.utc)
            one_hour_later = now + timedelta(minutes=75)
            
            from_time = now.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            to_time = one_hour_later.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            
            logger.info(f"Sourcing games between {from_time} and {to_time} for reliable competitions")
            
            events = self.betfair.search_market(
                sport="Soccer",
                from_time=from_time,
                to_time=to_time,
                max_results=40,
                all_markets=True # Get side markets like Over/Under for better options
            )
            
            if not events:
                logger.info("No reliable games found starting in the next hour.")
                return {
                    "status": "skipped",
                    "reason": "No reliable games found next hour"
                }

            logger.info(f"Found {len(events)} reliable games in the next hour.")
            
            # Optional: Filter or Shuffle?
            # Shuffle to avoid bias to just the first few returned if we have many
            if len(events) > 10:
                shuffle(events)
                events = events[:10] # Analyze max 10 to save tokens/time
                
        except Exception as e:
            logger.error(f"Error sourcing hourly games: {e}")
            return {"status": "error", "reason": f"Sourcing failed: {e}"}

        # 2. Calculate Budget
        available_balance = self.get_wallet_service().get_available_balance()
        
        if available_balance <= 0:
            logger.warning("No available balance for hourly betting")
            return {"status": "skipped", "reason": "No funds"}

        budget = self._calculate_budget(available_balance, bankroll_percent, max_bankroll)
        logger.info(f"Hourly Budget: ${budget:.2f}")

        # 3. AI Analysis
        try:
            settings = self.settings_manager.get_betting_settings()
            analysis_request = AnalyzeBetsRequest(
                events=events,
                risk_appetite=risk_appetite,
                budget=budget,
                min_profit=settings.min_profit
            )
            
            recommendations = self.analyze_betting_opportunities(analysis_request)
            
            # Check if we have valid items
            items = recommendations.get("selections", {}).get("items", [])
            if not items:
                logger.info("AI returned no valid betting recommendations.")
                return {"status": "skipped", "reason": "No AI recommendations"}

        except Exception as e:
            logger.error(f"Error during AI analysis: {e}")
            return {"status": "error", "reason": f"AI analysis failed: {e}"}

        # 4. Auto-Stake (Create 'ready' bet)
        try:
            # Construct Bet Intent Data directly
            bet_data = {
                "target_date": now.date().isoformat(),
                "status": "ready", # Auto-ready for placement
                "created_at": server_timestamp(),
                "approved_at": server_timestamp(), # Auto-approved
                "source": "hourly_automated",
                "preferences": {
                    "risk_appetite": risk_appetite,
                    "budget": budget,
                    "period": "hourly",
                    "from_time": from_time
                },
                "balance": {
                    "starting": available_balance,
                    "predicted": recommendations["balance"]["predicted"] if "balance" in recommendations else None,
                },
                "selections": recommendations["selections"],
                "ai_reasoning": recommendations.get("overall_reasoning", ""),
                "events": [
                    {
                        "name": getattr(e, "name", e.get("name")), 
                        "time": getattr(e, "time", e.get("time")),
                        "competition": getattr(e, "competition", e.get("competition"))
                    } for e in events
                ] # Store context of what was analyzed
            }
            
            bet_doc = self.repo.create_bet_intent(bet_data)
            logger.info(f"Created hourly automated bet {bet_doc.get('id')} with status 'ready'")
            
            return {
                "status": "success",
                "bet_id": bet_doc.get("id"),
                "wager": recommendations.get("selections", {}).get("wager")
            }
            
        except Exception as e:
            logger.error(f"Error creating hourly bet: {e}")
            raise e

    def promote_suggestions_to_bets(self) -> Dict[str, Any]:
        """
        Promotes suggestions to bet slips.
        Runs daily.
        """
        logger.info("Promoting suggestions to bet slips...")
        suggestion_repo = self.get_suggestion_repo()

        # Get today's date
        target_date_str = datetime.now(timezone.utc).date().isoformat()
        
        suggestions = suggestion_repo.get_suggestions_by_date(target_date_str)
        
        promoted_count = 0
        
        for suggestion in suggestions:
            try:
                # Check if bet intent already exists for this date (idempotency) - REMOVED
                # We no longer delete suggestions just because a bet exists for the day.

                # Prepare bet data from suggestion
                # If suggestion is already analyzed, preserve that state
                suggestion_status = suggestion.get("status")
                
                # Base intent data (same as before)
                bet_data = suggestion.copy()
                if "id" in bet_data:
                    del bet_data["id"] # Remove ID so constant doesn't overwrite it
                
                # If suggestion was already analyzed by AI, we should promote it as 'analyzed'
                # so the analyze_bet_intent trigger doesn't run again.
                if suggestion_status == "analyzed" and "selections" in suggestion:
                    logger.info(f"Promoting ANALYZED suggestion {suggestion.get('id')}")
                    # Ensure fields are preserved
                    # bet_data already has 'selections', 'ai_reasoning', 'balance' from copy()
                    pass 
                else:
                    # If not analyzed, it will be promoted as 'intent' (or whatever status it has)
                    # and the analyze_bet_intent trigger will pick it up.
                    logger.info(f"Promoting unanalyzed suggestion {suggestion.get('id')} (status: {suggestion_status})")

                # Create real bet intent
                bet_doc = self.repo.create_bet_intent(bet_data)
                logger.info(f"Promoted suggestion {suggestion.get('id')} to bet {bet_doc.get('id')}")
                promoted_count += 1
                
                # Delete the suggestion after successful promotion
                suggestion_repo.delete_suggestion(suggestion['id'])
                
            except Exception as e:
                logger.error(f"Error promoting suggestion {suggestion.get('id')}: {e}")
                
        return {
            "status": "success",
            "promoted_count": promoted_count
        }

    def update_suggestion_analysis(self, suggestion_id: str, analysis_result: Dict[str, Any]) -> None:
        """Updates a suggestion document with analysis results."""
        suggestion_repo = self.get_suggestion_repo()
        suggestion = suggestion_repo.get_suggestion(suggestion_id)
        if not suggestion:
            logger.error(f"Suggestion {suggestion_id} not found for update")
            return
        update_data = self._build_analysis_update(suggestion, analysis_result)
        suggestion_repo.update_suggestion(suggestion_id, update_data)
        logger.info(f"Updated suggestion {suggestion_id} with analysis results")

    def get_bet(self, bet_id: str) -> Optional[Dict[str, Any]]:
        """
        Get bet details by ID.
        
        Args:
            bet_id: The unique identifier of the bet
            
        Returns:
            Dictionary containing bet details
        """
        return self.repo.get_bet(bet_id)
    
    def update_analysis_result(self, bet_id: str, analysis_result: Dict[str, Any]) -> None:
        """Updates a bet document with analysis results."""
        bet_data = self.repo.get_bet(bet_id)
        update_data = self._build_analysis_update(bet_data, analysis_result)
        self.repo.update_bet(bet_id, update_data)
        logger.info(f"Updated bet {bet_id} with analysis results")

    def approve_bet_intent(self, bet_id: str, selections: Optional[Dict[str, Any]] = None) -> None:
        """
        Approves a bet intent, changing status to 'ready' for placement.
        selections: Optional updated selections data.
        """
        update_data = {
            "status": "ready",
            "approved_at": server_timestamp(),
        }

        if selections is not None:
            # Get current bet to access starting balance
            bet_data = self.repo.get_bet(bet_id)
            starting_balance = bet_data.get("balance", {}).get("starting", 0)
            
            # Extract items from selections format
            items = selections.get("items", [])
            
            # Recalculate totals from items to ensure consistency
            total_stake = sum(item.get("stake", 0) for item in items)
            total_returns = sum(item.get("stake", 0) * item.get("odds", 1.0) for item in items)
            
            # effective odds = returns / stake (if stake > 0)
            combined_odds = total_returns / total_stake if total_stake > 0 else 0
            
            net_profit = total_returns - total_stake
            
            update_data["selections"] = {
                "items": items,
                "wager": {
                    "odds": round(combined_odds, 2),
                    "stake": round(total_stake, 2),
                    "potential_returns": round(total_returns, 2)
                }
            }
            update_data["balance"] = {
                **bet_data.get("balance", {}),
                "predicted": starting_balance + net_profit
            }
        
        self.repo.update_bet(bet_id, update_data)
        logger.info(f"Approved bet intent {bet_id}")

    def update_placement_result(self, bet_id: str, placement_result: Dict[str, Any]) -> None:
        """Updates a bet document with placement results."""
        status = placement_result.get("status", "SUCCESS")
        
        # If overall status is 'FAILURE', or there are no actual bet_ids, mark as failed
        bets = placement_result.get("bets", [])
        has_bet_ids = any(bet.get("bet_id") for bet in bets)
        
        if status == "FAILURE" or not has_bet_ids:
            doc_status = "rejected"
            logger.error(f"Bet placement failed for {bet_id}, marking as rejected. Result: {placement_result}")
        else:
            doc_status = "placed"

        update_data = {
            "status": doc_status,
            "placed_at": server_timestamp(),
            "placement_results": placement_result,
        }
        
        # Immediately fetch updated balance after placing a bet successfully
        if doc_status == "placed":
            try:
                wallet = self.get_wallet_service().sync_balance()
                current_balance = wallet.amount if wallet else 0
                
                bet_doc = self.repo.get_bet(bet_id)
                if bet_doc:
                    existing_balance = bet_doc.get("balance", {})
                    update_data["balance"] = {
                        **existing_balance,
                        "current": current_balance
                    }
            except Exception as e:
                logger.error(f"Failed to fetch updated balance after placement for bet {bet_id}: {e}")

        self.repo.update_bet(bet_id, update_data)
        logger.info(f"Updated bet {bet_id} with placement results (status: {doc_status})")

    def prepare_and_place_bets_from_ready_doc(self, bet_id: str, after_data: dict) -> None:
        """
        Validates selections from a 'ready' bet document, filters invalid bets,
        places them on Betfair, and updates the document with results.
        """
        selections_data = after_data.get("selections", [])
        selections = selections_data.get("items", []) if isinstance(selections_data, dict) else selections_data

        if not selections:
            logger.warning(f"No selections found for ready bet {bet_id}")
            return

        bets_to_place = []
        for item in selections:
            stake = item.get("stake")
            odds = item.get("odds")
            if stake and odds:
                if self._is_valid_bet(stake, odds):
                    bets_to_place.append({
                        "market_id": item.get("market_id"),
                        "selection_id": item.get("selection_id"),
                        "stake": stake,
                        "odds": odds,
                        "side": item.get("side", "BACK")
                    })
                else:
                    potential_profit = stake * (odds - 1)
                    logger.warning(
                        f"Skipping bet - stake: {stake}, profit: {potential_profit:.3f}"
                    )

        if not bets_to_place:
            logger.warning(f"No valid bets to place for {bet_id}")
            return

        result = self.place_bet(request=PlaceBetRequest(bets=bets_to_place))
        self.update_placement_result(bet_id, result)

    def create_and_place_bet(self, request: PlaceBetRequest) -> Dict[str, Any]:
        """
        Creates a bet slip document and immediately places the bet.
        Used for manual bet placement from the frontend.
        
        Args:
            request: PlaceBetRequest containing list of bet orders
            
        Returns:
            Dictionary with bet placement results
        """
        logger.info("Starting manual bet creation and placement")
        
        # 1. Create the bet document
        try:
            # Group bets by event if possible, or just use a generic event description
            # For manual bets, we might not have full event details in the request
            # We'll construct a basic structure
            
            # Calculate totals
            total_stake = sum(bet.stake for bet in request.bets)
            potential_returns = sum(bet.stake * bet.odds for bet in request.bets)
            
            # Get current balance from db wallet
            starting_balance = self.get_wallet_service().get_available_balance()
            
            # Create selections list for Firestore
            selections_items = []
            events_data = []
            
            for bet in request.bets:
                event_info = bet.event or {}
                
                if event_info and event_info.get("name"):
                   if not any(e.get("name") == event_info.get("name") for e in events_data):
                       events_data.append(event_info)

                selections_items.append({
                    "market_id": bet.market_id,
                    "selection_id": bet.selection_id,
                    "stake": bet.stake,
                    "odds": bet.odds,
                    "side": bet.side or "BACK",
                    # Map selection_name to market to match automated structure (e.g. "Under 4.5")
                    "market": bet.selection_name or bet.market_name or "Unknown Market",
                    "event": event_info,
                    "status": "pending_placement"
                })
                
            intent_data = {
                "target_date": datetime.now(timezone.utc).date().isoformat(),
                "status": "ready", # Skip 'intent' and 'analyzed', go straight to ready
                "created_at": server_timestamp(),
                "approved_at": server_timestamp(),
                "source": "manual",
                "preferences": {
                    "type": "manual_slip"
                },
                "balance": {
                    "starting": starting_balance,
                    "predicted": None,
                    "ending": None
                },
                "selections": {
                    "items": selections_items,
                    "wager": {
                        "odds": 0, # Complex to calc accurately without more info
                        "stake": total_stake,
                        "potential_returns": potential_returns
                    }
                },
                "events": events_data
            }
            
            bet_doc = self.repo.create_bet_intent(intent_data)
            bet_id = bet_doc.get("id")
            logger.info(f"Created manual bet document: {bet_id}")
            
        except Exception as e:
            logger.error(f"Failed to create manual bet document: {e}")
            raise e

        # 2. Place the bet
        try:
            # We can reuse place_bet or call betfair directly
            # Let's use the existing place_bet logic which handles the API call
            
            # Note: The existing place_bet returns {status: ..., bets: [...]}
            placement_result = self.place_bet(request)
            
            # 3. Update the document with results
            status = "placed" if placement_result.get("status") == "SUCCESS" else "rejected"
            if placement_result.get("status") == "PARTIAL_FAILURE":
                status = "partial"
                
            # Update items with individual results
            updated_items = []
            placed_bets = placement_result.get("bets", [])
            
            # Map results back to items - assuming order is preserved
            # A more robust way would be to match by selection_id/market_id
            
            for i, item in enumerate(selections_items):
                # Find matching result
                match = next((r for r in placed_bets if r.get("selection_id") == item["selection_id"] and r.get("market_id") == item["market_id"]), None)
                
                if match:
                    item["status"] = match.get("status")
                    item["bet_id"] = match.get("bet_id")
                    item["placed_at"] = datetime.now(timezone.utc)
                    if match.get("error_code"):
                        item["error_code"] = match.get("error_code")
                
                updated_items.append(item)

            self.repo.update_bet(bet_id, {
                "status": status,
                "placed_at": datetime.now(timezone.utc),
                "placement_results": placement_result,
                "selections": {
                    "items": updated_items,
                    "wager": intent_data["selections"]["wager"]
                }
            })
            
            return placement_result
            
        except Exception as e:
            logger.error(f"Failed to place manual bet {bet_id}: {e}")
            # Mark as failed in DB
            self.repo.update_bet(bet_id, {
                "status": "rejected", 
                "error": str(e),
                "rejected_at": datetime.now(timezone.utc)
            })
            raise e

    def mark_bet_rejected(self, bet_id: str, error: str) -> None:
        """
        Marks a bet document as rejected.
        """
        update_data = {
            "status": "rejected",
            "error": error
        }
        self.repo.update_bet(bet_id, update_data)
        logger.info(f"Marked bet {bet_id} as rejected")
        
    def check_bet_results(self) -> Dict[str, Any]:
        """
        Checks status of placed bets on Betfair and updates repository.
        """
        logger.info("Checking bet results...")
        
        placed_bets = self.repo.get_placed_bets()
        if not placed_bets:
            logger.info("No active placed bets found.")
            return {"status": "no_active_bets"}
            
        updated_count = 0
        
        for bet_doc in placed_bets:
            bet_id = bet_doc.get("id")
            placement_results = bet_doc.get("placement_results", {})
            placed_orders = placement_results.get("bets", [])
            
            # Extract Betfair Bet IDs
            betfair_ids = [order.get("bet_id") for order in placed_orders if order.get("bet_id")]
            
            if not betfair_ids:
                logger.warning(f"No Betfair IDs found for placed bet doc {bet_id}. Marking as rejected.")
                self.mark_bet_rejected(bet_id, "No Betfair IDs found in placement_results")
                continue
                
            try:
                # Check status on Betfair
                cleared_orders = self.betfair.list_cleared_orders(bet_ids=betfair_ids)
                
                if cleared_orders:
                    # Update process logic locally
                    expected_bet_count = len(betfair_ids)
                    existing_settlements = bet_doc.get("settlement_results", [])
                    
                    # Merge logic
                    settlements_map = { 
                        s.get("bet_id"): s 
                        for s in existing_settlements 
                        if s.get("bet_id")
                    }
                    
                    for new_s in cleared_orders:
                        key = new_s.get("bet_id")
                        if key:
                            settlements_map[key] = new_s # Overwrite with newer data
                        
                    merged_results = list(settlements_map.values())
                    total_realized_profit = sum(r.get('profit', 0) for r in merged_results)
                    is_finished = len(merged_results) >= expected_bet_count
                    
                    # Get starting balance to calculate ending balance
                    starting_balance = bet_doc.get("balance", {}).get("starting", 0)
                    
                    update_data = {
                        "settlement_results": merged_results,
                        "last_settled_at": server_timestamp(),
                        "balance": {
                            **bet_doc.get("balance", {}),
                            "ending": starting_balance + total_realized_profit,
                        }
                    }
                    
                    if is_finished:
                        update_data["status"] = "finished"
                        update_data["finished_at"] = server_timestamp()
                        logger.info(f"Bet {bet_id} finished! All {expected_bet_count} bets settled.")
                    else:
                        logger.info(f"Bet {bet_id} updated. {len(merged_results)}/{expected_bet_count} settled.")
                    
                    self.repo.update_bet(bet_id, update_data)
                    updated_count += 1
                    
                    # Sync wallet if this bet is newly finished
                    if is_finished:
                        self.get_wallet_service().sync_balance()
                        
                        # Trigger learnings analysis for this finished bet
                        try:
                            full_bet_data = {**bet_doc, **update_data}
                            self.get_learnings_manager().analyze_finished_bet(full_bet_data)
                        except Exception as le:
                            logger.error(f"Error triggering learnings analysis for bet {bet_id}: {le}")
                    
            except Exception as e:
                logger.error(f"Error checking results for bet {bet_id}: {e}")
                
        logger.info(f"Checked results. Updated {updated_count} bets.")
        return {
            "status": "success",
            "active_bets_checked": len(placed_bets),
            "bets_updated": updated_count
        }
    
    def get_bet_history(self, limit: int = 20, start_after_id: Optional[str] = None, status: Optional[str] = None, date_range: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Get paginated bet history.
        """
        return self.repo.get_bet_history(limit, start_after_id, status, date_range)
