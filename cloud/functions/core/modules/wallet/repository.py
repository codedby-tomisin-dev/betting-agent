from typing import Optional, Dict, Any

from core import firestore
from .models import WalletModel
from core import logger

class WalletRepository:
    def __init__(self):
        self.collection_name = "wallets"
        self.main_doc_id = "main"

    def get_wallet(self) -> Optional[WalletModel]:
        """
        Get the main wallet document from Firestore.
        """
        try:
            doc = firestore.get_document(self.collection_name, self.main_doc_id)
            if doc.exists:
                return WalletModel(**doc.to_dict())
            return None
        except Exception as e:
            logger.error(f"Error fetching wallet from Firestore: {e}")
            return None

    def save_wallet(self, wallet: WalletModel) -> None:
        """
        Save the wallet to Firestore.
        """
        try:
            # We use exclude_unset=True to avoid overwriting fields blindly if not provided
            data = wallet.model_dump(mode='json')
            firestore.set_document(self.collection_name, self.main_doc_id, data)
        except Exception as e:
            logger.error(f"Error saving wallet to Firestore: {e}")
