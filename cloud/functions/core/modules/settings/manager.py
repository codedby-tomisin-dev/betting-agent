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

    def get_setting(self, key: str, default: Any = None) -> Any:
        """
        Get a specific setting value by key.
        Priority:
        1. Firestore settings document (settings/betting)
        2. AUTOMATED_BETTING_OPTIONS constant
        3. Provided default value
        
        Args:
            key: Setting key to retrieve (e.g., 'RISK_APPETITE')
            default: Default value if not found in settings or constants
            
        Returns:
            The setting value
        """
        # 1. Check Firestore settings
        try:
            settings = self.repository.get_settings(self.default_doc)
            if settings and key in settings:
                return settings[key]
        except Exception as e:
            logger.warning(f"Error reading settings from Firestore: {e}")
            
        # 2. Check Constants
        from constants import AUTOMATED_BETTING_OPTIONS
        if key in AUTOMATED_BETTING_OPTIONS:
            return AUTOMATED_BETTING_OPTIONS[key]
            
        # 3. Return default
        return default
