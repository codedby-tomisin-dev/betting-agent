import math
import random
from typing import Dict, Any, List

from core import logger
from core.modules.betting.agent.service import make_bet_selections
from core.modules.betting.sourcing.service import gather_intelligence
from core.modules.betting.models import AnalyzeBetsRequest, BettingAgentResponse
from core.modules.settings.manager import SettingsManager
from core.modules.learnings.manager import LearningsManager
from constants import RELIABLE_ALL_TEAMS, RELIABLE_COMPETITIONS
from third_party.betting_platforms.models import Event


class BettingAnalysisService:
    """Handles AI-driven betting analysis: event routing, intelligence sourcing, and decision making."""

    def __init__(self, settings_manager: SettingsManager, learnings_manager: LearningsManager):
        self.settings_manager = settings_manager
        self.learnings_manager = learnings_manager

    def _is_valid_bet(self, stake: float, odds: float) -> bool:
        """Return True if a bet meets the minimum stake and profit requirements."""
        settings = self.settings_manager.get_betting_settings()
        return stake >= settings.min_stake and stake * (odds - 1) >= settings.min_profit

    def _partition_events(
        self, events: List[Event]
    ) -> tuple[List[Event], List[Event]]:
        """Split events into reliable (AI pipeline) and unreliable (scripted fallback)."""
        reliable, unreliable = [], []
        for event in events:
            is_reliable = event.competition_name in RELIABLE_COMPETITIONS or any(
                team in event.event_name for team in RELIABLE_ALL_TEAMS
            )
            (reliable if is_reliable else unreliable).append(event)
        return reliable, unreliable

    def _select_fallback_event(
        self, reliable: List[Event], unreliable: List[Event]
    ) -> List[Event]:
        """
        When no reliable events are found, fall back to one randomly selected
        unreliable event rather than skipping entirely.
        """
        if reliable or not unreliable:
            return unreliable  # use all unreliable events for scripted fallbacks as normal

        chosen = random.choice(unreliable)
        logger.info(
            f"No reliable events found. Randomly selected '{chosen.event_name}' "
            "from unreliable pool as sole fallback."
        )
        return [chosen]

    def _filter_fallback_markets(self, events: List[Event]) -> List[Event]:
        """
        Create copies of events containing only the safe goal ceiling markets
        to prevent the fallback agent from getting confused by or selecting
        unsupported markets like Match Odds.
        """
        allowed_markets = ["Over 0.5 Goals", "Under 4.5 Goals", "Under 5.5 Goals", "Under 6.5 Goals"]
        filtered_events = []
        for event in events:
            # Create a shallow copy of the event to avoid mutating the original request
            from copy import copy
            filtered_event = copy(event)
            filtered_options = []
            for market in event.options:
                filtered_market = copy(market)
                filtered_market.options = [opt for opt in market.options if opt.name in allowed_markets]
                if filtered_market.options:
                    filtered_options.append(filtered_market)
            filtered_event.options = filtered_options
            if filtered_options:
                filtered_events.append(filtered_event)
        return filtered_events

    def analyze_betting_opportunities(self, request: AnalyzeBetsRequest) -> Dict[str, Any]:
        """
        Analyze betting opportunities using AI agents with web research.

        Routing rules:
        - Reliable events  → full AI sourcing + decision pipeline.
        - Unreliable events → Fallback AI (odds-based deduction on safe goal-ceilings).
        - If *no* reliable events exist → one random unreliable event gets the fallback.

        Returns a dict with keys: total_stake, total_returns, selections, overall_reasoning.
        """
        from core.modules.betting.agent.service import make_fallback_selections

        try:
            events = [Event(**event) for event in request.events]
        except Exception as e:
            logger.error(f"Failed to parse events: {e}")
            raise ValueError(f"Invalid event data: {str(e)}")

        try:
            learnings_markdown = self.learnings_manager.get_current_learnings()
        except Exception as e:
            logger.error(f"Failed to fetch learnings: {e}")
            learnings_markdown = ""

        learnings_section = (
            f"\n\n    === HISTORICAL LEARNINGS ===\n    {learnings_markdown}\n"
            "    (Use these learnings to avoid past mistakes and validate your reasoning)"
            if learnings_markdown
            else ""
        )

        reliable_events, unreliable_events = self._partition_events(events)
        fallback_events = self._select_fallback_event(reliable_events, unreliable_events)

        # --- AI Fallback pipeline ---
        fallback_recommendations = []
        if fallback_events:
            logger.info(
                f"Routing {len(fallback_events)} low-information events to Fallback AI."
            )
            filtered_fallbacks = self._filter_fallback_markets(fallback_events)
            if filtered_fallbacks:
                try:
                    fallback_response = make_fallback_selections(
                        events=filtered_fallbacks,
                        budget=request.budget,
                        min_profit=request.min_profit,
                    )
                    for rec in fallback_response.recommendations:
                        if self._is_valid_bet(rec.stake, rec.odds):
                            fallback_recommendations.append(rec)
                        else:
                            potential_profit = rec.stake * (rec.odds - 1)
                            logger.warning(
                                f"Skipping Fallback AI rec — stake: {rec.stake}, "
                                f"profit: {potential_profit:.3f} — {rec.pick.event_name}"
                            )
                except Exception as e:
                    logger.error(f"Error analyzing fallback events: {e}")

        logger.info(
            f"Routing {len(reliable_events)} events to standard AI, "
            f"yielded {len(fallback_recommendations)} fallback recommendations."
        )

        # --- AI pipeline for reliable events ---
        ai_recommendations = []
        overall_reasoning = ""

        if reliable_events:
            intelligence_section = gather_intelligence(reliable_events)
            try:
                response_data: BettingAgentResponse = make_bet_selections(
                    events=reliable_events,
                    intelligence_section=intelligence_section,
                    budget=request.budget,
                    min_profit=request.min_profit,
                    risk_appetite=request.risk_appetite,
                    learnings_section=learnings_section,
                )
                overall_reasoning = response_data.overall_reasoning
                for rec in response_data.recommendations:
                    if self._is_valid_bet(rec.stake, rec.odds):
                        ai_recommendations.append(rec)
                    else:
                        potential_profit = rec.stake * (rec.odds - 1)
                        logger.warning(
                            f"Skipping AI rec — stake: {rec.stake}, "
                            f"profit: {potential_profit:.3f} — {rec.pick.event_name}"
                        )
            except Exception as e:
                logger.error(f"Error analyzing events: {e}")
                overall_reasoning = f"Failed to analyze events — {str(e)}"

        all_recommendations = ai_recommendations + fallback_recommendations

        # --- Budget enforcement ---
        total_stake = sum(rec.stake for rec in all_recommendations)
        if total_stake > request.budget:
            scale_factor = request.budget / total_stake
            logger.warning(
                f"Total stake ${total_stake:.2f} exceeds budget ${request.budget:.2f}. "
                f"Scaling down by {scale_factor:.2%}"
            )
            for rec in all_recommendations:
                rec.stake = rec.stake * scale_factor
            total_stake = request.budget

        total_returns = sum(rec.stake * rec.odds for rec in all_recommendations)
        total_odds = total_returns / total_stake if total_stake > 0 else 0

        # --- Build selections output ---
        selections_items = []
        for rec in all_recommendations:
            original_event = next(
                (e for e in events if e.event_name == rec.pick.event_name), None
            )
            if not original_event:
                logger.warning(
                    f"Could not find exact event match for '{rec.pick.event_name}'. "
                    "Using fallback event data."
                )
                event_data = {
                    "name": rec.pick.event_name,
                    "time": None,
                    "competition": {"name": "Unknown"},
                }
            else:
                event_data = {
                    "name": rec.pick.event_name,
                    "time": original_event.event_time,
                    "competition": {"name": original_event.competition_name},
                }

            selections_items.append({
                "event": event_data,
                "market": rec.pick.option_name,
                "odds": rec.odds,
                "stake": rec.stake,
                "market_id": rec.market_id,
                "selection_id": rec.selection_id,
                "side": rec.side,
                "reasoning": rec.reasoning,
                "stake_justification": getattr(rec, "stake_justification", None),
            })

        return {
            "total_stake": total_stake,
            "total_returns": total_returns,
            "selections": {
                "items": selections_items,
                "wager": {
                    "odds": round(total_odds, 2),
                    "stake": round(total_stake, 2),
                    "potential_returns": total_returns,
                },
            },
            "overall_reasoning": overall_reasoning,
        }
