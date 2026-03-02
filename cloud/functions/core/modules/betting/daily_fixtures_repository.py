from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from core import logger
from core.firestore import get_db
from core.timestamps import server_timestamp

class DailyFixturesRepository:
    def __init__(self):
        self.db = get_db()

    def _get_games_collection(self, date_str: str):
        """Returns the games subcollection reference for a specific date."""
        return self.db.collection("daily_fixtures").document(date_str).collection("games")

    def batch_save_fixtures(self, date_str: str, games: List[Dict[str, Any]]):
        """
        Saves a batch of games to the subcollection for the given date.
        - NEW games: written with analysis_status="pending".
        - Existing PENDING games: event data is refreshed.
        - Existing COMPLETED / FAILED games: skipped entirely to preserve results.

        Accepts both the flat structure returned by search_market:
            { 'provider_event_id', 'name', 'time', 'competition', 'options', ... }
        and the pre-nested structure:
            { 'event': { 'id', 'name', 'time', 'competition' }, 'marketCount', ... }
        """
        if not games:
            return 0

        games_col = self._get_games_collection(date_str)

        # Load analysis_status for all existing docs in one pass.
        # 'completed' and 'failed' docs are skipped entirely.
        existing_statuses: Dict[str, str] = {}
        for doc in games_col.select(['analysis_status']).stream():
            existing_statuses[doc.id] = (doc.to_dict() or {}).get('analysis_status', '')

        TERMINAL_STATUSES = {'completed', 'failed'}

        batch = self.db.batch()
        batch_size = 0
        added_count = 0
        skipped_count = 0

        for game in games:
            # --- normalise flat vs nested input ---
            nested_event = game.get('event') or {}
            event_id = str(
                game.get('provider_event_id')
                or nested_event.get('id')
                or nested_event.get('provider_event_id')
            )
            if not event_id or event_id == "None":
                logger.warning(f"Skipping game with no resolvable event ID: {game.get('name')}")
                continue

            # Never touch games that already have a terminal analysis result.
            existing_status = existing_statuses.get(event_id)
            if existing_status in TERMINAL_STATUSES:
                skipped_count += 1
                continue

            # Build a canonical event object for Firestore (matches the Event pydantic model)
            event_obj = {
                "provider_event_id": event_id,
                "id": event_id,  # keep for backward compat
                "name": game.get('name') or nested_event.get('name'),
                "time": game.get('time') or nested_event.get('time'),
                "competition": game.get('competition') or nested_event.get('competition'),
                "options": game.get('options') or nested_event.get('options') or [],
            }
            
            market_count = game.get('marketCount') or len(game.get('options', []))
            
            # Combine flags into metadata (and alias has_reliable_team to is_reliable_team)
            metadata = {
                "marketCount": market_count,
                "is_reliable_team": game.get('has_reliable_team', False),
                "is_reliable_competition": game.get('is_reliable_competition', False),
            }

            doc_ref = games_col.document(event_id)

            game_doc = {
                "event": event_obj,
                "metadata": metadata,
                "updated_at": server_timestamp()
            }

            # Only set analysis_status on brand-new documents
            if event_id not in existing_statuses:
                game_doc["analysis_status"] = "pending"

            batch.set(doc_ref, game_doc, merge=True)
            batch_size += 1
            added_count += 1

            if batch_size >= 400:
                batch.commit()
                batch = self.db.batch()
                batch_size = 0

        if batch_size > 0:
            batch.commit()

        logger.info(f"Saved/Updated {added_count} fixtures for {date_str} (skipped {skipped_count} completed/failed)")
        return added_count

        
    def get_fixtures_for_date(self, date_str: str) -> List[Dict[str, Any]]:
        """Retrieves all fixtures for a specific date."""
        games_col = self._get_games_collection(date_str)
        docs = games_col.stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(data)
            
        return results

    def get_fixture(self, date_str: str, event_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single fixture."""
        doc_ref = self._get_games_collection(date_str).document(str(event_id))
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None

    def save_fixture_markets(self, date_str: str, event_id: str, options: List[Dict[str, Any]]):
        """Persists live-fetched market options (BTTS, Over/Under, etc.) nested inside event.options."""
        doc_ref = self._get_games_collection(date_str).document(str(event_id))
        doc_ref.set({
            "event": {"options": options},
            "metadata": {"marketCount": len(options)},
            "updated_at": server_timestamp(),
        }, merge=True)

    def update_fixture_analysis(self, date_str: str, event_id: str, selections: List[Dict[str, Any]], status: str):
        """Updates a fixture with AI analysis results."""
        doc_ref = self._get_games_collection(date_str).document(str(event_id))

        update_data = {
            "analysis_status": status,
            "selections": selections,
            "updated_at": server_timestamp()
        }
        
        doc_ref.set(update_data, merge=True)

    def mark_fixture_failed(self, date_str: str, event_id: str, reason: str):
        """Marks a fixture as failed during analysis."""
        doc_ref = self._get_games_collection(date_str).document(str(event_id))
        
        update_data = {
            "analysis_status": "failed",
            "analysis_error": reason,
            "updated_at": server_timestamp()
        }
        
        doc_ref.set(update_data, merge=True)

    def mark_fixture_placed(self, date_str: str, event_id: str):
        """Marks a fixture as placed to prevent duplicate automated betting."""
        doc_ref = self._get_games_collection(date_str).document(str(event_id))
        
        update_data = {
            "status": "placed",
            "placed_at": server_timestamp()
        }
        
        doc_ref.set(update_data, merge=True)
