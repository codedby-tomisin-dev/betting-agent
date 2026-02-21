"""
Tests for BetfairExchange client.
"""
import os
import uuid
from unittest.mock import MagicMock, Mock, patch
import pytest


def test_mock_bet_placement_in_emulator(sample_bets):
    """Test that bets are mocked when FUNCTIONS_EMULATOR is set."""
    from third_party.betting_platforms.betfair_exchange.client import BetfairExchange
    
    # Create client with dummy credentials
    with patch.dict(os.environ, {
        'BETFAIR_USERNAME': 'test_user',
        'BETFAIR_PASSWORD': 'test_pass',
        'BETFAIR_APP_KEY': 'test_key',
        'BETFAIR_CERTS_PATH': '/tmp/test_certs',
        'FUNCTIONS_EMULATOR': 'true'
    }):
        client = BetfairExchange()
        
        # Place bets
        result = client.place_bets(sample_bets)
        
        # Verify mock response
        assert result["status"] == "SUCCESS"
        assert len(result["bets"]) == len(sample_bets)
        
        for i, bet_result in enumerate(result["bets"]):
            assert bet_result["status"] == "SUCCESS"
            assert bet_result["bet_id"].startswith("mock_bet_")
            assert bet_result["market_id"] == sample_bets[i]["market_id"]
            assert bet_result["selection_id"] == sample_bets[i]["selection_id"]
            assert bet_result["average_price_matched"] == sample_bets[i]["odds"]
            assert bet_result["size_matched"] == sample_bets[i]["stake"]


def test_bet_placement_without_emulator(sample_bets, mock_betfair_client):
    """Test that actual API is called when not in emulator mode."""
    from third_party.betting_platforms.betfair_exchange.client import BetfairExchange
    
    with patch.dict(os.environ, {
        'BETFAIR_USERNAME': 'test_user',
        'BETFAIR_PASSWORD': 'test_pass',
        'BETFAIR_APP_KEY': 'test_key',
        'BETFAIR_CERTS_PATH': '/tmp/test_certs',
        'FUNCTIONS_EMULATOR': 'false'
    }):
        # Mock the place_orders response for each market
        mock_report1 = Mock()
        mock_report1.status = "SUCCESS"
        mock_report1.bet_id = "real_bet_123"
        mock_report1.average_price_matched = 2.5
        mock_report1.size_matched = 10.0
        
        mock_report2 = Mock()
        mock_report2.status = "SUCCESS"
        mock_report2.bet_id = "real_bet_456"
        mock_report2.average_price_matched = 3.0
        mock_report2.size_matched = 5.0
        
        mock_response1 = Mock()
        mock_response1.status = "SUCCESS"
        mock_response1.place_instruction_reports = [mock_report1]
        
        mock_response2 = Mock()
        mock_response2.status = "SUCCESS"
        mock_response2.place_instruction_reports = [mock_report2]
        
        with patch('betfairlightweight.APIClient') as MockAPIClient:
            mock_instance = MockAPIClient.return_value
            # Return different responses for different markets
            mock_instance.betting.place_orders.side_effect = [mock_response1, mock_response2]
            
            client = BetfairExchange()
            client.client = mock_instance
            
            result = client.place_bets(sample_bets)
            
            # Verify actual API was called (twice, once per market)
            assert mock_instance.betting.place_orders.call_count == 2
            assert result["status"] == "SUCCESS"


def test_get_balance(mock_betfair_client):
    """Test getting account balance."""
    from third_party.betting_platforms.betfair_exchange.client import BetfairExchange
    
    with patch.dict(os.environ, {
        'BETFAIR_USERNAME': 'test_user',
        'BETFAIR_PASSWORD': 'test_pass',
        'BETFAIR_APP_KEY': 'test_key',
        'BETFAIR_CERTS_PATH': '/tmp/test_certs'
    }):
        with patch('betfairlightweight.APIClient') as MockAPIClient:
            MockAPIClient.return_value = mock_betfair_client
            
            client = BetfairExchange()
            balance = client.get_balance()
            
            assert balance["available_balance"] == 100.0
            assert "exposure" in balance
            assert "retained_commission" in balance


def test_search_market():
    """Test market search functionality."""
    from third_party.betting_platforms.betfair_exchange.client import BetfairExchange
    
    with patch.dict(os.environ, {
        'BETFAIR_USERNAME': 'test_user',
        'BETFAIR_PASSWORD': 'test_pass',
        'BETFAIR_APP_KEY': 'test_key',
        'BETFAIR_CERTS_PATH': '/tmp/test_certs'
    }):
        with patch('betfairlightweight.APIClient') as MockAPIClient:
            mock_client = MockAPIClient.return_value
            
            # Mock event types
            mock_event_type = Mock()
            mock_event_type.event_type.id = "1"
            mock_client.betting.list_event_types.return_value = [mock_event_type]
            
            # Mock competitions - return exact match
            mock_competition = Mock()
            mock_competition.competition.id = "comp_123"
            mock_competition.competition.name = "Test League"
            mock_client.betting.list_competitions.return_value = [mock_competition]
            
            # Mock market catalogue as dicts (since lightweight=True is used)
            mock_market = {
                "marketId": "1.123",
                "marketStartTime": "2025-01-01T15:00:00Z",
                "event": {"name": "Test Match"},
                "competition": {"name": "Test League"},
                "description": {"marketType": "MATCH_ODDS"},
                "runners": [
                    {"selectionId": 12345, "runnerName": "Team A"}
                ]
            }
            
            mock_client.betting.list_market_catalogue.return_value = [mock_market]
            
            # Mock market books (also dicts or objects with runners as objects, but let's mock the necessary parts)
            mock_book = Mock()
            mock_book.market_id = "1.123"
            mock_book.total_matched = 1000
            mock_runner_book = Mock()
            mock_runner_book.selection_id = 12345
            mock_price = Mock()
            mock_price.price = 2.5
            mock_runner_book.ex.available_to_back = [mock_price]
            mock_book.runners = [mock_runner_book]
            
            mock_client.betting.list_market_book.return_value = [mock_book]
            
            client = BetfairExchange()
            results = client.search_market("Soccer", ["Test League"])
            
            assert len(results) > 0
            assert results[0]["name"] == "Test Match"
