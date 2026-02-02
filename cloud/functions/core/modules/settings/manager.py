from typing import Dict, Any
from core import logger
from core.modules.settings.repository import SettingsRepository

class SettingsManager:
    """Manager for application settings"""
    
    def __init__(self):
        self.repository = SettingsRepository()
        self.default_doc = "betting"

    def get_settings(self) -> Dict[str, Any]:
        """
        Get current betting settings.
        """
        return self.repository.get_settings(self.default_doc)

    def save_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save settings to Firestore.
        
        Args:
            settings: Dictionary of settings to save
            
        Returns:
            The saved settings
        """
        try:
            self.repository.save_settings(self.default_doc, settings)
            return settings
        except Exception as e:
            logger.error(f"Failed to save settings: {e}")
            raise e
