from datetime import datetime
from typing import Optional, Dict, Any

from .models import WalletModel
from .repository import WalletRepository
from core.modules.betting.betfair_service import BetfairService
from core import logger

class WalletService:
    def __init__(self):
        self.repo = WalletRepository()
        # Initialize lazily when needed
        self._betfair = None

    @property
    def betfair(self) -> BetfairService:
        if self._betfair is None:
            self._betfair = BetfairService()
        return self._betfair

    def get_wallet(self) -> Optional[WalletModel]:
        """
        Get the current wallet state from the database.
        If it doesn't exist, it attempts to sync it first.
        """
        wallet = self.repo.get_wallet()
        if not wallet:
            logger.info("Wallet not found in DB. Syncing with exchange...")
            return self.sync_balance()
        return wallet

    def get_available_balance(self) -> float:
        """
        Convenience method to quickly get just the available balance.
        """
        wallet = self.get_wallet()
        return wallet.amount if wallet else 0.0

    def sync_balance(self) -> Optional[WalletModel]:
        """
        Fetch the live balance from the exchange and update the database.
        Returns the updated WalletModel.
        """
        try:
            balance_info = self.betfair.get_balance()
            
            wallet = WalletModel(
                amount=balance_info.get("available_balance", 0.0),
                exposure=balance_info.get("exposure", 0.0),
                currency="GBP", # Assuming GBP for now, adjust if multi-currency needed
                updated_at=datetime.utcnow()
            )
            
            self.repo.save_wallet(wallet)
            logger.info(f"Wallet synced successfully: {wallet.amount} {wallet.currency}")
            return wallet
            
        except Exception as e:
            logger.error(f"Failed to sync wallet balance: {e}")
            # If sync fails, fall back to what's in the DB if available
            return self.repo.get_wallet()
