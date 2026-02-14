"""
Wallet manager — orchestrates balance sync between Betfair and Firestore.
"""

from core import logger
from core.modules.wallet.repository import WalletRepository


class WalletManager:
    """Higher-level wallet operations that coordinate external services with persistence."""

    def __init__(self) -> None:
        self.repo = WalletRepository()

    def sync_balance(self, betfair_client) -> float:
        """
        Fetch the current balance from Betfair and persist it.

        Returns the available balance so callers can use it immediately.
        """
        balance_info = betfair_client.get_balance()
        available = balance_info.get("available_balance", 0)
        self.repo.update_wallet(amount=available)
        return available
