import os

BRAVE_SEARCH_API_KEY = os.getenv('BRAVE_SEARCH_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
OPEN_AI_API_KEY = os.getenv('OPEN_AI_API_KEY')

# Automated betting configuration
AUTOMATED_BETTING_OPTIONS = {
    "BANKROLL_PERCENT": 50,  # Percentage of balance to use for betting
    "MAX_BANKROLL": 5000,     # Maximum amount to use even if balance is higher
    "RISK_APPETITE": 1.5,     # Conservative risk level (1-5 scale)
    "USE_RELIABLE_TEAMS": True,
    "MIN_STAKE": 0,         # Minimum stake per bet (Betfair requirement)
    "MIN_PROFIT": 0,        # Minimum profit per bet
    "MIN_MATCHED_LIQUIDITY": 500, # Minimum volume required on a market to participate
    "DEFAULT_BUDGET": 100
}

# Reliable teams by competition (competitions derived from keys at runtime)
RELIABLE_TEAMS = {
    "English Premier League": [
        "Man City",      # CL winners + dominant EPL over last cycles
        "Liverpool",            # Regular top-4 + European deep runs
        "Arsenal",              # Sustained top-tier performance
        "Chelsea",              # Still strong enough for top markets
        "Man Utd",
        "Aston Villa"
    ],

    "English Football League Cup": [
        "Man City",
        "Arsenal",
        "Liverpool",
        "Chelsea",
        "Man Utd"
    ],

    "FA Cup": [
        "Man City",      # CL winners + dominant EPL over last cycles
        "Arsenal",              # Sustained top-tier performance
        "Aston Villa",
        "Brentford",
        "Brighton"
    ],

    "Spanish La Liga": [
        "Real Madrid",          # Strongest club in Europe by UEFA coefficient
        "Barcelona",            # Elite club still top for titles/bets
        "Atletico Madrid"       # Often competitive domestically & Europe
    ],

    "Italian Serie A": [
        "Inter Milan",          # CL/Scudetto contender
        "AC Milan",             # Historically elite & competitive
        "Napoli",               # Strong recent league performances
        "Roma"                  # Often in European spots
    ],

    "German Bundesliga": [
        "Bayern Munich",        # Historic domestic + Europa/CL presence
        "Borussia Dortmund"     # UCL finalists + strong German side
    ],

    "French Ligue 1": [
        "Paris St-G"   # Domestic powerhouse + European wins
    ],

    "UEFA Champions League": [
        "Real Madrid",          # Record CL winners & top UEFA coefficient
        "Man City",      # Champions League winners recently
        "Paris St-G",  # CL winners + elite squad value
        "Bayern Munich",        # Regular deep runs & domestic dominance
        "Liverpool",            # Frequent deep CL knockout presence
        "Inter Milan",          # Strong continental coefficient presence
        "Barcelona"             # Still a CL threat most seasons
    ]
}

# Derived from RELIABLE_TEAMS — computed once at import time
RELIABLE_COMPETITIONS = list(RELIABLE_TEAMS.keys())
RELIABLE_ALL_TEAMS = [team for teams in RELIABLE_TEAMS.values() for team in teams]

