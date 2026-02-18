from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from core import logger
from core.firestore import admin_firestore, get_collection, get_document

class SuggestionRepository:
    """Repository for managing betting suggestion data in Firestore"""

    def __init__(self):
        self.collection_name = "suggestions"

    def create_suggestion(self, suggestion_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a new suggestion document.
        """
        try:
            # Check if created_at is present, otherwise add it
            if "created_at" not in suggestion_data:
                suggestion_data["created_at"] = admin_firestore.SERVER_TIMESTAMP
            
            # Add to Firestore
            collection_ref = get_collection(self.collection_name)
            _, doc_ref = collection_ref.add(suggestion_data)
            
            # Return the created document data with ID
            created_doc = suggestion_data.copy()
            created_doc["id"] = doc_ref.id
            
            # Replace sentinel with ISO string for response serialization
            if created_doc.get("created_at") == admin_firestore.SERVER_TIMESTAMP:
                created_doc["created_at"] = datetime.now(timezone.utc).isoformat()
            
            logger.info(f"Created suggestion document: {doc_ref.id}")
            return created_doc
            
        except Exception as e:
            logger.error(f"Error creating suggestion: {e}")
            raise e

    def get_suggestions_by_date(self, target_date: str) -> List[Dict[str, Any]]:
        """
        Get suggestions for a specific target date.
        """
        try:
            collection_ref = get_collection(self.collection_name)
            query = collection_ref.where(filter=admin_firestore.FieldFilter("target_date", "==", target_date))
            
            docs = query.stream()
            result = []
            
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                result.append(data)
                
            return result
        except Exception as e:
            logger.error(f"Error getting suggestions by date: {e}")
            raise e
            
    def get_suggestion(self, suggestion_id: str) -> Optional[Dict[str, Any]]:
        """Get a single suggestion by ID"""
        try:
            doc = get_document(self.collection_name, suggestion_id)
            
            if doc.exists:
                data = doc.to_dict()
                data["id"] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error getting suggestion {suggestion_id}: {e}")
            return None

    def delete_suggestion(self, suggestion_id: str) -> bool:
        """Delete a suggestion"""
        try:
            doc_ref = get_collection(self.collection_name).document(suggestion_id)
            doc_ref.delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting suggestion {suggestion_id}: {e}")
            raise e

    def update_suggestion(self, suggestion_id: str, data: Dict[str, Any]) -> bool:
        """Update a suggestion document"""
        try:
            doc_ref = get_collection(self.collection_name).document(suggestion_id)
            doc_ref.update(data)
            return True
        except Exception as e:
            logger.error(f"Error updating suggestion {suggestion_id}: {e}")
            raise e
