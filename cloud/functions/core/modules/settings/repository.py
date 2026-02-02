from typing import Dict, Any, Optional
from core import logger
from core.modules.shared.repository import BaseRepository

class SettingsRepository(BaseRepository):
    """Repository for managing application settings."""
    
    COLLECTION_NAME = "settings"
    
    def __init__(self):
        super().__init__(self.COLLECTION_NAME)

    def get_settings(self, settings_type: str = "betting") -> Dict[str, Any]:
        """
        Retrieves settings for a specific type.
        Args:
            settings_type: The document ID (e.g., 'betting')
        """
        try:
            settings = self.get(settings_type)
            return settings if settings else {}
        except Exception as e:
            logger.error(f"Error retrieving settings '{settings_type}': {e}")
            raise e

    def save_settings(self, settings_type: str, settings: Dict[str, Any]) -> None:
        """
        Saves settings for a specific type.
        Args:
            settings_type: The document ID
            settings: The settings data
        """
        try:
            self.set(settings_type, settings)
            logger.info(f"Settings '{settings_type}' updated")
        except Exception as e:
            logger.error(f"Error saving settings '{settings_type}': {e}")
            raise e
