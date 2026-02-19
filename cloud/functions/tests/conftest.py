"""
Shared pytest fixtures for testing the betting agent.
"""
import os
import sys
from unittest.mock import MagicMock, Mock
import pytest

# Mock Firebase dependencies before any imports
sys.modules['firebase_admin'] = MagicMock()
sys.modules['firebase_admin.firestore'] = MagicMock()
sys.modules['firebase_functions'] = MagicMock()
sys.modules['firebase_functions.https_fn'] = MagicMock()
sys.modules['firebase_functions.scheduler_fn'] = MagicMock()
sys.modules['firebase_functions.firestore_fn'] = MagicMock()
sys.modules['firebase_functions.options'] = MagicMock()


@pytest.fixture
def mock_firestore():
    """Mock Firestore client and operations."""
    mock_db = MagicMock()
    return mock_db


@pytest.fixture
def mock_betfair_client():
    """Mock Betfair API client."""
    mock_client = MagicMock()
    
    # Mock balance response
    mock_client.account.get_account_funds.return_value = Mock(
        available_to_bet_balance=100.0,
        exposure=0.0,
        retained_commission=0.0,
        exposure_limit=-1000.0,
        discount_rate=0.0,
        points_balance=0
    )
    
    return mock_client


@pytest.fixture
def mock_betting_repo():
    """Mock BetRepository."""
    mock_repo = MagicMock()
    mock_repo.get_matches_by_date.return_value = []
    return mock_repo


@pytest.fixture
def betting_manager(mock_betfair_client, mock_betting_repo):
    """Create a BettingManager with mocked dependencies injected via constructor."""
    from core.modules.betting.manager import BettingManager
    from unittest.mock import MagicMock

    mock_service = MagicMock()
    mock_service.get_balance.return_value = {
        "available_balance": mock_betfair_client.account.get_account_funds.return_value.available_to_bet_balance,
        "exposure": 0.0,
        "retained_commission": 0.0,
        "exposure_limit": -1000.0,
        "discount_rate": 0.0,
        "points_balance": 0,
    }
    mock_service.place_bets.return_value = {"status": "SUCCESS", "bets": []}
    mock_service.search_market.return_value = []
    mock_service.list_cleared_orders.return_value = []

    return BettingManager(betfair_service=mock_service, bet_repo=mock_betting_repo)


@pytest.fixture
def sample_bets():
    """Sample bet data for testing."""
    return [
        {
            "market_id": "1.123456789",
            "selection_id": 12345,
            "stake": 10.0,
            "odds": 2.5,
            "side": "BACK"
        },
        {
            "market_id": "1.987654321",
            "selection_id": 67890,
            "stake": 5.0,
            "odds": 3.0,
            "side": "BACK"
        }
    ]


@pytest.fixture
def sample_event():
    """Sample event data for testing."""
    return {
        "event_name": "Manchester United vs Liverpool",
        "event_time": "2025-01-01T15:00:00Z",
        "competition_name": "English Premier League",
        "options": [
            {
                "name": "Match Odds",
                "market_id": "1.123456789",
                "options": [
                    {"name": "Manchester United", "odds": 2.5, "selection_id": 12345},
                    {"name": "Draw", "odds": 3.2, "selection_id": 23456},
                    {"name": "Liverpool", "odds": 2.8, "selection_id": 34567}
                ]
            }
        ]
    }


@pytest.fixture(autouse=True)
def set_emulator_env():
    """Automatically set FUNCTIONS_EMULATOR for all tests."""
    original_value = os.environ.get("FUNCTIONS_EMULATOR")
    os.environ["FUNCTIONS_EMULATOR"] = "true"
    yield
    if original_value is None:
        os.environ.pop("FUNCTIONS_EMULATOR", None)
    else:
        os.environ["FUNCTIONS_EMULATOR"] = original_value
