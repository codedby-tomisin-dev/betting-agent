"""
Tests for BettingManager.
"""
from unittest.mock import MagicMock, Mock, patch
import pytest

from core.modules.betting.models import AnalyzeBetsRequest


def test_get_bet_method_exists(betting_manager):
    """Test that BettingManager has get_bet method (replaces verify_get_bet.py)."""
    assert hasattr(betting_manager, 'get_bet')
    assert callable(betting_manager.get_bet)


def test_get_bet_returns_data(betting_manager):
    """Test that get_bet returns bet data."""
    # Mock repository response
    betting_manager.repo.get_bet.return_value = {
        "id": "test_bet_123",
        "status": "intent",
        "events": []
    }
    
    result = betting_manager.get_bet("test_bet_123")
    
    assert result is not None
    assert result["id"] == "test_bet_123"
    betting_manager.repo.get_bet.assert_called_once_with("test_bet_123")


def test_idempotency_existing_bet(betting_manager):
    """Test idempotency: existing bet found (replaces verify_idempotency.py case 1)."""
    target_date = "2025-01-01"
    
    # Mock existing bet
    betting_manager.repo.get_matches_by_date.return_value = [
        {"id": "existing_bet_id", "target_date": target_date}
    ]
    
    # Mock balance
    betting_manager.get_balance = MagicMock(return_value={"available_balance": 100})
    
    result = betting_manager.execute_automated_betting(
        competitions=["Test Comp"],
        bankroll_percent=10,
        max_bankroll=10,
        risk_appetite=3,
        target_date=target_date
    )
    
    assert result["status"] == "existing"
    assert result["bet"]["id"] == "existing_bet_id"


def test_idempotency_no_existing_bet(betting_manager, sample_event):
    """Test idempotency: no existing bet, proceeds to create a suggestion."""
    target_date = "2025-01-01"

    betting_manager.repo.get_matches_by_date.return_value = []
    betting_manager.get_balance = MagicMock(return_value={"available_balance": 100})

    # sample_event uses new schema field 'time'
    sample_event_with_date = {**sample_event, "time": "2025-01-01T15:00:00Z"}
    betting_manager.get_odds = MagicMock(return_value=[sample_event_with_date])

    mock_suggestion = {"id": "new_suggestion_123", "status": "intent"}

    with patch('core.modules.betting.manager.SuggestionRepository') as MockSuggRepo:
        MockSuggRepo.return_value.create_suggestion.return_value = mock_suggestion
        result = betting_manager.execute_automated_betting(
            competitions=["Test Comp"],
            bankroll_percent=10,
            max_bankroll=10,
            risk_appetite=3,
            target_date=target_date
        )

    assert result["id"] == "new_suggestion_123"


def test_intent_creation_structure(betting_manager, sample_event):
    """Test that balance is correctly structured in the created suggestion."""
    betting_manager.repo.get_matches_by_date.return_value = []
    betting_manager.get_balance = MagicMock(return_value={"available_balance": 100})

    sample_event_with_date = {**sample_event, "time": "2025-01-01T15:00:00Z"}
    betting_manager.get_odds = MagicMock(return_value=[sample_event_with_date])

    with patch('core.modules.betting.manager.SuggestionRepository') as MockSuggRepo:
        mock_create = MockSuggRepo.return_value.create_suggestion
        mock_create.return_value = {"id": "sug_123"}

        betting_manager.execute_automated_betting(
            competitions=["Test Comp"],
            bankroll_percent=10,
            max_bankroll=10,
            risk_appetite=3,
            target_date="2025-01-01"
        )

        call_args = mock_create.call_args
        assert call_args is not None
        intent_data = call_args[0][0]

    assert "balance" in intent_data
    assert "starting" in intent_data["balance"]
    assert "predicted" in intent_data["balance"]
    assert "ending" in intent_data["balance"]
    assert isinstance(intent_data["balance"]["starting"], (int, float))
    assert intent_data["balance"]["ending"] is None


def test_get_balance(betting_manager):
    """Test getting balance from Betfair."""
    # Mock the betfair get_balance method
    betting_manager.betfair.get_balance.return_value = {
        "available_balance": 100.0,
        "exposure": 0.0,
        "retained_commission": 0.0
    }
    
    balance = betting_manager.get_balance()
    
    assert balance["available_balance"] == 100.0
    assert "exposure" in balance


