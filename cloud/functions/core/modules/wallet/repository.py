"""
Wallet repository — single Firestore document tracking the Betfair balance.

Document path: wallet/main
Schema: { "amount": float, "currency": "GBP", "updated_at": Timestamp }
"""

from typing import Any, Dict, Optional

from core import logger
from core.firestore import admin_firestore, get_collection


COLLECTION = "wallet"
DOC_ID = "main"


class WalletRepository:
    """Read/write the wallet document in Firestore."""

    def __init__(self) -> None:
        self._collection = get_collection(COLLECTION)

    @property
    def _doc_ref(self):
        return self._collection.document(DOC_ID)

    def get_wallet(self) -> Optional[Dict[str, Any]]:
        """Return the wallet document, or None if it doesn't exist yet."""
        doc = self._doc_ref.get()
        if not doc.exists:
            return None
        return doc.to_dict()

    def update_wallet(self, amount: float, currency: str = "GBP") -> None:
        """Overwrite the wallet document with a new amount."""
        self._doc_ref.set(
            {
                "amount": amount,
                "currency": currency,
                "updated_at": admin_firestore.SERVER_TIMESTAMP,
            },
            merge=False,
        )
        logger.info(f"Wallet updated: {currency} {amount:.2f}")
