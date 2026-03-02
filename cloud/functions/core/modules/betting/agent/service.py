from typing import List

from third_party.betting_platforms.models import Event

from . import betting_agent, AgentDeps
from ..models import BettingAgentResponse
from core.modules.wallet.service import WalletService
from core.modules.betting.repository import BetRepository
from core.modules.betting.betfair_service import BetfairService


def _format_events(events: List[Event]) -> str:
    """Render the list of events + markets into a flat string for the agent."""
    lines = []
    for event in events:
        metadata = event.metadata or {}
        is_reliable_team = metadata.get("is_reliable_team", False)
        is_reliable_comp = metadata.get("is_reliable_competition", False)
        flags = []
        if is_reliable_team: flags.append("Popular Team")
        if is_reliable_comp: flags.append("Popular Competition")
        flag_str = f" [{', '.join(flags)}]" if flags else ""

        block = f"Event: {event.event_name} ({event.competition_name}){flag_str} - {event.event_time}\n"
        for option in event.options:
            block += f"  Market: {option.name} (ID: {option.market_id})\n"
            for selection in option.options:
                block += f"    - Selection: {selection.name}, Odds: {selection.odds}, ID: {selection.selection_id}\n"
        lines.append(block)
    return "\n".join(lines)


def make_bet_selections(
    events: List[Event],
    budget: float,
    min_profit: float,
    risk_appetite: float,
    wallet_service: WalletService,
    bet_repo: BetRepository,
    betfair_service: BetfairService,
    learnings_section: str = "",
) -> BettingAgentResponse:
    """
    Build the odds-analysis prompt and run the betting agent.

    All events are evaluated purely from their market odds — no external
    intelligence is gathered. The agent uses its built-in handbook rules
    to infer match dynamics from the odds structure.
    """
    all_events_str = _format_events(events)
    min_valid_odds = 1.0 + (min_profit / budget) if budget > 0 else 1.0
    risk_level = round(risk_appetite)

    prompt = f"""Analyze the odds for these matches and provide your best betting recommendations.

=== AVAILABLE BETS ===
{all_events_str}

CRITICAL RULES:
1. Deduce the expected match dynamics purely from the odds structure.
2. Select up to 3 bet recommendations that offer the best value-probability mix.
3. Each chosen bet MUST generate a profit of AT LEAST ${min_profit:.2f}.
4. Total stake across all bets MUST NOT exceed the budget of ${budget:.2f}.
5. Allocate the budget wisely — stake more on shorter (safer) odds, less on longer odds.
6. **NAMES — COPY VERBATIM, DO NOT INTERPRET:**
   You MUST use `event_name`, `market_name`, and `option_name` exactly as they appear above.
   Any mismatch will cause the bet to fail. Copy the string. Do not reformat it.

USER PREFERENCES (STRICTLY ADHERE TO THESE):
- Risk Appetite: {risk_appetite}/5.0 -> Use Risk Level {risk_level} from your guidelines.
- Budget: ${budget:.2f} (This is the TOTAL budget for all selected bets combined)
- Minimum Profit Per Selection: ${min_profit:.2f}
- Mathematical Minimum Odds: {min_valid_odds:.2f} (You CANNOT select odds lower than this)
{f"""
=== LEARNINGS FROM PREVIOUS BETS ===
(These are lessons distilled from past results. Use them to avoid repeating mistakes and reinforce what has worked.)
{learnings_section}
""" if learnings_section else ""}"""


    deps = AgentDeps(wallet_service=wallet_service, bet_repo=bet_repo, betfair_service=betfair_service)
    result = betting_agent.run_sync(prompt, deps=deps)
    return result.output
