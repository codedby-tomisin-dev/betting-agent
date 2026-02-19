from typing import Dict, Any, List, Optional

from core import logger
from third_party.betting_platforms.betfair_exchange import BetfairExchange


class BetfairService:
    """Thin wrapper around BetfairExchange that defers login until first use.

    Placing login in the constructor of BettingManager meant every Cloud
    Function invocation (including read-only ones) triggered a Betfair API
    call. This service initialises the client lazily — only when a method
    that actually needs it is first called.
    """

    def __init__(self):
        self._client: Optional[BetfairExchange] = None

    @property
    def client(self) -> BetfairExchange:
        if self._client is None:
            self._client = BetfairExchange()
            self._client.login()
            logger.info("Betfair client initialised and logged in")
        return self._client

    def search_market(self, *args, **kwargs) -> List[Dict[str, Any]]:
        return self.client.search_market(*args, **kwargs)

    def get_event_markets(self, *args, **kwargs) -> List[Dict[str, Any]]:
        return self.client.get_event_markets(*args, **kwargs)

    def place_bets(self, bets: List[Dict[str, Any]]) -> Dict[str, Any]:
        return self.client.place_bets(bets)

    def get_balance(self) -> Dict[str, Any]:
        return self.client.get_balance()

    def list_cleared_orders(self, *args, **kwargs) -> List[Dict[str, Any]]:
        return self.client.list_cleared_orders(*args, **kwargs)
