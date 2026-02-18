from datetime import datetime, timezone, date
from random import shuffle
from typing import Dict, Any, List, Optional

from pydantic import ValidationError

from core import logger
from core.firestore import admin_firestore
from core.modules.betting.agent import betting_agent
from core.modules.betting.models import AnalyzeBetsRequest, BettingAgentResponse, GetOddsRequest, PlaceBetRequest
from core.modules.betting.repository import BetRepository
from core.modules.betting.suggestion_repository import SuggestionRepository
from constants import AUTOMATED_BETTING_OPTIONS, RELIABLE_TEAMS
from third_party.betting_platforms.models import Event
from third_party.betting_platforms.betfair_exchange import BetfairExchange
from core.modules.settings.manager import SettingsManager

class BettingManager:
    """Manager for betting analysis and recommendations"""

    def __init__(self):
        self.betfair = BetfairExchange()
        self.betfair.login()
        self.repo = BetRepository()
        self.settings_manager = SettingsManager()

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
        competitions = competitions or list(RELIABLE_TEAMS.keys())
        
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
        
        requests_prompt = []
        for event in events:
            # Format single event string
            event_details = f"Event: {event.event_name} ({event.competition_name}) - {event.event_time}\n"
            for option in event.options:
                event_details += f"  Market: {option.name} (ID: {option.market_id})\n"
                for selection in option.options:
                    event_details += f"    - Selection: {selection.name}, Odds: {selection.odds}, ID: {selection.selection_id}\n"
            requests_prompt.append(event_details)
        
        all_events_str = "\n".join(requests_prompt)

        # Build prompt for ALL events
        prompt = f"""Analyze these betting opportunities and provide exactly 3 best betting recommendations based on the risk appetite and budget provided.

        Risk Appetite: {request.risk_appetite}/5.0 (1=very safe, 5=very aggressive)
        Budget: ${request.budget:.2f} (This is the TOTAL budget for all 3 bets combined)

        Events:
        {all_events_str}

        CRITICAL REQUIREMENTS:
        1. Select exactly 3 bets that offer the best value across ALL events provided.
        2. The total stake of all 3 bets MUST NOT exceed ${request.budget:.2f}.
        3. Allocate the budget wisely among the 3 bets based on confidence and value.
        4. **IMPORTANT**: You MUST use the EXACT event names, market names, and selection names as provided above. 
           Do NOT modify them in any way (e.g., do not change "v" to "vs", do not add/remove spaces, do not change capitalization).
           The names must match EXACTLY as they appear in the data above.

        Use web search to research recent team form, head-to-head records, any relevant recent news. Provide a list of recommended bets that offer good value while strictly respecting the budget constraint."""

        logger.info(f"Analyzing {len(events)} events with total budget ${request.budget:.2f}")
        
        all_recommendations = []
        overall_reasoning = ""

        try:
            result = betting_agent.run_sync(prompt)
            response_data: BettingAgentResponse = result.output
            
            overall_reasoning = response_data.overall_reasoning
            
            for rec in response_data.recommendations:
                # Validate stake and profit
                potential_profit = rec.stake * (rec.odds - 1)

                min_stake = AUTOMATED_BETTING_OPTIONS.get("MIN_STAKE", 1.0)
                min_profit = AUTOMATED_BETTING_OPTIONS.get("MIN_PROFIT", 0.01)
                
                if rec.stake >= min_stake and potential_profit >= min_profit:
                    all_recommendations.append(rec)
                else:
                    logger.warning(
                        f"Skipping recommendation - stake: {rec.stake} (min: {min_stake}), "
                        f"profit: {potential_profit:.3f} (min: {min_profit}) - {rec.pick.event_name}"
                    )
            
        except Exception as e:
            logger.error(f"Error analyzing events: {e}")
            overall_reasoning = f"Failed to analyze events - {str(e)}"

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
        
        # Calculate total odds as sum of individual odds (for accumulator logic, might differ for singles)
        # Assuming these are single bets, total odds isn't meaningful for a combined wager unless it's an acca.
        # But for display, sum is fine or average.
        total_odds = sum(rec.odds for rec in all_recommendations)
        
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
                "reasoning": rec.reasoning
            })
        
        return {
            "total_stake": total_stake,
            "total_returns": total_returns,
            "selections": {
                "items": selections_items,
                "wager": {
                    "odds": round(total_odds, 2),
                    "stake": request.budget,
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
        bets_data = [bet.model_dump() for bet in request.bets]
        result = self.betfair.place_bets(bets_data)
        return result
    
    def get_balance(self) -> Dict[str, Any]:
        """
        Get wallet balance from Betfair Exchange.
        
        Returns:
            Dictionary containing balance information
            
        Raises:
            Exception: If Betfair API call fails
        """
        result = self.betfair.get_balance()
        return result
    
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

        # Idempotency check
        existing_bets = self.repo.get_matches_by_date(target_date_str)
        if existing_bets:
            logger.info(f"Bet intent already exists for {target_date_str}, skipping creation.")
            # Return the first existing bet
            return {
                "status": "existing", 
                "message": f"Bet intent already exists for {target_date_str}",
                "bet": existing_bets[0]
            }

        # Get current balance
        balance_info = self.get_balance()
        available_balance = balance_info.get("available_balance", 0)
        
        if available_balance <= 0:
            logger.warning("No available balance for automated betting")
            return {
                "status": "skipped",
                "reason": "No available balance",
                "available_balance": available_balance
            }
        
        # Calculate betting budget
        budget = min(
            available_balance * (bankroll_percent / 100),
            max_bankroll
        )
        
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
            # This replaces direcr bet intent creation
            suggestion_repo = SuggestionRepository()
            
            return suggestion_repo.create_suggestion(intent_data)
            
        except Exception as e:
            logger.error(f"Failed to create bet intent: {e}")
            raise e

    def promote_suggestions_to_bets(self) -> Dict[str, Any]:
        """
        Promotes suggestions to bet slips.
        Runs daily.
        """
        logger.info("Promoting suggestions to bet slips...")
        suggestion_repo = SuggestionRepository()
        
        # Get today's date
        target_date_str = datetime.now(timezone.utc).date().isoformat()
        
        suggestions = suggestion_repo.get_suggestions_by_date(target_date_str)
        
        promoted_count = 0
        
        for suggestion in suggestions:
            try:
                # Check if bet intent already exists for this date (idempotency)
                existing_bets = self.repo.get_matches_by_date(target_date_str)
                if existing_bets:
                    logger.info(f"Bet intent already exists for {target_date_str}, deleting suggestion.")
                    suggestion_repo.delete_suggestion(suggestion['id'])
                    continue

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
        """
        Updates a suggestion document with analysis results.
        Similar to update_analysis_result but for suggestions.
        """
        suggestion_repo = SuggestionRepository()
        suggestion = suggestion_repo.get_suggestion(suggestion_id)
        
        if not suggestion:
            logger.error(f"Suggestion {suggestion_id} not found for update")
            return

        starting_balance = suggestion.get("balance", {}).get("starting", 0)
        
        total_stake = analysis_result.get("total_stake", 0)
        total_returns = analysis_result.get("total_returns", 0)
        net_profit = total_returns - total_stake
        
        combined_odds = total_returns / total_stake if total_stake > 0 else 1.0
        
        update_data = {
            "status": "analyzed", 
            "analyzed_at": admin_firestore.SERVER_TIMESTAMP,
            "selections": {
                **analysis_result.get("selections", {}),
                "wager": {
                    "odds": round(combined_odds, 2),
                    "stake": total_stake,
                    "potential_returns": total_returns
                }
            },
            "balance": {
                **suggestion.get("balance", {}),
                "predicted": starting_balance + net_profit
            },
            "ai_reasoning": analysis_result.get("overall_reasoning", ""),
        }
        
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
        """
        Updates a bet document with analysis results.
        """
        # Get current bet to access starting balance
        bet_data = self.repo.get_bet(bet_id)
        starting_balance = bet_data.get("balance", {}).get("starting", 0)
        
        total_stake = analysis_result.get("total_stake", 0)
        total_returns = analysis_result.get("total_returns", 0)
        net_profit = total_returns - total_stake
        
        # Calculate combined odds
        combined_odds = total_returns / total_stake if total_stake > 0 else 1.0
        
        update_data = {
            "status": "analyzed", # Pauses here for manual approval
            "analyzed_at": admin_firestore.SERVER_TIMESTAMP,
            "selections": {
                **analysis_result.get("selections", {}),
                "wager": {
                    "odds": round(combined_odds, 2),
                    "stake": total_stake,
                    "potential_returns": total_returns
                }
            },
            "balance": {
                **bet_data.get("balance", {}),
                "predicted": starting_balance + net_profit
            },
            "ai_reasoning": analysis_result.get("overall_reasoning", ""),
        }
        self.repo.update_bet(bet_id, update_data)
        logger.info(f"Updated bet {bet_id} with analysis results")

    def approve_bet_intent(self, bet_id: str, selections: Optional[Dict[str, Any]] = None) -> None:
        """
        Approves a bet intent, changing status to 'ready' for placement.
        selections: Optional updated selections data.
        """
        update_data = {
            "status": "ready",
            "approved_at": admin_firestore.SERVER_TIMESTAMP,
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
        """
        Updates a bet document with placement results.
        """
        update_data = {
            "status": "placed",
            "placed_at": admin_firestore.SERVER_TIMESTAMP,
            "placement_results": placement_result,
        }
        self.repo.update_bet(bet_id, update_data)
        logger.info(f"Updated bet {bet_id} with placement results")

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
            
            # Get current balance for tracking
            balance_info = self.get_balance()
            starting_balance = balance_info.get("available_balance", 0)
            
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
                "created_at": admin_firestore.SERVER_TIMESTAMP,
                "approved_at": admin_firestore.SERVER_TIMESTAMP,
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
            status = "placed" if placement_result.get("status") == "SUCCESS" else "failed"
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
                "status": "failed", 
                "error": str(e),
                "failed_at": datetime.now(timezone.utc)
            })
            raise e

    def mark_bet_failed(self, bet_id: str, error: str) -> None:
        """
        Marks a bet document as failed.
        """
        update_data = {
            "status": "failed",
            "error": error
        }
        self.repo.update_bet(bet_id, update_data)
        logger.info(f"Marked bet {bet_id} as failed")
        
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
                logger.warning(f"No Betfair IDs found for placed bet doc {bet_id}")
                continue
                
            try:
                # Check status on Betfair
                cleared_orders = self.betfair.list_cleared_orders(bet_ids=betfair_ids)
                
                if cleared_orders:
                    # Update process logic locally
                    expected_bet_count = len(placed_orders)
                    existing_settlements = bet_doc.get("settlement_results", [])
                    
                    # Merge logic
                    settlements_map = { 
                        (s.get("market_id"), s.get("selection_id")): s 
                        for s in existing_settlements 
                    }
                    
                    for new_s in cleared_orders:
                        key = (new_s.get("market_id"), new_s.get("selection_id"))
                        settlements_map[key] = new_s # Overwrite with newer data
                        
                    merged_results = list(settlements_map.values())
                    total_realized_profit = sum(r.get('profit', 0) for r in merged_results)
                    is_finished = len(merged_results) >= expected_bet_count
                    
                    # Get starting balance to calculate ending balance
                    starting_balance = bet_doc.get("balance", {}).get("starting", 0)
                    
                    update_data = {
                        "settlement_results": merged_results,
                        "last_settled_at": admin_firestore.SERVER_TIMESTAMP,
                        "balance": {
                            **bet_doc.get("balance", {}),
                            "ending": starting_balance + total_realized_profit,
                        }
                    }
                    
                    if is_finished:
                        update_data["status"] = "finished"
                        update_data["finished_at"] = admin_firestore.SERVER_TIMESTAMP
                        logger.info(f"Bet {bet_id} finished! All {expected_bet_count} bets settled.")
                    else:
                        logger.info(f"Bet {bet_id} updated. {len(merged_results)}/{expected_bet_count} settled.")
                    
                    self.repo.update_bet(bet_id, update_data)
                    updated_count += 1
                    
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
