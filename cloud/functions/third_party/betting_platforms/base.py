from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseBettingPlatform(ABC):
    """Abstract base class for betting platforms."""
    
    def __init__(self):
        pass

    @abstractmethod
    def search_market(self, sport: str, competitions: List[str] = []) -> List[Dict[str, Any]]:
        """
        Search for markets given a sport and optionally a list of competitions.
        
        Args:
            sport: The sport name (e.g., "Soccer").
            competitions: Optional list of competition names to filter by (e.g., ["Premier League", "FA Cup"]).
            
        Returns:
            A list of markets found.
        """
        pass

    @abstractmethod
    def place_bets(self, bets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Place multiple bets across potentially different markets.
        
        Args:
            bets: List of bet dictionaries, each containing:
                - market_id: str - The ID of the market to bet on
                - selection_id: int - The ID of the selection (team/outcome) to bet on
                - stake: float - The amount to bet
                - odds: float - The odds to bet at
                - side: str (optional) - 'BACK' or 'LAY', defaults to 'BACK'
            
        Returns:
            A dictionary containing the results of all bet placements.
        """
        pass
