import os
import json
import asyncio
from unittest.mock import MagicMock
from constants import AUTOMATED_BETTING_OPTIONS
from core.modules.betting.agent.service import _format_events
from third_party.betting_platforms.models import Event, Option, Selection
from third_party.betting_platforms.betfair_exchange.client import BetfairExchange

async def run():
    betfair = BetfairExchange()
    await betfair.initialize()
    events = await betfair.get_upcoming_games()
    lnz_event = next((e for e in events if "LNZ-Lebedyn" in e.name), None)
    if not lnz_event:
        print("LNZ-Lebedyn event not found")
        return
        
    print(f"FOUND EVENT: {lnz_event.name}")
    print(_format_events([lnz_event]))
    
if __name__ == "__main__":
    asyncio.run(run())
