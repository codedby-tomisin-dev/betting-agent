from datetime import datetime, timezone, timedelta
from random import shuffle
from typing import Dict, Any, List, Optional

from core import logger
from core.timestamps import server_timestamp
from core.modules.betting.models import AnalyzeBetsRequest, GetOddsRequest
from core.modules.betting.repository import BetRepository
from core.modules.betting.daily_fixtures_repository import DailyFixturesRepository
from core.modules.betting.betfair_service import BetfairService
from core.modules.betting.analysis.service import BettingAnalysisService
from core.modules.settings.manager import SettingsManager
from core.modules.wallet.service import WalletService


class AutomatedBettingService:
    """Orchestrates scheduled betting routines: daily suggestions and hourly direct bets."""

    def __init__(
        self,
        betfair_service: BetfairService,
        bet_repo: BetRepository,
        daily_fixtures_repo: DailyFixturesRepository,
        settings_manager: SettingsManager,
        wallet_service: WalletService,
        analysis_service: BettingAnalysisService,
        placement_service=None,
    ):
        self.betfair = betfair_service
        self.repo = bet_repo
        self.daily_fixtures_repo = daily_fixtures_repo
        self.settings_manager = settings_manager
        self.wallet_service = wallet_service
        self.analysis_service = analysis_service
        self.placement_service = placement_service

    @staticmethod
    def _calculate_budget(
        available_balance: float, bankroll_percent: float, max_bankroll: float
    ) -> float:
        return min(available_balance * (bankroll_percent / 100), max_bankroll)

    def execute_automated_betting(
        self,
        competitions: List[str],
        bankroll_percent: float,
        max_bankroll: float,
        risk_appetite: float,
        reliable_teams: Optional[List[str]] = None,
        target_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Source upcoming matches for a target date, optionally filter by reliable teams,
        and create a suggestion for later promotion and analysis.
        """
        logger.info("Starting automated betting execution")

        if target_date:
            target_date_obj = datetime.fromisoformat(target_date).date()
        else:
            target_date_obj = datetime.now(timezone.utc).date()
        target_date_str = target_date_obj.isoformat()

        available_balance = self.wallet_service.get_available_balance()
        if available_balance <= 0:
            logger.warning("No available balance for automated betting")
            return {
                "status": "skipped",
                "reason": "No available balance",
                "available_balance": available_balance,
            }

        budget = self._calculate_budget(available_balance, bankroll_percent, max_bankroll)
        logger.info(f"Available balance: {available_balance}, Betting budget: {budget}")

        # Source odds across all requested competitions
        all_events: List[dict] = []
        for competition in competitions:
            try:
                logger.info(f"Searching odds for {competition}")
                events = self.betfair.search_market(
                    sport="Soccer",
                    competitions=[competition],
                    text_query=None,
                    all_markets=True,
                )
                all_events.extend(events)
            except Exception as e:
                logger.error(f"Error fetching odds for {competition}: {e}")

        if not all_events:
            return {
                "status": "skipped",
                "reason": "No events found",
                "competitions_searched": competitions,
            }

        # Filter to target date
        target_events = []
        for event in all_events:
            event_time = event.get("time")
            if not event_time:
                continue
            if isinstance(event_time, str):
                event_date = datetime.fromisoformat(
                    event_time.replace("Z", "+00:00")
                ).date()
            elif isinstance(event_time, datetime):
                event_date = event_time.date()
            else:
                continue
            if event_date == target_date_obj:
                target_events.append(event)

        logger.info(f"Found {len(target_events)} matches scheduled for {target_date_obj}")

        if not target_events:
            return {
                "status": "skipped",
                "reason": f"No matches on {target_date_obj}",
                "total_events_found": len(all_events),
            }

        # Optional: filter to reliable teams
        if reliable_teams:
            events_to_analyze = [
                e
                for e in target_events
                if e.get("metadata", {}).get("is_reliable_team", False)
                or any(
                    team.lower() in e.get("event", {}).get("name", "").lower() for team in reliable_teams
                )
            ]
            logger.info(f"Filtered to {len(events_to_analyze)} events involving reliable teams")
        else:
            events_to_analyze = target_events
            logger.info(f"No reliable teams filter applied, using {len(events_to_analyze)} events")

        shuffle(events_to_analyze)

        if not events_to_analyze:
            return {
                "status": "skipped",
                "reason": "No events involving reliable teams",
                "total_events_found": len(target_events),
            }

        try:
            intent_data = {
                "target_date": target_date_str,
                "status": "intent",
                "preferences": {
                    "risk_appetite": risk_appetite,
                    "budget": budget,
                    "reliable_teams_only": bool(reliable_teams),
                    "competitions": competitions,
                },
                "balance": {
                    "starting": available_balance,
                    "predicted": None,
                    "ending": None,
                },
                "events": events_to_analyze,
            }
            return intent_data
        except Exception as e:
            logger.error(f"Failed to create bet intent: {e}")
            raise

    def execute_hourly_automated_betting(
        self,
        bankroll_percent: float = 5.0,
        max_bankroll: float = 100.0,
        risk_appetite: float = 3.0,
    ) -> Dict[str, Any]:
        """
        Queries daily_fixtures for games starting in the next 60 mins.
        Priority:
            1. Reliable-competition fixtures that already have AI-generated selections.
            2. Fallback: a random fixture from any competition, analyzed on-the-fly.
        """
        logger.info("Starting hourly automated betting execution from daily_fixtures")

        from constants import RELIABLE_COMPETITIONS as _RELIABLE
        from random import choice as random_choice
        from core.modules.betting.models import AnalyzeBetsRequest

        now = datetime.now(timezone.utc)
        to_time = now + timedelta(minutes=60)
        date_str = now.date().isoformat()

        try:
            fixtures = self.daily_fixtures_repo.get_fixtures_for_date(date_str)
        except Exception as e:
            logger.error(f"Error fetching daily fixtures for {date_str}: {e}")
            return {"status": "error", "reason": f"Fetching fixtures failed: {e}"}

        if not fixtures:
            return {"status": "skipped", "reason": f"No daily fixtures found for {date_str}"}

        def _in_next_hour(fixture: dict) -> bool:
            event_time_str = fixture.get("event", {}).get("time")
            if not event_time_str:
                return False
            try:
                event_time = datetime.fromisoformat(event_time_str.replace("Z", "+00:00"))
                return now <= event_time <= to_time
            except ValueError:
                return False

        # ── Pass 1: reliable-competition fixtures with completed AI selections ────
        reliable_ready = [
            (f, f.get("selections", []))
            for f in fixtures
            if (
                f.get("status") != "placed"
                and f.get("analysis_status") == "completed"
                and (f.get("metadata", {}).get("is_reliable_competition") or
                     (f.get("event", {}).get("competition") or {}).get("name") in _RELIABLE)
                and f.get("selections")
                and _in_next_hour(f)
            )
        ]

        available_balance = self.wallet_service.get_available_balance()
        if available_balance <= 0:
            return {"status": "skipped", "reason": "No funds"}

        budget = self._calculate_budget(available_balance, bankroll_percent, max_bankroll)
        logger.info(f"Hourly Budget: ${budget:.2f}")

        if reliable_ready:
            logger.info(f"Found {len(reliable_ready)} reliable-competition fixture(s) with AI selections. Proceeding.")
            shuffle(reliable_ready)
            valid_fixtures = reliable_ready
            return self._place_from_fixtures(valid_fixtures, date_str, available_balance, budget, risk_appetite, now)

        # ── Pass 2: fallback — pick a random game and analyze on-the-fly ─────────
        unplaced_in_hour = [
            f for f in fixtures
            if f.get("status") != "placed" and _in_next_hour(f)
        ]
        if not unplaced_in_hour:
            return {"status": "skipped", "reason": "No fixtures starting in the next 60 mins"}

        fallback_fixture = random_choice(unplaced_in_hour)
        event_data = fallback_fixture.get("event", {})
        provider_event_id = event_data.get("provider_event_id") or event_data.get("id") or fallback_fixture.get("id")
        event_id = fallback_fixture.get("id", provider_event_id)

        logger.info(f"No reliable-competition picks found. Running on-the-fly analysis for fallback game: {event_data.get('name')}")

        # Fetch full markets for the fallback game
        live_markets = self.betfair.get_event_markets(str(provider_event_id))
        if live_markets:
            event_data = dict(event_data)
            event_data["options"] = live_markets
            event_data["marketCount"] = len(live_markets)
            self.daily_fixtures_repo.save_fixture_markets(date_str, str(event_id), live_markets)

        try:
            settings = self.settings_manager.get_betting_settings()
            analysis_request = AnalyzeBetsRequest(
                events=[{
                    "provider_event_id": provider_event_id,
                    "name": event_data.get("name"),
                    "time": event_data.get("time"),
                    "competition": event_data.get("competition") or {"name": "Unknown"},
                    "options": event_data.get("options") or [],
                    "marketCount": event_data.get("marketCount", 0),
                }],
                risk_appetite=risk_appetite,
                budget=budget,
                min_profit=settings.min_profit,
            )
            recommendations = self.analysis_service.analyze_betting_opportunities(analysis_request)
            selection_items = recommendations.get("selections", {}).get("items", [])
        except Exception as e:
            logger.error(f"On-the-fly analysis failed for fallback fixture {event_id}: {e}", exc_info=True)
            self.daily_fixtures_repo.mark_fixture_failed(date_str, str(event_id), str(e))
            return {"status": "skipped", "reason": f"Fallback analysis failed: {e}"}

        if not selection_items:
            self.daily_fixtures_repo.mark_fixture_failed(date_str, str(event_id), "No suitable AI picks found in fallback analysis")
            return {"status": "skipped", "reason": "Fallback analysis found no picks"}

        chosen = selection_items[0]
        self.daily_fixtures_repo.update_fixture_analysis(date_str, str(event_id), [chosen], "completed")

        valid_fixtures = [(fallback_fixture, [chosen])]
        return self._place_from_fixtures(valid_fixtures, date_str, available_balance, budget, risk_appetite, now)

    def _place_from_fixtures(
        self,
        valid_fixtures: list,
        date_str: str,
        available_balance: float,
        budget: float,
        risk_appetite: float,
        now: datetime,
    ) -> Dict[str, Any]:
        """Places bets from a pre-filtered list of (fixture, selections) tuples."""
        created_bets = []
        for fixture, selections in valid_fixtures:
            try:
                event_data = fixture.get("event", {})
                event_id = fixture.get("id")

                original_total = sum(s.get("stake", 0) for s in selections)
                if original_total <= 0:
                    continue

                scale_factor = budget / original_total

                total_scaled_stake = 0
                total_scaled_returns = 0

                scaled_selections = []
                for s in selections:
                    scaled_s = dict(s)
                    scaled_s["stake"] = round(s.get("stake", 0) * scale_factor, 2)
                    total_scaled_stake += scaled_s["stake"]
                    total_scaled_returns += scaled_s["stake"] * scaled_s.get("odds", 0)
                    scaled_selections.append(scaled_s)

                if total_scaled_stake <= 0:
                    continue

                selections_payload = {
                    "items": scaled_selections,
                    "wager": {
                        "odds": round(total_scaled_returns / total_scaled_stake, 2) if total_scaled_stake > 0 else 0.0,
                        "stake": round(total_scaled_stake, 2),
                        "potential_returns": round(total_scaled_returns, 2)
                    }
                }

                predicted_balance = available_balance + (total_scaled_returns - total_scaled_stake)

                bet_data = {
                    "target_date": date_str,
                    "status": "ready",
                    "created_at": server_timestamp(),
                    "approved_at": server_timestamp(),
                    "source": "hourly_automated",
                    "preferences": {
                        "risk_appetite": risk_appetite,
                        "budget": budget,
                        "period": "hourly",
                        "from_time": now.isoformat(),
                    },
                    "balance": {
                        "starting": available_balance,
                        "predicted": predicted_balance,
                    },
                    "selections": selections_payload,
                    "ai_reasoning": "Placed from Daily Fixtures async analysis.",
                    "events": [
                        {
                            "name": event_data.get("name"),
                            "time": event_data.get("time"),
                            "competition": event_data.get("competition"),
                        }
                    ],
                }
                bet_doc = self.repo.create_bet_intent(bet_data)
                bet_id = bet_doc.get("id")
                logger.info(f"Created hourly automated bet {bet_id} with status 'ready'")
                created_bets.append(bet_id)

                if getattr(self, "placement_service", None):
                    self.placement_service.prepare_and_place_bets_from_ready_doc(bet_id, bet_data)
                    updated_bet = self.repo.get_bet(bet_id)
                    if updated_bet and updated_bet.get("status") in ["placed", "partial"]:
                        logger.info(f"Successfully placed hourly bet for {event_id}. Ending hourly job.")
                        self.daily_fixtures_repo.mark_fixture_placed(date_str, event_id)
                        break
                    else:
                        logger.warning(f"Failed to place bet for {event_id}. Trying next fixture.")
                else:
                    logger.warning("No placement service injected, skipping synchronous placement.")
                    self.daily_fixtures_repo.mark_fixture_placed(date_str, event_id)
                    break

            except Exception as e:
                logger.error(f"Error creating/placing hourly bet for fixture {fixture.get('id')}: {e}")

        return {
            "status": "success",
            "bets_created": len(created_bets),
            "bet_ids": created_bets
        }

