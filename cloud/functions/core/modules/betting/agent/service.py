from typing import List

from third_party.betting_platforms.models import Event

from . import betting_agent
from ..models import BettingAgentResponse


def _format_events(events: List[Event]) -> str:
    """Render the list of events + markets into a flat string for the decision agent."""
    lines = []
    for event in events:
        block = f"Event: {event.event_name} ({event.competition_name}) - {event.event_time}\n"
        for option in event.options:
            block += f"  Market: {option.name} (ID: {option.market_id})\n"
            for selection in option.options:
                block += f"    - Selection: {selection.name}, Odds: {selection.odds}, ID: {selection.selection_id}\n"
        lines.append(block)
    return "\n".join(lines)


def _build_decision_prompt(
    events: List[Event],
    intelligence_section: str,
    budget: float,
    min_profit: float,
    risk_appetite: float,
    learnings_section: str = "",
) -> str:
    risk_level = round(risk_appetite)
    all_events_str = _format_events(events)
    intelligence_block = (
        intelligence_section
        if intelligence_section
        else "No intelligence available — apply Low-Information rules from the Handbook."
    )

    return f"""Analyze these betting opportunities and provide exactly 3 best betting recommendations.

=== AVAILABLE BETS ===
{all_events_str}

=== PRE-RESEARCHED INTELLIGENCE ===
(This intelligence was gathered by a dedicated sourcing agent. Use it as the basis for your probability estimates — do NOT call any external tools.)
{intelligence_block}

CRITICAL REQUIREMENTS:
1. Select between 1 and 3 bets (at least 1, up to 3) that offer the best value across ALL events provided.
2. The total stake of all selected bets MUST NOT exceed ${budget:.2f}.
3. Allocate the budget wisely among your selected bets based on confidence and value.
4. Each selection MUST generate a profit of AT LEAST ${min_profit:.2f} (Profit = Stake * (Odds - 1)).
5. **NAMES — COPY VERBATIM, DO NOT INTERPRET:**
   You MUST use `event_name`, `market_name`, and `option_name` exactly as they appear above.
   - "Tottenham v Arsenal" must stay "Tottenham v Arsenal" — NOT "Tottenham vs Arsenal"
   - "OVER_UNDER_25" must stay "OVER_UNDER_25" — NOT "Over/Under 2.5"
   - "Under 2.5 Goals" must stay "Under 2.5 Goals" — NOT "Under 2.5"
   Any mismatch will cause the bet to fail. Copy the string. Do not reformat it.
{learnings_section}

USER PREFERENCES (STRICTLY ADHERE TO THESE):
- Risk Appetite: {risk_appetite}/5.0 -> Use Risk Level {risk_level} from your Handbook.
- Budget: ${budget:.2f} (This is the TOTAL budget for all selected bets combined)
- Minimum Profit Per Selection: ${min_profit:.2f}
"""


def make_bet_selections(
    events: List[Event],
    intelligence_section: str,
    budget: float,
    min_profit: float,
    risk_appetite: float,
    learnings_section: str = "",
) -> BettingAgentResponse:
    """
    Build the decision prompt and run the betting agent in one step.

    The manager calls this with the raw inputs; prompt construction
    is an internal detail of the agent module.
    """
    prompt = _build_decision_prompt(
        events=events,
        intelligence_section=intelligence_section,
        budget=budget,
        min_profit=min_profit,
        risk_appetite=risk_appetite,
        learnings_section=learnings_section,
    )
    result = betting_agent.run_sync(prompt)
    return result.output
