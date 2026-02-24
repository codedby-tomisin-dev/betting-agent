from typing import Dict, Any

from core import logger
from core.timestamps import server_timestamp
from core.modules.betting.repository import BetRepository
from core.modules.betting.betfair_service import BetfairService
from core.modules.wallet.service import WalletService
from core.modules.learnings.manager import LearningsManager


class BetSettlementService:
    """Polls Betfair for cleared orders and finalises bet slips in Firestore."""

    def __init__(
        self,
        betfair_service: BetfairService,
        bet_repo: BetRepository,
        wallet_service: WalletService,
        learnings_manager: LearningsManager,
    ):
        self.betfair = betfair_service
        self.repo = bet_repo
        self.wallet_service = wallet_service
        self.learnings_manager = learnings_manager

    def _mark_bet_rejected(self, bet_id: str, error: str) -> None:
        self.repo.update_bet(bet_id, {"status": "rejected", "error": error})
        logger.info(f"Marked bet {bet_id} as rejected: {error}")

    def check_bet_results(self) -> Dict[str, Any]:
        """
        Check the status of all placed bets on Betfair and update Firestore accordingly.

        For each bet:
        - Fetches cleared orders from Betfair by Betfair bet ID.
        - Merges new settlement results with any existing ones.
        - Marks the bet as 'finished' once all expected orders are settled.
        - Syncs the wallet balance and triggers learnings analysis for finished bets.
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

            betfair_ids = [
                order.get("bet_id") for order in placed_orders if order.get("bet_id")
            ]

            if not betfair_ids:
                logger.warning(
                    f"No Betfair IDs found for placed bet {bet_id}. Marking as rejected."
                )
                self._mark_bet_rejected(bet_id, "No Betfair IDs found in placement_results")
                continue

            try:
                cleared_orders = self.betfair.list_cleared_orders(bet_ids=betfair_ids)

                if not cleared_orders:
                    continue

                expected_bet_count = len(betfair_ids)
                existing_settlements = bet_doc.get("settlement_results", [])

                # Merge: newer data overwrites older for the same bet_id.
                settlements_map = {
                    s.get("bet_id"): s
                    for s in existing_settlements
                    if s.get("bet_id")
                }
                for new_s in cleared_orders:
                    key = new_s.get("bet_id")
                    if key:
                        settlements_map[key] = new_s

                merged_results = list(settlements_map.values())
                total_realized_profit = sum(r.get("profit", 0) for r in merged_results)
                is_finished = len(merged_results) >= expected_bet_count
                starting_balance = bet_doc.get("balance", {}).get("starting", 0)

                update_data: Dict[str, Any] = {
                    "settlement_results": merged_results,
                    "last_settled_at": server_timestamp(),
                    "balance": {
                        **bet_doc.get("balance", {}),
                        "ending": starting_balance + total_realized_profit,
                    },
                }

                if is_finished:
                    update_data["status"] = "finished"
                    update_data["finished_at"] = server_timestamp()
                    logger.info(
                        f"Bet {bet_id} finished! All {expected_bet_count} bets settled."
                    )
                else:
                    logger.info(
                        f"Bet {bet_id} updated. "
                        f"{len(merged_results)}/{expected_bet_count} settled."
                    )

                self.repo.update_bet(bet_id, update_data)
                updated_count += 1

                if is_finished:
                    self.wallet_service.sync_balance()
                    try:
                        self.learnings_manager.analyze_finished_bet(
                            {**bet_doc, **update_data}
                        )
                    except Exception as le:
                        logger.error(
                            f"Error triggering learnings analysis for bet {bet_id}: {le}"
                        )

            except Exception as e:
                logger.error(f"Error checking results for bet {bet_id}: {e}")

        logger.info(f"Checked results. Updated {updated_count} bets.")
        return {
            "status": "success",
            "active_bets_checked": len(placed_bets),
            "bets_updated": updated_count,
        }
