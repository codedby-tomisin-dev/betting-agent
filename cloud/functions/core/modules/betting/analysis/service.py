import math
from typing import Dict, Any, List

from core import logger
from core.modules.betting.agent.service import make_bet_selections
from core.modules.betting.models import AnalyzeBetsRequest, BettingAgentResponse
from core.modules.settings.manager import SettingsManager
from core.modules.learnings.manager import LearningsManager
from core.modules.wallet.service import WalletService
from core.modules.betting.repository import BetRepository
from third_party.betting_platforms.models import Event
from core.modules.betting.betfair_service import BetfairService


class BettingAnalysisService:
    """Handles AI-driven betting analysis: passes events to the odds-analysis agent."""

    def __init__(
        self,
        settings_manager: SettingsManager,
        learnings_manager: LearningsManager,
        wallet_service: WalletService = None,
        bet_repo: BetRepository = None,
        betfair_service: BetfairService = None
    ):
        self.settings_manager = settings_manager
        self.learnings_manager = learnings_manager
        self.wallet_service = wallet_service or WalletService()
        self.bet_repo = bet_repo or BetRepository()
        self.betfair_service = betfair_service or BetfairService()

    def _is_valid_bet(self, stake: float, odds: float) -> bool:
        """Return True if a bet meets the minimum stake and profit requirements."""
        settings = self.settings_manager.get_betting_settings()
        return stake >= settings.min_stake and stake * (odds - 1) >= settings.min_profit

    def analyze_betting_opportunities(self, request: AnalyzeBetsRequest) -> Dict[str, Any]:
        """
        Analyze betting opportunities using the odds-analysis agent.

        All events are passed directly to the agent which deduces match
        dynamics purely from the market odds — no web research performed.

        Returns a dict with keys: total_stake, total_returns, selections, overall_reasoning.
        """
        try:
            events = [Event(**event) for event in request.events]
        except Exception as e:
            logger.error(f"Failed to parse events: {e}")
            raise ValueError(f"Invalid event data: {str(e)}")

        logger.info(f"Routing {len(events)} events to odds-analysis agent.")

        learnings_section = ""
        try:
            learnings_section = self.learnings_manager.get_current_learnings()
            if learnings_section:
                logger.info("Learnings fetched successfully — injecting into agent prompt.")
            else:
                logger.info("No learnings available — proceeding without them.")
        except Exception as e:
            logger.warning(f"Could not fetch learnings, proceeding without: {e}")

        all_recommendations = []
        overall_reasoning = ""

        try:
            response_data: BettingAgentResponse = make_bet_selections(
                events=events,
                budget=request.budget,
                min_profit=request.min_profit,
                risk_appetite=request.risk_appetite,
                wallet_service=self.wallet_service,
                bet_repo=self.bet_repo,
                betfair_service=self.betfair_service,
                learnings_section=learnings_section,
            )
            overall_reasoning = response_data.overall_reasoning

            # --- Resolve pick names from source events by ID ---
            # Build a flat lookup: (market_id, selection_id) → (event_name, market_name, option_name)
            id_lookup: dict = {}
            for event in events:
                for market in event.options:
                    for selection in market.options:
                        key = (market.market_id, int(selection.selection_id))
                        id_lookup[key] = (event.event_name, market.name, selection.name)

            for rec in response_data.recommendations:
                key = (rec.market_id, int(rec.selection_id))
                resolved = id_lookup.get(key)
                if resolved:
                    rec.pick.event_name, rec.pick.market_name, rec.pick.option_name = resolved
                else:
                    logger.warning(
                        f"Could not resolve names for market_id={rec.market_id}, "
                        f"selection_id={rec.selection_id} — skipping recommendation."
                    )
                    continue

                if rec.stake > request.budget:
                    logger.warning(
                        f"AI stake {rec.stake} exceeded budget {request.budget}. Capping stake."
                    )
                    rec.stake = request.budget

                if self._is_valid_bet(rec.stake, rec.odds):
                    all_recommendations.append(rec)
                else:
                    potential_profit = rec.stake * (rec.odds - 1)
                    logger.warning(
                        f"Skipping AI rec — stake: {rec.stake}, "
                        f"profit: {potential_profit:.3f} — {rec.pick.event_name}"
                    )

        except Exception as e:
            logger.error(f"Error during AI analysis: {e}")
            overall_reasoning = f"Failed to analyze events — {str(e)}"


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

            # Re-validate against min profit after scaling down
            valid_scaled_recs = []
            for rec in all_recommendations:
                if self._is_valid_bet(rec.stake, rec.odds):
                    valid_scaled_recs.append(rec)
                else:
                    logger.warning(
                        f"Dropping bet after budget scale-down (profit too low): "
                        f"{rec.pick.event_name} @ {rec.odds} with stake ${rec.stake:.2f}"
                    )
            all_recommendations = valid_scaled_recs
            total_stake = sum(rec.stake for rec in all_recommendations)

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
                "source": "ai",
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
