"""
Shared pytest fixtures for testing the betting agent.
"""
import os
import sys
from unittest.mock import MagicMock, Mock
import pytest

from datetime import datetime, timezone

# Mock Firebase and OpenAI dependencies before any imports
sys.modules['firebase_admin'] = MagicMock()
sys.modules['firebase_admin.firestore'] = MagicMock()
sys.modules['firebase_functions'] = MagicMock()
sys.modules['firebase_functions.https_fn'] = MagicMock()
sys.modules['firebase_functions.scheduler_fn'] = MagicMock()
sys.modules['firebase_functions.firestore_fn'] = MagicMock()
sys.modules['firebase_functions.options'] = MagicMock()
# Mock google.cloud.firestore to avoid needing real Firebase in tests
sys.modules['google'] = MagicMock()
sys.modules['google.cloud'] = MagicMock()
sys.modules['google.cloud.firestore_v1'] = MagicMock()
sys.modules['google.cloud.firestore_v1.transforms'] = MagicMock()
sys.modules['google.cloud.firestore_v1.base_query'] = MagicMock()
sys.modules['google.cloud.firestore_v1.base_vector_query'] = MagicMock()
sys.modules['google.cloud.firestore_v1.vector'] = MagicMock()
# Prevent OpenAI client from being instantiated at module import time
sys.modules['openai'] = MagicMock()
sys.modules['pydantic_ai'] = MagicMock()
sys.modules['pydantic_ai.models'] = MagicMock()
sys.modules['pydantic_ai.models.openai'] = MagicMock()
sys.modules['pydantic_ai.models.gemini'] = MagicMock()
sys.modules['pydantic_ai.common_tools'] = MagicMock()
sys.modules['pydantic_ai.common_tools.duckduckgo'] = MagicMock()

# Patch server_timestamp to return a plain datetime in tests (no Firebase needed)
import unittest.mock as _mock
import core.timestamps as _timestamps
_timestamps.server_timestamp = lambda: datetime.now(timezone.utc)


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
def mock_suggestion_repo():
    """Mock SuggestionRepository."""
    mock_repo = MagicMock()
    mock_repo.create_suggestion.return_value = {"id": "suggestion_123", "status": "intent"}
    return mock_repo


@pytest.fixture
def mock_settings_repo():
    """Mock SettingsRepository."""
    mock_repo = MagicMock()
    mock_repo.get_settings.return_value = {}
    return mock_repo


@pytest.fixture
def mock_learnings_repo():
    """Mock LearningsRepository."""
    mock_repo = MagicMock()
    mock_repo.get_main_learnings.return_value = {"content": ""}
    return mock_repo


@pytest.fixture
def mock_wallet_repo():
    """Mock WalletRepository."""
    from core.modules.wallet.models import WalletModel
    mock_repo = MagicMock()
    mock_repo.get_wallet.return_value = WalletModel(amount=100.0, exposure=0.0, currency="GBP")
    return mock_repo


@pytest.fixture
def betting_manager(mock_betfair_client, mock_betting_repo, mock_suggestion_repo,
                    mock_settings_repo, mock_learnings_repo, mock_wallet_repo):
    """Create a BettingManager with all dependencies injected — no Firebase required."""
    from core.modules.betting.manager import BettingManager
    from core.modules.settings.manager import SettingsManager
    from core.modules.learnings.manager import LearningsManager
    from core.modules.wallet.service import WalletService

    mock_betfair_service = MagicMock()
    mock_betfair_service.get_balance.return_value = {
        "available_balance": mock_betfair_client.account.get_account_funds.return_value.available_to_bet_balance,
        "exposure": 0.0,
        "retained_commission": 0.0,
        "exposure_limit": -1000.0,
        "discount_rate": 0.0,
        "points_balance": 0,
    }
    mock_betfair_service.place_bets.return_value = {"status": "SUCCESS", "bets": []}
    mock_betfair_service.search_market.return_value = []
    mock_betfair_service.list_cleared_orders.return_value = []

    settings_manager = SettingsManager(repository=mock_settings_repo)
    learnings_manager = LearningsManager(repository=mock_learnings_repo, bet_repository=mock_betting_repo)
    wallet_service = WalletService(repository=mock_wallet_repo, betfair_service=mock_betfair_service)

    return BettingManager(
        betfair_service=mock_betfair_service,
        bet_repo=mock_betting_repo,
        suggestion_repo=mock_suggestion_repo,
        settings_manager=settings_manager,
        learnings_manager=learnings_manager,
        wallet_service=wallet_service,
    )


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
    """Sample event data for testing (uses new schema: name, time, competition)."""
    return {
        "provider_event_id": "123456",
        "name": "Manchester United vs Liverpool",
        "time": "2025-01-01T15:00:00Z",
        "competition": {"name": "English Premier League"},
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
