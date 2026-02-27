"""
BettingManager — Facade

This module provides the single public API surface that HTTP endpoints and
Cloud Function triggers depend on. All business logic lives in the domain
services below; this file only composes them and delegates.

Domain service locations:
  analysis    → core/modules/betting/analysis/service.py
  automation  → core/modules/betting/automation/service.py
  placement   → core/modules/betting/placement/service.py
  settlement  → core/modules/betting/settlement/service.py
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from core import logger
from core.timestamps import server_timestamp
from core.modules.betting.analysis.service import BettingAnalysisService
from core.modules.betting.automation.service import AutomatedBettingService
from core.modules.betting.placement.service import BetPlacementService
from core.modules.betting.settlement.service import BetSettlementService
from core.modules.betting.models import (
    AnalyzeBetsRequest,
    GetOddsRequest,
    PlaceBetRequest,
)
from core.modules.betting.repository import BetRepository
from core.modules.betting.suggestion_repository import SuggestionRepository
from core.modules.betting.betfair_service import BetfairService
from core.modules.settings.manager import SettingsManager
from core.modules.learnings.manager import LearningsManager
from core.modules.wallet.service import WalletService
from constants import RELIABLE_COMPETITIONS


class BettingManager:
    """
    Facade that wires together the four betting domain services.

    Callers (HTTP handlers, Firestore triggers) should use this class and
    not import the sub-services directly.
    """

    def __init__(
        self,
        betfair_service=None,
        bet_repo=None,
        settings_manager=None,
        suggestion_repo=None,
        learnings_manager=None,
        wallet_service=None,
    ):
        betfair = betfair_service or BetfairService()
        repo = bet_repo or BetRepository()
        settings = settings_manager or SettingsManager()
        suggestion_repository = suggestion_repo or SuggestionRepository()
        learnings = learnings_manager or LearningsManager()
        wallet = wallet_service or WalletService()

        self._analysis = BettingAnalysisService(
            settings_manager=settings,
            learnings_manager=learnings,
            wallet_service=wallet,
            bet_repo=repo,
        )
        self._placement = BetPlacementService(
            betfair_service=betfair,
            bet_repo=repo,
            settings_manager=settings,
            wallet_service=wallet,
        )
        self._settlement = BetSettlementService(
            betfair_service=betfair,
            bet_repo=repo,
            wallet_service=wallet,
            learnings_manager=learnings,
        )
        self._automation = AutomatedBettingService(
            betfair_service=betfair,
            bet_repo=repo,
            suggestion_repo=suggestion_repository,
            settings_manager=settings,
            wallet_service=wallet,
            analysis_service=self._analysis,
        )

        # Keep direct repo/betfair references for lightweight query methods below.
        self.betfair = betfair
        self.repo = repo
        self.settings_manager = settings
        self._suggestion_repo_instance = suggestion_repository
        self._learnings_manager_instance = learnings
        self._wallet_service_instance = wallet

    # ------------------------------------------------------------------
    # Lightweight accessors (kept here to avoid import changes in main.py)
    # ------------------------------------------------------------------

    def get_suggestion_repo(self) -> SuggestionRepository:
        return self._suggestion_repo_instance

    def get_learnings_manager(self) -> LearningsManager:
        return self._learnings_manager_instance

    def get_wallet_service(self) -> WalletService:
        return self._wallet_service_instance

    # ------------------------------------------------------------------
    # Shared utility (used by main.py triggers via update_analysis_result,
    # update_suggestion_analysis)
    # ------------------------------------------------------------------

    @staticmethod
    def _build_analysis_update(existing_doc: dict, analysis_result: dict) -> dict:
        """Build the Firestore update payload after AI analysis."""
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
                    "potential_returns": total_returns,
                },
            },
            "balance": {
                **existing_doc.get("balance", {}),
                "predicted": starting_balance + net_profit,
            },
            "ai_reasoning": analysis_result.get("overall_reasoning", ""),
        }

    # ------------------------------------------------------------------
    # Analysis
    # ------------------------------------------------------------------

    def analyze_betting_opportunities(self, request: AnalyzeBetsRequest) -> Dict[str, Any]:
        return self._analysis.analyze_betting_opportunities(request)

    # ------------------------------------------------------------------
    # Automation
    # ------------------------------------------------------------------

    def execute_automated_betting(
        self,
        competitions: List[str],
        bankroll_percent: float,
        max_bankroll: float,
        risk_appetite: float,
        reliable_teams: Optional[List[str]] = None,
        target_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._automation.execute_automated_betting(
            competitions=competitions,
            bankroll_percent=bankroll_percent,
            max_bankroll=max_bankroll,
            risk_appetite=risk_appetite,
            reliable_teams=reliable_teams,
            target_date=target_date,
        )

    def execute_hourly_automated_betting(
        self,
        bankroll_percent: float = 5.0,
        max_bankroll: float = 100.0,
        risk_appetite: float = 3.0,
    ) -> Dict[str, Any]:
        return self._automation.execute_hourly_automated_betting(
            bankroll_percent=bankroll_percent,
            max_bankroll=max_bankroll,
            risk_appetite=risk_appetite,
        )

    def promote_suggestions_to_bets(self) -> Dict[str, Any]:
        return self._automation.promote_suggestions_to_bets()

    # ------------------------------------------------------------------
    # Placement
    # ------------------------------------------------------------------

    def place_bet(self, request: PlaceBetRequest) -> Dict[str, Any]:
        return self._placement.place_bet(request)

    def create_and_place_bet(self, request: PlaceBetRequest) -> Dict[str, Any]:
        return self._placement.create_and_place_bet(request)

    def prepare_and_place_bets_from_ready_doc(self, bet_id: str, after_data: dict) -> None:
        return self._placement.prepare_and_place_bets_from_ready_doc(bet_id, after_data)

    def update_placement_result(self, bet_id: str, placement_result: Dict[str, Any]) -> None:
        return self._placement.update_placement_result(bet_id, placement_result)

    def mark_bet_rejected(self, bet_id: str, error: str) -> None:
        return self._placement.mark_bet_rejected(bet_id, error)

    # ------------------------------------------------------------------
    # Settlement
    # ------------------------------------------------------------------

    def check_bet_results(self) -> Dict[str, Any]:
        return self._settlement.check_bet_results()

    # ------------------------------------------------------------------
    # Queries / state updates (thin wrappers — logic stays here)
    # ------------------------------------------------------------------

    def get_all_upcoming_games(
        self,
        sport: Optional[str] = None,
        date: Optional[str] = None,
        competitions: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        competitions = competitions or RELIABLE_COMPETITIONS
        logger.info(
            f"Fetching upcoming games for competitions: {competitions}"
            + (f" on date: {date}" if date else "")
        )
        try:
            games = self.betfair.search_market(
                sport=sport, competitions=competitions, date=date
            )
            games.sort(key=lambda x: x["time"])
            return games
        except Exception as e:
            logger.error(f"Error fetching upcoming games: {e}", exc_info=True)
            return []

    def get_odds(self, request: GetOddsRequest) -> Dict[str, Any]:
        return self.betfair.search_market(
            request.sport,
            competitions=request.competitions,
            text_query=request.query,
            all_markets=True,
        )

    def get_bet(self, bet_id: str) -> Optional[Dict[str, Any]]:
        return self.repo.get_bet(bet_id)

    def get_bet_history(
        self,
        limit: int = 20,
        start_after_id: Optional[str] = None,
        status: Optional[str] = None,
        date_range: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        return self.repo.get_bet_history(limit, start_after_id, status, date_range)

    def update_analysis_result(
        self, bet_id: str, analysis_result: Dict[str, Any]
    ) -> None:
        bet_data = self.repo.get_bet(bet_id)
        update_data = self._build_analysis_update(bet_data, analysis_result)
        self.repo.update_bet(bet_id, update_data)
        logger.info(f"Updated bet {bet_id} with analysis results")

    def update_suggestion_analysis(
        self, suggestion_id: str, analysis_result: Dict[str, Any]
    ) -> None:
        suggestion_repo = self.get_suggestion_repo()
        suggestion = suggestion_repo.get_suggestion(suggestion_id)
        if not suggestion:
            logger.error(f"Suggestion {suggestion_id} not found for update")
            return
        update_data = self._build_analysis_update(suggestion, analysis_result)
        suggestion_repo.update_suggestion(suggestion_id, update_data)
        logger.info(f"Updated suggestion {suggestion_id} with analysis results")

    def approve_bet_intent(
        self, bet_id: str, selections: Optional[Dict[str, Any]] = None
    ) -> None:
        """Approve a bet intent, changing its status to 'ready' for placement."""
        update_data: Dict[str, Any] = {
            "status": "ready",
            "approved_at": server_timestamp(),
        }

        if selections is not None:
            bet_data = self.repo.get_bet(bet_id)
            starting_balance = bet_data.get("balance", {}).get("starting", 0)
            items = selections.get("items", [])
            total_stake = sum(item.get("stake", 0) for item in items)
            total_returns = sum(
                item.get("stake", 0) * item.get("odds", 1.0) for item in items
            )
            combined_odds = total_returns / total_stake if total_stake > 0 else 0
            net_profit = total_returns - total_stake

            update_data["selections"] = {
                "items": items,
                "wager": {
                    "odds": round(combined_odds, 2),
                    "stake": round(total_stake, 2),
                    "potential_returns": round(total_returns, 2),
                },
            }
            update_data["balance"] = {
                **bet_data.get("balance", {}),
                "predicted": starting_balance + net_profit,
            }

        self.repo.update_bet(bet_id, update_data)
        logger.info(f"Approved bet intent {bet_id}")
