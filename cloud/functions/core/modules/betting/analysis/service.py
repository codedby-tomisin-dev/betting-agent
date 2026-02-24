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

    def _build_fallback_recommendation(
        self, event: Event, min_profit: float, budget: float
    ) -> "BettingAgentResponse.BetRecommendation | None":
        """
        For unrecognized leagues, randomly selects a structurally safe goal ceiling market.
        Returns None if no suitable option is found or the stake fails validation.
        """
        fallback_targets = [
            ("OVER_UNDER_05", "Over 0.5 Goals"),
            ("OVER_UNDER_55", "Under 5.5 Goals"),
            ("OVER_UNDER_65", "Under 6.5 Goals"),
        ]
        random.shuffle(fallback_targets)

        selected_option = None
        selected_market = None

        for market_name, option_name in fallback_targets:
            for market in event.options:
                if market.name == market_name:
                    for opt in market.options:
                        if opt.name == option_name:
                            selected_option = opt
                            selected_market = market
                            break
                if selected_option:
                    break
            if selected_option:
                break

        if not selected_option or not selected_market:
            return None

        # Stake is calculated to just exceed min_profit. Rounded up to avoid float imprecision.
        stake = (min_profit + 0.1) / (selected_option.odds - 1) if selected_option.odds > 1.0 else 0
        stake = math.ceil(stake)
        stake = min(stake, budget)
        stake = max(stake, 1.0)

        if not self._is_valid_bet(stake, selected_option.odds):
            logger.info(
                f"Fallback {selected_option.name} @ {selected_option.odds} skipped: "
                f"stake {stake:.2f} failed validation."
            )
            return None

        return BettingAgentResponse.BetRecommendation(
            pick=BettingAgentResponse.BetRecommendation.Pick(
                event_name=event.event_name,
                market_name=selected_market.name,
                option_name=selected_option.name,
            ),
            market_id=selected_market.market_id,
            selection_id=selected_option.selection_id,
            stake=round(stake, 2),
            odds=selected_option.odds,
            side="BACK",
            reasoning=(
                "Scripted fallback: Low-information match in unrecognized league. "
                "Structurally safe goal ceiling chosen."
            ),
            stake_justification=f"Minimum profit requirement dictated a ${stake:.2f} stake.",
        )

    def _partition_events(
        self, events: List[Event]
    ) -> tuple[List[Event], List[Event]]:
        """Split events into reliable (route to AI) and unreliable (route to fallback)."""
        reliable, unreliable = [], []
        for event in events:
            is_reliable = event.competition_name in RELIABLE_COMPETITIONS or any(
                team in event.event_name for team in RELIABLE_ALL_TEAMS
            )
            (reliable if is_reliable else unreliable).append(event)
        return reliable, unreliable

    def analyze_betting_opportunities(self, request: AnalyzeBetsRequest) -> Dict[str, Any]:
        """
        Analyze betting opportunities using AI agents with web research.

        Events in recognized leagues are sent to the full AI sourcing + decision pipeline.
        Events in unrecognized leagues receive a scripted fallback recommendation.

        Returns a dict with keys: total_stake, total_returns, selections, overall_reasoning.
        """
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

        # --- Scripted fallbacks for unreliable events ---
        fallback_recommendations = []
        for event in unreliable_events:
            logger.info(
                f"Event '{event.event_name}' not in reliable leagues. Applying scripted fallback."
            )
            rec = self._build_fallback_recommendation(event, request.min_profit, request.budget)
            if rec:
                fallback_recommendations.append(rec)

        logger.info(
            f"Routing {len(reliable_events)} events to AI, "
            f"generated {len(fallback_recommendations)} fallback recommendations."
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
