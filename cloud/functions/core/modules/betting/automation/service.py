from datetime import datetime, timezone, timedelta
from random import shuffle
from typing import Dict, Any, List, Optional

from core import logger
from core.timestamps import server_timestamp
from core.modules.betting.models import AnalyzeBetsRequest, GetOddsRequest
from core.modules.betting.repository import BetRepository
from core.modules.betting.suggestion_repository import SuggestionRepository
from core.modules.betting.betfair_service import BetfairService
from core.modules.betting.analysis.service import BettingAnalysisService
from core.modules.settings.manager import SettingsManager
from core.modules.wallet.service import WalletService


class AutomatedBettingService:
    """Orchestrates scheduled betting routines: daily suggestions and hourly direct bets."""

    def __init__(
        self,
        betfair_service: BetfairService,
        bet_repo: BetRepository,
        suggestion_repo: SuggestionRepository,
        settings_manager: SettingsManager,
        wallet_service: WalletService,
        analysis_service: BettingAnalysisService,
    ):
        self.betfair = betfair_service
        self.repo = bet_repo
        self.suggestion_repo = suggestion_repo
        self.settings_manager = settings_manager
        self.wallet_service = wallet_service
        self.analysis_service = analysis_service

    @staticmethod
    def _calculate_budget(
        available_balance: float, bankroll_percent: float, max_bankroll: float
    ) -> float:
        return min(available_balance * (bankroll_percent / 100), max_bankroll)

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
        Source upcoming matches for a target date, optionally filter by reliable teams,
        and create a suggestion for later promotion and analysis.
        """
        logger.info("Starting automated betting execution")

        if target_date:
            target_date_obj = datetime.fromisoformat(target_date).date()
        else:
            target_date_obj = datetime.now(timezone.utc).date()
        target_date_str = target_date_obj.isoformat()

        available_balance = self.wallet_service.get_available_balance()
        if available_balance <= 0:
            logger.warning("No available balance for automated betting")
            return {
                "status": "skipped",
                "reason": "No available balance",
                "available_balance": available_balance,
            }

        budget = self._calculate_budget(available_balance, bankroll_percent, max_bankroll)
        logger.info(f"Available balance: {available_balance}, Betting budget: {budget}")

        # Source odds across all requested competitions
        all_events: List[dict] = []
        for competition in competitions:
            try:
                logger.info(f"Searching odds for {competition}")
                events = self.betfair.search_market(
                    sport="Soccer",
                    competitions=[competition],
                    text_query=None,
                    all_markets=True,
                )
                all_events.extend(events)
            except Exception as e:
                logger.error(f"Error fetching odds for {competition}: {e}")

        if not all_events:
            return {
                "status": "skipped",
                "reason": "No events found",
                "competitions_searched": competitions,
            }

        # Filter to target date
        target_events = []
        for event in all_events:
            event_time = event.get("time")
            if not event_time:
                continue
            if isinstance(event_time, str):
                event_date = datetime.fromisoformat(
                    event_time.replace("Z", "+00:00")
                ).date()
            elif isinstance(event_time, datetime):
                event_date = event_time.date()
            else:
                continue
            if event_date == target_date_obj:
                target_events.append(event)

        logger.info(f"Found {len(target_events)} matches scheduled for {target_date_obj}")

        if not target_events:
            return {
                "status": "skipped",
                "reason": f"No matches on {target_date_obj}",
                "total_events_found": len(all_events),
            }

        # Optional: filter to reliable teams
        if reliable_teams:
            events_to_analyze = [
                e
                for e in target_events
                if any(
                    team.lower() in e.get("name", "").lower() for team in reliable_teams
                )
            ]
            logger.info(f"Filtered to {len(events_to_analyze)} events involving reliable teams")
        else:
            events_to_analyze = target_events
            logger.info(f"No reliable teams filter applied, using {len(events_to_analyze)} events")

        shuffle(events_to_analyze)

        if not events_to_analyze:
            return {
                "status": "skipped",
                "reason": "No events involving reliable teams",
                "total_events_found": len(target_events),
            }

        try:
            intent_data = {
                "target_date": target_date_str,
                "status": "intent",
                "preferences": {
                    "risk_appetite": risk_appetite,
                    "budget": budget,
                    "reliable_teams_only": bool(reliable_teams),
                    "competitions": competitions,
                },
                "balance": {
                    "starting": available_balance,
                    "predicted": None,
                    "ending": None,
                },
                "events": events_to_analyze,
            }
            return self.suggestion_repo.create_suggestion(intent_data)
        except Exception as e:
            logger.error(f"Failed to create bet suggestion: {e}")
            raise

    def execute_hourly_automated_betting(
        self,
        bankroll_percent: float = 5.0,
        max_bankroll: float = 100.0,
        risk_appetite: float = 3.0,
    ) -> Dict[str, Any]:
        """
        Source matches starting in the next 75 minutes, run AI analysis on them,
        and create a 'ready' bet document for immediate placement.
        """
        logger.info("Starting hourly automated betting execution")

        # Source upcoming games
        try:
            now = datetime.now(timezone.utc)
            to_time = now + timedelta(minutes=75)
            from_time_str = now.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            to_time_str = to_time.strftime("%Y-%m-%dT%H:%M:%S.000Z")

            logger.info(f"Sourcing games between {from_time_str} and {to_time_str}")
            events = self.betfair.search_market(
                sport="Soccer",
                from_time=from_time_str,
                to_time=to_time_str,
                max_results=40,
                all_markets=True,
            )
            if not events:
                return {"status": "skipped", "reason": "No games found next hour"}

            logger.info(f"Found {len(events)} games in the next hour.")
            if len(events) > 10:
                shuffle(events)
                events = events[:10]

        except Exception as e:
            logger.error(f"Error sourcing hourly games: {e}")
            return {"status": "error", "reason": f"Sourcing failed: {e}"}

        available_balance = self.wallet_service.get_available_balance()
        if available_balance <= 0:
            return {"status": "skipped", "reason": "No funds"}

        budget = self._calculate_budget(available_balance, bankroll_percent, max_bankroll)
        logger.info(f"Hourly Budget: ${budget:.2f}")

        try:
            settings = self.settings_manager.get_betting_settings()
            analysis_request = AnalyzeBetsRequest(
                events=events,
                risk_appetite=risk_appetite,
                budget=budget,
                min_profit=settings.min_profit,
            )
            recommendations = self.analysis_service.analyze_betting_opportunities(
                analysis_request
            )
            if not recommendations.get("selections", {}).get("items"):
                return {"status": "skipped", "reason": "No AI recommendations"}
        except Exception as e:
            logger.error(f"Error during AI analysis: {e}")
            return {"status": "error", "reason": f"AI analysis failed: {e}"}

        try:
            bet_data = {
                "target_date": now.date().isoformat(),
                "status": "ready",
                "created_at": server_timestamp(),
                "approved_at": server_timestamp(),
                "source": "hourly_automated",
                "preferences": {
                    "risk_appetite": risk_appetite,
                    "budget": budget,
                    "period": "hourly",
                    "from_time": from_time_str,
                },
                "balance": {
                    "starting": available_balance,
                    "predicted": recommendations.get("balance", {}).get("predicted"),
                },
                "selections": recommendations["selections"],
                "ai_reasoning": recommendations.get("overall_reasoning", ""),
                "events": [
                    {
                        "name": getattr(e, "name", e.get("name")),
                        "time": getattr(e, "time", e.get("time")),
                        "competition": getattr(e, "competition", e.get("competition")),
                    }
                    for e in events
                ],
            }
            bet_doc = self.repo.create_bet_intent(bet_data)
            logger.info(
                f"Created hourly automated bet {bet_doc.get('id')} with status 'ready'"
            )
            return {
                "status": "success",
                "bet_id": bet_doc.get("id"),
                "wager": recommendations.get("selections", {}).get("wager"),
            }
        except Exception as e:
            logger.error(f"Error creating hourly bet: {e}")
            raise

    def promote_suggestions_to_bets(self) -> Dict[str, Any]:
        """
        Promote today's suggestions to active bet intents and delete them from the
        suggestions collection once promoted.
        """
        logger.info("Promoting suggestions to bet slips...")
        target_date_str = datetime.now(timezone.utc).date().isoformat()
        suggestions = self.suggestion_repo.get_suggestions_by_date(target_date_str)
        promoted_count = 0

        for suggestion in suggestions:
            try:
                suggestion_status = suggestion.get("status")
                bet_data = suggestion.copy()
                bet_data.pop("id", None)

                if suggestion_status == "analyzed" and "selections" in suggestion:
                    logger.info(f"Promoting ANALYZED suggestion {suggestion.get('id')}")
                else:
                    logger.info(
                        f"Promoting unanalyzed suggestion {suggestion.get('id')} "
                        f"(status: {suggestion_status})"
                    )

                bet_doc = self.repo.create_bet_intent(bet_data)
                logger.info(
                    f"Promoted suggestion {suggestion.get('id')} to bet {bet_doc.get('id')}"
                )
                promoted_count += 1
                self.suggestion_repo.delete_suggestion(suggestion["id"])

            except Exception as e:
                logger.error(f"Error promoting suggestion {suggestion.get('id')}: {e}")

        return {"status": "success", "promoted_count": promoted_count}
