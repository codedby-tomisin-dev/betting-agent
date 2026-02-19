from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from core import logger
from core.firestore import admin_firestore
from core.modules.shared.repository import BaseRepository


class SuggestionRepository(BaseRepository):
    """Repository for managing betting suggestion data in Firestore."""

    COLLECTION_NAME = "suggestions"

    def __init__(self):
        super().__init__(self.COLLECTION_NAME)

    def create_suggestion(self, suggestion_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new suggestion document."""
        try:
            if "created_at" not in suggestion_data:
                suggestion_data["created_at"] = admin_firestore.SERVER_TIMESTAMP

            _, doc_ref = self.add(suggestion_data)

            created_doc = suggestion_data.copy()
            created_doc["id"] = doc_ref.id

            if created_doc.get("created_at") == admin_firestore.SERVER_TIMESTAMP:
                created_doc["created_at"] = datetime.now(timezone.utc).isoformat()

            logger.info(f"Created suggestion document: {doc_ref.id}")
            return created_doc

        except Exception as e:
            logger.error(f"Error creating suggestion: {e}")
            raise e

    def get_suggestions_by_date(self, target_date: str) -> List[Dict[str, Any]]:
        """Get suggestions for a specific target date."""
        try:
            query = self.collection.where(
                filter=admin_firestore.FieldFilter("target_date", "==", target_date)
            )
            return self._query_to_list(query)
        except Exception as e:
            logger.error(f"Error getting suggestions by date: {e}")
            raise e

    def get_suggestion(self, suggestion_id: str) -> Optional[Dict[str, Any]]:
        """Get a single suggestion by ID."""
        try:
            return self.get(suggestion_id)
        except Exception as e:
            logger.error(f"Error getting suggestion {suggestion_id}: {e}")
            return None

    def delete_suggestion(self, suggestion_id: str) -> bool:
        """Delete a suggestion."""
        try:
            self.delete(suggestion_id)
            return True
        except Exception as e:
            logger.error(f"Error deleting suggestion {suggestion_id}: {e}")
            raise e

    def update_suggestion(self, suggestion_id: str, data: Dict[str, Any]) -> bool:
        """Update a suggestion document."""
        try:
            self.update(suggestion_id, data)
            return True
        except Exception as e:
            logger.error(f"Error updating suggestion {suggestion_id}: {e}")
            raise e
