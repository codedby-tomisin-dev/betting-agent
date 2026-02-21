from typing import Optional, Dict, Any
from core.modules.shared.repository import BaseRepository
from core import logger


class LearningsRepository(BaseRepository):
    """
    Repository for managing the single 'learnings/main' document.
    """

    def __init__(self):
        super().__init__("learnings")
        self.main_doc_id = "main"

    def get_main_learnings(self) -> Optional[Dict[str, Any]]:
        """
        Retrieves the main learnings document.
        """
        try:
            return self.get(self.main_doc_id)
        except Exception as e:
            logger.error(f"Error retrieving main learnings: {e}")
            return None

    def update_main_learnings(self, content: str) -> None:
        """
        Updates the main learnings document with the provided markdown content.
        """
        try:
            update_data = {
                "content": content,
            }
            # We use set with merge=True so it creates if it doesn't exist
            self.set(self.main_doc_id, update_data, merge=True)
            logger.info("Successfully updated learnings/main document")
        except Exception as e:
            logger.error(f"Error updating main learnings: {e}")
            raise e
