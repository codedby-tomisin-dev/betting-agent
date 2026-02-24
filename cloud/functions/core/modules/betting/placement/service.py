import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from core import logger
from core.timestamps import server_timestamp
from core.modules.betting.models import PlaceBetRequest
from core.modules.betting.repository import BetRepository
from core.modules.settings.manager import SettingsManager
from core.modules.wallet.service import WalletService
from core.modules.betting.betfair_service import BetfairService


class BetPlacementService:
    """Handles placing bets on Betfair and recording the results in Firestore."""

    def __init__(
        self,
        betfair_service: BetfairService,
        bet_repo: BetRepository,
        settings_manager: SettingsManager,
        wallet_service: WalletService,
    ):
        self.betfair = betfair_service
        self.repo = bet_repo
        self.settings_manager = settings_manager
        self.wallet_service = wallet_service

    def _is_valid_bet(self, stake: float, odds: float) -> bool:
        """Return True if a bet meets the minimum stake and profit requirements."""
        settings = self.settings_manager.get_betting_settings()
        return stake >= settings.min_stake and stake * (odds - 1) >= settings.min_profit

    def place_bet(self, request: PlaceBetRequest) -> Dict[str, Any]:
        """
        Submit bets to Betfair Exchange.

        In emulator mode, returns a mocked success response instead of calling Betfair.
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
                        "size_matched": bet.stake,
                    }
                    for bet in request.bets
                ],
            }

        bets_data = [bet.model_dump() for bet in request.bets]
        result = self.betfair.place_bets(bets_data)
        logger.info(f"Bet placement response: {result}")
        return result

    def update_placement_result(self, bet_id: str, placement_result: Dict[str, Any]) -> None:
        """Write Betfair placement results back to the bet document."""
        status = placement_result.get("status", "SUCCESS")
        bets = placement_result.get("bets", [])
        has_bet_ids = any(bet.get("bet_id") for bet in bets)

        if status == "FAILURE" or not has_bet_ids:
            doc_status = "rejected"
            logger.error(
                f"Bet placement failed for {bet_id}, marking as rejected. "
                f"Result: {placement_result}"
            )
        else:
            doc_status = "placed"

        update_data = {
            "status": doc_status,
            "placed_at": server_timestamp(),
            "placement_results": placement_result,
        }

        if doc_status == "placed":
            try:
                wallet = self.wallet_service.sync_balance()
                current_balance = wallet.amount if wallet else 0
                bet_doc = self.repo.get_bet(bet_id)
                if bet_doc:
                    update_data["balance"] = {
                        **bet_doc.get("balance", {}),
                        "current": current_balance,
                    }
            except Exception as e:
                logger.error(
                    f"Failed to fetch updated balance after placement for bet {bet_id}: {e}"
                )

        self.repo.update_bet(bet_id, update_data)
        logger.info(f"Updated bet {bet_id} with placement results (status: {doc_status})")

    def mark_bet_rejected(self, bet_id: str, error: str) -> None:
        """Mark a bet document as rejected."""
        self.repo.update_bet(bet_id, {"status": "rejected", "error": error})
        logger.info(f"Marked bet {bet_id} as rejected")

    def prepare_and_place_bets_from_ready_doc(self, bet_id: str, after_data: dict) -> None:
        """
        Validate selections from a 'ready' bet document, filter invalid ones,
        place valid bets on Betfair, and write the result back to Firestore.
        """
        selections_data = after_data.get("selections", [])
        selections = (
            selections_data.get("items", [])
            if isinstance(selections_data, dict)
            else selections_data
        )

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
                        "side": item.get("side", "BACK"),
                    })
                else:
                    potential_profit = stake * (odds - 1)
                    logger.warning(
                        f"Skipping bet — stake: {stake}, profit: {potential_profit:.3f}"
                    )

        if not bets_to_place:
            logger.warning(f"No valid bets to place for {bet_id}")
            return

        result = self.place_bet(request=PlaceBetRequest(bets=bets_to_place))
        self.update_placement_result(bet_id, result)

    def create_and_place_bet(self, request: PlaceBetRequest) -> Dict[str, Any]:
        """
        Creates a bet slip document in Firestore and immediately places the bet on Betfair.
        Used for manual bet placement from the frontend.
        """
        logger.info("Starting manual bet creation and placement")

        total_stake = sum(bet.stake for bet in request.bets)
        potential_returns = sum(bet.stake * bet.odds for bet in request.bets)
        starting_balance = self.wallet_service.get_available_balance()

        selections_items = []
        events_data: List[dict] = []

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
                "market": bet.selection_name or bet.market_name or "Unknown Market",
                "event": event_info,
                "status": "pending_placement",
            })

        intent_data = {
            "target_date": datetime.now(timezone.utc).date().isoformat(),
            "status": "ready",
            "created_at": server_timestamp(),
            "approved_at": server_timestamp(),
            "source": "manual",
            "preferences": {"type": "manual_slip"},
            "balance": {"starting": starting_balance, "predicted": None, "ending": None},
            "selections": {
                "items": selections_items,
                "wager": {
                    "odds": 0,
                    "stake": total_stake,
                    "potential_returns": potential_returns,
                },
            },
            "events": events_data,
        }

        try:
            bet_doc = self.repo.create_bet_intent(intent_data)
            bet_id = bet_doc.get("id")
            logger.info(f"Created manual bet document: {bet_id}")
        except Exception as e:
            logger.error(f"Failed to create manual bet document: {e}")
            raise

        try:
            placement_result = self.place_bet(request)

            status = "placed" if placement_result.get("status") == "SUCCESS" else "rejected"
            if placement_result.get("status") == "PARTIAL_FAILURE":
                status = "partial"

            placed_bets = placement_result.get("bets", [])
            updated_items = []
            for item in selections_items:
                match = next(
                    (
                        r
                        for r in placed_bets
                        if r.get("selection_id") == item["selection_id"]
                        and r.get("market_id") == item["market_id"]
                    ),
                    None,
                )
                if match:
                    item["status"] = match.get("status")
                    item["bet_id"] = match.get("bet_id")
                    item["placed_at"] = datetime.now(timezone.utc)
                    if match.get("error_code"):
                        item["error_code"] = match.get("error_code")
                updated_items.append(item)

            self.repo.update_bet(
                bet_id,
                {
                    "status": status,
                    "placed_at": datetime.now(timezone.utc),
                    "placement_results": placement_result,
                    "selections": {
                        "items": updated_items,
                        "wager": intent_data["selections"]["wager"],
                    },
                },
            )
            return placement_result

        except Exception as e:
            logger.error(f"Failed to place manual bet {bet_id}: {e}")
            self.repo.update_bet(
                bet_id,
                {
                    "status": "rejected",
                    "error": str(e),
                    "rejected_at": datetime.now(timezone.utc),
                },
            )
            raise
