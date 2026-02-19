from typing import Any, Dict, Optional, List, Tuple
from core import logger
from core.firestore import get_collection, admin_firestore

class BaseRepository:
    """Base repository for managing Firestore documents."""
    
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self._collection = get_collection(collection_name)

    @property
    def collection(self):
        return self._collection

    def add(self, data: Dict[str, Any]) -> Tuple[Any, Any]:
        """
        Adds a new document to the collection.
        Returns (update_time, doc_ref).
        """
        return self.collection.add(data)

    def set(self, doc_id: str, data: Dict[str, Any], merge: bool = True) -> None:
        """
        Sets a document's data.
        """
        self.collection.document(doc_id).set(data, merge=merge)

    def get(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a document by ID. Returns dict or None.
        Includes 'id' in the returned dict.
        """
        doc = self.collection.document(doc_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        data["id"] = doc.id
        return data

    def update(self, doc_id: str, data: Dict[str, Any]) -> None:
        """
        Updates an existing document.
        """
        self.collection.document(doc_id).update(data)

    def delete(self, doc_id: str) -> None:
        """
        Deletes a document.
        """
        self.collection.document(doc_id).delete()

    def _query_to_list(self, query) -> list:
        """Stream a Firestore query and return results as dicts, each with 'id' injected."""
        results = []
        for doc in query.stream():
            data = doc.to_dict()
            data["id"] = doc.id
            results.append(data)
        return results
