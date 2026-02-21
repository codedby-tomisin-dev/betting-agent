import os
# Must load dotenv
from dotenv import load_dotenv
load_dotenv(".env")
os.environ["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080"

from firebase_admin import initialize_app

try:
    initialize_app()
except ValueError:
    pass

from core.modules.learnings.manager import LearningsManager

bet_data = {
    "id": "test_script_run",
    "target_date": "2026-02-21",
    "ai_reasoning": "This bet is on Arsenal against a weak team. They are the clear favorite.",
    "events": [
        {"name": "Arsenal vs Weak Team", "competition": {"name": "Premier League"}}
    ],
    "selections": {
        "items": [
            {
                "market": "Match Odds", 
                "odds": 1.25, 
                "stake": 20, 
                "side": "BACK",
            }
        ]
    },
    "settlement_results": [
        {"profit": -20, "status": "LOST"}
    ]
}

print("Running LearningsManager...")
manager = LearningsManager()
manager.analyze_finished_bet(bet_data)
print("Finished!")
