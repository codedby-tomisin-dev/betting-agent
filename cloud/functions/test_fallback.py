import os
import json
import asyncio
from unittest.mock import MagicMock
from constants import AUTOMATED_BETTING_OPTIONS
from core.modules.betting.models import BettingAgentResponse
from core.modules.betting.agent.service import make_fallback_selections
from third_party.betting_platforms.models import Event, Option, Selection, Competition
from datetime import datetime

# Mock event with some odds
event = Event(
    provider_event_id="123",
    name="LNZ-Lebedyn v Polissya Zhytomyr",
    time=datetime.utcnow(),
    competition=Competition(name="Ukrainian Premier League"),
    options=[
        Option(
            market_id="m1",
            name="Under 4.5 Goals",
            options=[
                Selection(selection_id=1, name="Under 4.5 Goals", odds=1.12),
                Selection(selection_id=2, name="Over 4.5 Goals", odds=6.5)
            ]
        ),
        Option(
            market_id="m2",
            name="Under 0.5 Goals",
            options=[
                Selection(selection_id=3, name="Under 0.5 Goals", odds=12.0),
                Selection(selection_id=4, name="Over 0.5 Goals", odds=1.04)
            ]
        )
    ]
)

wallet_service = MagicMock()
wallet_service.get_available_balance.return_value = 100.0
bet_repo = MagicMock()
bet_repo.get_all_finished_bets.return_value = []
betfair_service = MagicMock()
betfair_service.get_market_liquidity.return_value = 250.0

response = make_fallback_selections(
    events=[event],
    budget=45.43,
    min_profit=0,
    wallet_service=wallet_service,
    bet_repo=bet_repo,
    betfair_service=betfair_service
)

print("\n--- RESPONSE ---")
print(response.model_dump_json(indent=2))
