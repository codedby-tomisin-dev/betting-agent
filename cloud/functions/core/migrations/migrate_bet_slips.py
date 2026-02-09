"""
Migration script to convert legacy bet_slips documents to new format.

Old format:
- events[].event_name, event_time, competition_name
- selections.items[].event as string (event name only)

New format:
- events[].name, time, competition: { name: string }
- selections.items[].event as { name, time, competition: { name } }
"""

from firebase_admin import firestore
from google.cloud.firestore import DocumentSnapshot
from typing import Any


def migrate_event(old_event: dict) -> dict:
    """Convert legacy event format to new EventInfo format."""
    return {
        "name": old_event.get("event_name") or old_event.get("name", ""),
        "time": old_event.get("event_time") or old_event.get("time", ""),
        "competition": {
            "name": old_event.get("competition_name") or 
                    (old_event.get("competition", {}) or {}).get("name", "")
        },
        "options": old_event.get("options", [])
    }


def find_event_for_selection(selection: dict, events: list[dict]) -> dict:
    """
    Find matching event for a selection.
    Old format has event as string (event name), new format needs full object.
    """
    event_name = selection.get("event", "")
    
    # If event is already an object, return it migrated
    if isinstance(event_name, dict):
        return migrate_event(event_name)
    
    # Find matching event by name
    for event in events:
        old_name = event.get("event_name") or event.get("name", "")
        if old_name == event_name:
            return {
                "name": old_name,
                "time": event.get("event_time") or event.get("time", ""),
                "competition": {
                    "name": event.get("competition_name") or 
                            (event.get("competition", {}) or {}).get("name", "")
                }
            }
    
    # Fallback - create minimal event info
    return {
        "name": event_name if isinstance(event_name, str) else "",
        "time": "",
        "competition": {"name": ""}
    }


def migrate_selection_item(item: dict, events: list[dict]) -> dict:
    """Convert a selection item to new format."""
    event_info = find_event_for_selection(item, events)
    
    return {
        "event": event_info,
        "market": item.get("market", ""),
        "odds": item.get("odds", 0),
        "stake": item.get("stake", 0),
        "market_id": item.get("market_id"),
        "selection_id": item.get("selection_id"),
        "side": item.get("side", "BACK"),
        "reasoning": item.get("reasoning")
    }


def migrate_bet_slip(doc_data: dict) -> dict:
    """
    Migrate a single bet_slip document from old to new format.
    Returns the migrated data.
    """
    migrated = dict(doc_data)
    
    # Migrate events array
    old_events = doc_data.get("events", [])
    migrated_events = [migrate_event(e) for e in old_events]
    migrated["events"] = migrated_events
    
    # Migrate selections.items
    if "selections" in migrated and migrated["selections"]:
        selections = dict(migrated["selections"])
        old_items = selections.get("items", [])
        migrated_items = [
            migrate_selection_item(item, old_events) 
            for item in old_items
        ]
        selections["items"] = migrated_items
        migrated["selections"] = selections
    
    # Add migration marker
    migrated["_migrated_at"] = firestore.SERVER_TIMESTAMP
    migrated["_migration_version"] = 2
    
    return migrated


def needs_migration(doc_data: dict) -> bool:
    """Check if document needs migration."""
    # Already migrated
    if doc_data.get("_migration_version", 0) >= 2:
        return False
    
    # Check if using old format
    events = doc_data.get("events", [])
    if events and "event_name" in events[0]:
        return True
    
    # Check if selections use old format (event as string)
    selections = doc_data.get("selections", {})
    items = selections.get("items", []) if selections else []
    if items and isinstance(items[0].get("event"), str):
        return True
    
    return False


def run_migration(dry_run: bool = True, batch_size: int = 100) -> dict:
    """
    Run migration on all bet_slips documents.
    
    Args:
        dry_run: If True, don't actually update documents
        batch_size: Number of documents to process per batch
        
    Returns:
        Summary of migration results
    """
    db = firestore.client()
    collection = db.collection("bet_slips")
    
    results = {
        "total_checked": 0,
        "needs_migration": 0,
        "migrated": 0,
        "skipped": 0,
        "errors": []
    }
    
    # Query all documents
    docs = collection.stream()
    
    batch = db.batch()
    batch_count = 0
    
    for doc in docs:
        results["total_checked"] += 1
        doc_data = doc.to_dict()
        
        if not needs_migration(doc_data):
            results["skipped"] += 1
            continue
        
        results["needs_migration"] += 1
        
        try:
            migrated_data = migrate_bet_slip(doc_data)
            
            if not dry_run:
                batch.update(doc.reference, migrated_data)
                batch_count += 1
                
                # Commit batch if size reached
                if batch_count >= batch_size:
                    batch.commit()
                    batch = db.batch()
                    batch_count = 0
            
            results["migrated"] += 1
            
        except Exception as e:
            results["errors"].append({
                "doc_id": doc.id,
                "error": str(e)
            })
    
    # Commit remaining batch
    if not dry_run and batch_count > 0:
        batch.commit()
    
    return results


def migrate_single_document(doc_id: str, dry_run: bool = True) -> dict:
    """
    Migrate a single document by ID.
    Useful for testing before running full migration.
    """
    db = firestore.client()
    doc_ref = db.collection("bet_slips").document(doc_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return {"error": f"Document {doc_id} not found"}
    
    doc_data = doc.to_dict()
    
    if not needs_migration(doc_data):
        return {"status": "skipped", "reason": "Already migrated or no migration needed"}
    
    migrated_data = migrate_bet_slip(doc_data)
    
    if not dry_run:
        doc_ref.update(migrated_data)
    
    return {
        "status": "migrated" if not dry_run else "dry_run",
        "original": doc_data,
        "migrated": migrated_data
    }
