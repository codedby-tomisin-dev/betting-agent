import os
import json
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Load env vars before importing agent modules
load_dotenv()

from core.modules.betting.manager import BettingManager
from core.modules.betting.models import AnalyzeBetsRequest
from core.modules.settings.models import BettingSettings
from core import logger

class MockLearningsManager:
    """Mock to prevent Firestore calls during local testing."""
    def get_current_learnings(self) -> str:
        return "Always check if key players are injured."

class MockBetRepository:
    def get_all_finished_bets(self, limit=5):
        return [
            {
                "id": "1",
                "status": "finished",
                "balance": {"starting": 100.0, "ending": 110.5},
                "selections": {"wager": {"odds": 1.8, "stake": 10.0}}
            },
            {
                "id": "2",
                "status": "finished",
                "balance": {"starting": 110.5, "ending": 118.0},
                "selections": {"wager": {"odds": 1.5, "stake": 15.0}}
            }
        ]

class MockWalletService:
    def get_available_balance(self):
        return 118.0


class MockSettingsManager:
    def get_betting_settings(self) -> BettingSettings:
        return BettingSettings(
            bankroll_percent=5.0,
            max_bankroll=100.0,
            risk_appetite=2.0,
            use_reliable_teams=False,
            min_stake=1.0,
            min_profit=2.0,
            default_budget=20.0
        )

class MockBetfairService:
    pass

def main():
    # Construct a mock event
    mock_event = {
            "provider_event_id": "35240883",
            "name": "Everton v Man Utd",
            "time": "2026-02-23T20:00:00.000Z",
            "competition": {
                "name": "English Premier League"
            },
            "options": [
                {
                    "name": "BOTH_TEAMS_TO_SCORE",
                    "market_id": "1.253758757",
                    "options": [
                        {
                            "name": "Yes",
                            "odds": 1.71,
                            "selection_id": 30246
                        },
                        {
                            "name": "No",
                            "odds": 2.36,
                            "selection_id": 110503
                        }
                    ]
                },
                {
                    "name": "DOUBLE_CHANCE",
                    "market_id": "1.253758760",
                    "options": [
                        {
                            "name": "Home or Draw",
                            "odds": 1.96,
                            "selection_id": 6384646
                        },
                        {
                            "name": "Draw or Away",
                            "odds": 1.32,
                            "selection_id": 6384647
                        },
                        {
                            "name": "Home or Away",
                            "odds": 1.34,
                            "selection_id": 6384648
                        }
                    ]
                },
                {
                    "name": "MATCH_ODDS",
                    "market_id": "1.253758758",
                    "options": [
                        {
                            "name": "Everton",
                            "odds": 4.0,
                            "selection_id": 56343
                        },
                        {
                            "name": "Man Utd",
                            "odds": 2.02,
                            "selection_id": 48351
                        },
                        {
                            "name": "The Draw",
                            "odds": 3.85,
                            "selection_id": 58805
                        }
                    ]
                },
                {
                    "name": "OVER_UNDER_65",
                    "market_id": "1.253758766",
                    "options": [
                        {
                            "name": "Under 6.5 Goals",
                            "odds": 1.02,
                            "selection_id": 2542448
                        },
                        {
                            "name": "Over 6.5 Goals",
                            "odds": 36.0,
                            "selection_id": 2542449
                        }
                    ]
                },
                {
                    "name": "OVER_UNDER_45",
                    "market_id": "1.253758698",
                    "options": [
                        {
                            "name": "Under 4.5 Goals",
                            "odds": 1.19,
                            "selection_id": 1222347
                        },
                        {
                            "name": "Over 4.5 Goals",
                            "odds": 6.2,
                            "selection_id": 1222346
                        }
                    ]
                },
                {
                    "name": "OVER_UNDER_25",
                    "market_id": "1.253758697",
                    "options": [
                        {
                            "name": "Under 2.5 Goals",
                            "odds": 2.2,
                            "selection_id": 47972
                        },
                        {
                            "name": "Over 2.5 Goals",
                            "odds": 1.81,
                            "selection_id": 47973
                        }
                    ]
                },
                {
                    "name": "OVER_UNDER_05",
                    "market_id": "1.253758763",
                    "options": [
                        {
                            "name": "Under 0.5 Goals",
                            "odds": 17.0,
                            "selection_id": 5851482
                        },
                        {
                            "name": "Over 0.5 Goals",
                            "odds": 1.06,
                            "selection_id": 5851483
                        }
                    ]
                },
                {
                    "name": "OVER_UNDER_15",
                    "market_id": "1.253758701",
                    "options": [
                        {
                            "name": "Under 1.5 Goals",
                            "odds": 4.5,
                            "selection_id": 1221385
                        },
                        {
                            "name": "Over 1.5 Goals",
                            "odds": 1.26,
                            "selection_id": 1221386
                        }
                    ]
                },
                {
                    "name": "OVER_UNDER_55",
                    "market_id": "1.253758768",
                    "options": [
                        {
                            "name": "Under 5.5 Goals",
                            "odds": 1.07,
                            "selection_id": 1485567
                        },
                        {
                            "name": "Over 5.5 Goals",
                            "odds": 14.0,
                            "selection_id": 1485568
                        }
                    ]
                },
                {
                    "name": "OVER_UNDER_35",
                    "market_id": "1.253758710",
                    "options": [
                        {
                            "name": "Under 3.5 Goals",
                            "odds": 1.47,
                            "selection_id": 1222344
                        },
                        {
                            "name": "Over 3.5 Goals",
                            "odds": 3.05,
                            "selection_id": 1222345
                        }
                    ]
                }
            ]
        }
        
    mock_event_unknown = {
            "provider_event_id": "9999999",
            "name": "Botev Plovdiv v Ludogorets",
            "time": "2026-02-23T20:00:00.000Z",
            "competition": {
                "name": "Bulgarian First League"
            },
            "options": mock_event["options"]
    }
    
    request_data = {
        "events": [mock_event, mock_event_unknown],
        "risk_appetite": 2.0,
        "budget": 200.0,
        "min_profit": 2.0
    }
    
    print("Initializing BettingManager with mocked storage dependencies...")
    request = AnalyzeBetsRequest(**request_data)
    
    # Pass mock managers into the BettingManager via dependency injection
    manager = BettingManager(
        betfair_service=MockBetfairService(),
        bet_repo=MockBetRepository(),
        settings_manager=MockSettingsManager(),
        learnings_manager=MockLearningsManager(),
        suggestion_repo=MockBetRepository(),
        wallet_service=MockWalletService(),
    )
    
    print("\nStarting analysis...")
    print(f"Target match: {mock_event['name']} ({mock_event['competition']['name']})")
    
    try:
        result = manager.analyze_betting_opportunities(request)
        print("\n--- ANALYSIS COMPLETE ---")
        print("\nOverall Reasoning:")
        print(result.get("overall_reasoning"))
        
        print("\nRecommendations:")
        for rec in result.get("recommendations", []):
            print(f"- {rec['pick']['event_name']} | {rec['pick']['market_name']} | {rec['pick']['option_name']}")
            print(f"  Stake: ${rec['stake']} @ {rec['odds']}")
            print(f"  Confidence: {rec['confidence_rating']}/5")
            print(f"  Reasoning: {rec['reasoning']}")
            
        print("\nRaw JSON output:")
        print(json.dumps(result, indent=2, default=str))
        
    except Exception as e:
        logger.exception("Analysis failed")
        print(f"\nError: {e}")

if __name__ == "__main__":
    main()
