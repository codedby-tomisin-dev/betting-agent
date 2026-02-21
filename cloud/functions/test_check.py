import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Setup paths and environment variables
sys.path.append(os.path.dirname(__file__))
os.environ["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080"
os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099"
os.environ["GCLOUD_PROJECT"] = "skilful-sphere-392008"

from core.modules.betting.manager import BettingManager

manager = BettingManager()
placed_bets = manager.repo.get_placed_bets()
print(f"Found {len(placed_bets)} placed bets")

for bet in placed_bets:
    print(f"Bet ID: {bet.get('id')}")
    print(f"Placements: {bet.get('placement_results', {}).get('bets', [])}")
    
res = manager.check_bet_results()
print("Result of check_bet_results:", res)

placed_bets_after = manager.repo.get_placed_bets()
for bet in placed_bets_after:
    print(f"Bet ID: {bet.get('id')} -> Status: {bet.get('status')}")

