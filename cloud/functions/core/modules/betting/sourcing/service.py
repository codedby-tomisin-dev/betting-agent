from typing import Dict, List

from pydantic_ai import UsageLimits
from core import logger
from core.modules.betting.models import MatchIntelligenceReport
from third_party.betting_platforms.models import Event

from . import sourcing_agent


def _format_intelligence_report(event_name: str, report: MatchIntelligenceReport) -> str:
    """Render a single MatchIntelligenceReport into a flat, readable string for the decision agent."""
    lines = [
        f"\n\n== INTELLIGENCE REPORT: {event_name} ==",
        f"Data Confidence: {report.data_confidence}",
        f"Match Context: {report.match_context}",
        f"Competition: {report.competition_name}",
    ]

    for label, team in [("HOME", report.home_team), ("AWAY", report.away_team)]:
        lines.append(f"\n{label}: {team.name} (Position: {team.league_position or 'Unknown'})")
        lines.append(f"  Form Last 5: {team.form_last_5}")
        lines.append(f"  Goals Scored / Conceded (last 5): {team.goals_scored_last_5} / {team.goals_conceded_last_5}")
        if team.key_injuries:
            lines.append(f"  Injuries: {', '.join(team.key_injuries)}")
        if team.key_suspensions:
            lines.append(f"  Suspensions: {', '.join(team.key_suspensions)}")
        if team.is_rotating:
            lines.append("  ⚠ Rotation confirmed")
        if team.goalkeeper_is_backup:
            lines.append("  ⚠ Backup goalkeeper starting")
        if team.morale_notes:
            lines.append(f"  Morale: {team.morale_notes}")

    h2h = f"\nH2H: {report.h2h_summary}"
    if report.h2h_avg_goals is not None:
        h2h += f" | Avg Goals: {report.h2h_avg_goals:.1f}"
    if report.h2h_btts_rate is not None:
        h2h += f" | BTTS Rate: {report.h2h_btts_rate:.0%}"
    lines.append(h2h)

    if report.referee_name:
        ref_line = f"Referee: {report.referee_name}"
        if report.referee_cards_per_game:
            ref_line += f" ({report.referee_cards_per_game:.1f} cards/game avg)"
        lines.append(ref_line)

    if report.weather_concern:
        lines.append(f"Weather: {report.weather_concern}")

    lines.append(f"Sourcing Notes: {report.sourcing_notes}")
    return "\n".join(lines)


def _build_sourcing_prompt(event: Event, home_team: str, away_team: str) -> str:
    return (
        f"Gather all available intelligence for the following match:\n\n"
        f"Match: {event.event_name}\n"
        f"Home Team: {home_team}\n"
        f"Away Team: {away_team}\n"
        f"Competition: {event.competition_name}\n"
        f"Kick-off: {event.event_time}\n\n"
        f"Use all available tools to research this match and return a complete MatchIntelligenceReport."
    )


def gather_intelligence(events: List[Event]) -> str:
    """
    Run the sourcing agent for every event and return a formatted intelligence block
    ready to be embedded in the decision agent's prompt.

    Each event is researched independently. Failures are logged and skipped — the
    decision agent falls back to low-information rules for any events with no report.

    Args:
        events: Parsed Event objects to source intelligence for.

    Returns:
        A single string containing all intelligence reports, or an empty string if
        sourcing failed for all events.
    """
    sections: List[str] = []

    for event in events:
        parts = event.event_name.replace(" vs ", " v ").split(" v ", 1)
        home_team = parts[0].strip() if len(parts) == 2 else event.event_name
        away_team = parts[1].strip() if len(parts) == 2 else event.event_name

        prompt = _build_sourcing_prompt(event, home_team, away_team)

        try:
            logger.info(f"Sourcing agent running for {event.event_name}")
            result = sourcing_agent.run_sync(prompt, usage_limits=UsageLimits(request_limit=10))
            report: MatchIntelligenceReport = result.output
            logger.info(f"Sourcing complete for {event.event_name} — confidence: {report.data_confidence}")
            sections.append(_format_intelligence_report(event.event_name, report))
        except Exception as e:
            logger.error(f"Sourcing agent failed for {event.event_name}: {e}")
            # Omit this event — decision agent will notice missing intelligence

    return "\n".join(sections)