def test_place_bet(betting_manager):
    """Test placing bets through manager."""
    from core.modules.betting.models import PlaceBetRequest
    
    bets = [
        {
            "market_id": "1.123",
            "selection_id": 12345,
            "stake": 10.0,
            "odds": 2.5,
            "side": "BACK"
        }
    ]
    
    request = PlaceBetRequest(bets=bets)
    
    # Mock betfair response
    betting_manager.betfair.place_bets.return_value = {
        "status": "SUCCESS",
        "bets": [
            {
                "market_id": "1.123",
                "selection_id": 12345,
                "status": "SUCCESS",
                "bet_id": "mock_bet_123",
                "average_price_matched": 2.5,
                "size_matched": 10.0
            }
        ]
    }
    
    result = betting_manager.place_bet(request)
    
    assert result["status"] == "SUCCESS"
    assert len(result["bets"]) == 1
    betting_manager.betfair.place_bets.assert_called_once()


def test_analyze_betting_opportunities(betting_manager, sample_event):
    """Test AI analysis of betting opportunities."""
    data = AnalyzeBetsRequest(
        events=[sample_event],
        risk_appetite=3.0,
        budget=100.0
    )
    
    # Mock the AI agent response
    with patch('core.modules.betting.manager.betting_agent') as mock_agent:
        # Create a mock recommendation object with proper attributes
        mock_rec = Mock()
        mock_rec.stake = 10.0
        mock_rec.odds = 2.5
        mock_rec.market_id = "1.123"
        mock_rec.selection_id = 12345
        mock_rec.pick = Mock(event_name="Test Event")
        mock_rec.model_dump.return_value = {
            "market_id": "1.123",
            "selection_id": 12345,
            "stake": 10.0,
            "odds": 2.5
        }
        
        mock_result = Mock()
        mock_result.output = Mock()
        mock_result.output.recommendations = [mock_rec]
        mock_result.output.overall_reasoning = "Test overall reasoning"
        
        mock_agent.run_sync.return_value = mock_result
        
        result = betting_manager.analyze_betting_opportunities(data)
        
        assert "selections" in result
        assert "items" in result["selections"]
        assert len(result["selections"]["items"]) > 0


def test_update_analysis_result(betting_manager):
    """Test updating bet intent with analysis results."""
    bet_id = "test_bet_123"
    betting_manager.repo.get_bet.return_value = {
        "balance": {"starting": 100}
    }
    
    analysis_result = {
        "selections": {
            "items": [
                {
                    "event": "Test Event",
                    "market": "Test Market",
                    "stake": 10.0,
                    "odds": 2.5
                }
            ],
            "stake": {"total": 10.0}
        },
        "total_stake": 10.0,
        "total_returns": 25.0
    }
    
    betting_manager.update_analysis_result(bet_id, analysis_result)
    
    betting_manager.repo.update_bet.assert_called_once()
    call_args = betting_manager.repo.update_bet.call_args
    assert call_args[0][0] == bet_id
    assert "selections" in call_args[0][1]


def test_approve_bet_intent(betting_manager):
    """Test approving a bet intent."""
    bet_id = "test_bet_123"
    
    betting_manager.approve_bet_intent(bet_id)
    
    betting_manager.repo.update_bet.assert_called_once()
    call_args = betting_manager.repo.update_bet.call_args
    assert call_args[0][0] == bet_id
    assert call_args[0][1]["status"] == "ready"


def test_approve_bet_intent_with_modifications(betting_manager):
    """Test approving a bet intent with modifications."""
    bet_id = "test_bet_123"
    betting_manager.repo.get_bet.return_value = {
        "balance": {"starting": 100}
    }
    
    modifications = {
        "items": [
            {
                "event": "Test Event",
                "market": "Test Market",
                "stake": 5.0,
                "odds": 2.5
            }
        ]
    }
    
    betting_manager.approve_bet_intent(bet_id, modifications)
    
    betting_manager.repo.update_bet.assert_called_once()
    call_args = betting_manager.repo.update_bet.call_args
    assert call_args[0][0] == bet_id
    assert call_args[0][1]["status"] == "ready"
    assert "selections" in call_args[0][1]


def test_check_bet_results(betting_manager):
    """Test checking bet results from Betfair."""
    # Mock placed bets (not pending)
    betting_manager.repo.get_placed_bets.return_value = [
        {
            "id": "bet_123",
            "placement_results": {
                "bets": [
                    {"bet_id": "betfair_123", "market_id": "1.123", "selection_id": 12345}
                ]
            }
        }
    ]
    
    # Mock cleared orders response
    betting_manager.betfair.list_cleared_orders.return_value = [
        {
            "bet_id": "betfair_123",
            "market_id": "1.123",
            "selection_id": 12345,
            "status": "WON",
            "profit": 15.0
        }
    ]
    
    result = betting_manager.check_bet_results()
    
    assert betting_manager.betfair.list_cleared_orders.called
    assert betting_manager.repo.update_bet.called
    assert result["status"] == "success"

