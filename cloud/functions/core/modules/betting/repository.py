from typing import Dict, List, Any, Optional

from core import logger
from core.firestore import admin_firestore
from core.modules.shared.repository import BaseRepository


class BetRepository(BaseRepository):
    """Repository for managing bet documents in Firestore."""
    
    COLLECTION_NAME = "bet_slips"
    
    def __init__(self):
        super().__init__(self.COLLECTION_NAME)

    def create_bet_intent(self, intent_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a new bet intent document.
        
        Args:
            intent_data: Dictionary containing bet intent details
            
        Returns:
            Dictionary with the created document data including ID
        """
        try:
            # Ensure created_at is set to server timestamp if not provided
            if "created_at" not in intent_data:
                intent_data["created_at"] = admin_firestore.SERVER_TIMESTAMP
                
            update_time, doc_ref = self.add(intent_data)
            
            logger.info(f"Created bet intent document: {doc_ref.id}")
            
            # Return result with ID
            result = intent_data.copy()
            result["id"] = doc_ref.id
            # Remove server timestamp for response serialize capability if needed, 
            # or keep it if the caller handles it. Removing for safety in immediate response.
            if "created_at" in result:
                del result["created_at"]
                
            return result
        except Exception as e:
            logger.error(f"Error creating bet intent: {e}")
            raise e

    def update_bet(self, bet_id: str, data: Dict[str, Any], merge: bool = True) -> None:
        """
        Updates a bet document.
        
        Args:
            bet_id: The Firestore document ID
            data: Dictionary of fields to update
            merge: Whether to merge with existing data (default: True)
        """
        try:
            self.set(bet_id, data, merge=merge)
            logger.info(f"Updated bet {bet_id}")
        except Exception as e:
            logger.error(f"Error updating bet {bet_id}: {e}")
            raise e

    def get_bet(self, bet_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a bet document by ID.
        
        Args:
            bet_id: The Firestore document ID
            
        Returns:
            The bet document data or None if not found
        """
        try:
            result = self.get(bet_id)
            if not result:
                logger.warning(f"Bet {bet_id} not found")
            return result
            
        except Exception as e:
            logger.error(f"Error retrieving bet {bet_id}: {e}")
            raise e

    def get_matches_by_date(self, target_date: str) -> List[Dict[str, Any]]:
        """
        Retrieves bets for a specific target date.
        
        Args:
            target_date: The date string (YYYY-MM-DD)
            
        Returns:
            List of bet documents found
        """
        try:
            query = self.collection.where("target_date", "==", target_date)
            docs = query.stream()
            
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
                
            return results
            
        except Exception as e:
            logger.error(f"Error retrieving bets for date {target_date}: {e}")
            raise e

    def get_placed_bets(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves bets with status 'placed'.
        
        Returns:
            List of bet documents
        """
        try:
            # We want bets that are 'placed' (sent to Betfair) but not yet 'settled'
            # Note: status remains 'placed' until ALL bets in intent are settled (then 'finished').
            # So looking for 'placed' is correct for ongoing/partial updates.
            query = self.collection.where("status", "==", "placed").limit(limit)
            docs = query.stream()
            
            results = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results.append(data)
                
            return results
        except Exception as e:
            logger.error(f"Error retrieving placed bets: {e}")
            raise e
