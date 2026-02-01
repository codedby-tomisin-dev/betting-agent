import json
import os
from typing import Any, Dict, Optional, List, Literal, Iterable

from firebase_admin import get_app, initialize_app
from firebase_admin import firestore as admin_firestore
from google.cloud.firestore_v1.vector import Vector
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud.firestore_v1.base_vector_query import DistanceMeasure


_client = None


def _detect_project_id() -> Optional[str]:
    firebase_config = os.getenv("FIREBASE_CONFIG")
    if firebase_config:
        try:
            config = json.loads(firebase_config)
            if isinstance(config, dict):
                project_id = config.get("projectId")
                if project_id:
                    return project_id
        except Exception:
            pass
    return os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCLOUD_PROJECT")


def get_db(project_id: Optional[str] = None):
    global _client
    if _client is not None:
        return _client

    try:
        get_app()
    except ValueError:
        initialize_app()

    # Ensure project id is available to the client
    project_id = project_id or _detect_project_id()
    if project_id:
        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project_id)

    # The admin SDK will internally respect FIRESTORE_EMULATOR_HOST if set
    client = admin_firestore.client()
    _client = client
    return _client


def get_collection(collection_name: str):
    return get_db().collection(collection_name)


def get_document_collection(collection_path: str, document_id: str, subcollection_name: str):
    """Get a subcollection from a specific document.
    
    Args:
        collection_path: Path to the parent collection (e.g., 'topics')
        document_id: ID of the document containing the subcollection
        subcollection_name: Name of the subcollection
        
    Returns:
        Reference to the subcollection
    """
    return get_db().collection(collection_path).document(document_id).collection(subcollection_name)


def get_nested_collection(path_parts: List[str]):
    """Get a collection at any depth in the document hierarchy.
    
    Args:
        path_parts: List of path components alternating between collection and document names
                   e.g., ['topics', 'doc1', 'subcollection', 'subdoc', 'deepcollection']
                   
    Returns:
        Reference to the nested collection
        
    Raises:
        ValueError: If path_parts is empty or doesn't end with a collection name
    """
    if not path_parts:
        raise ValueError("Path parts cannot be empty")
    
    if len(path_parts) % 2 == 0:
        raise ValueError("Path must end with a collection name (odd number of parts)")
    
    db = get_db()
    ref = db.collection(path_parts[0])
    
    # Navigate through the path: doc -> collection -> doc -> collection...
    for i in range(1, len(path_parts)):
        if i % 2 == 1:  # Odd index = document
            ref = ref.document(path_parts[i])
        else:  # Even index = collection
            ref = ref.collection(path_parts[i])
    
    return ref


def get_nested_document(path_parts: List[str]):
    """Get a document reference at any depth in the document hierarchy.
    
    Args:
        path_parts: List of path components alternating between collection and document names
                    and ending with a document name, e.g.,
                    ['topics', 'doc1', 'subcollection', 'subdoc']
    
    Returns:
        Reference to the nested document
        
    Raises:
        ValueError: If path_parts is empty or doesn't end with a document name
    """
    if not path_parts:
        raise ValueError("Path parts cannot be empty")
    
    if len(path_parts) % 2 != 0:
        raise ValueError("Path must end with a document name (even number of parts)")
    
    db = get_db()
    # Start with the first collection/document pair
    ref = db.collection(path_parts[0]).document(path_parts[1])

    # Navigate through remaining pairs: collection -> document
    for i in range(2, len(path_parts), 2):
        ref = ref.collection(path_parts[i]).document(path_parts[i + 1])

    return ref


def find_document(
    path_parts: List[str],
    fields: Dict[str, Any],
    ignore_case: bool = True,
    scan_limit: Optional[int] = 2000,
    operation: Literal['or', 'and'] = 'or'
) -> Optional[Dict[str, Any]]:
    """Find a document by matching fields; supports case-insensitive fallback.

    Implementation details:
    - For AND, use a single composed query with all equality filters.
    - For OR, issue one query per field-value pair and return the first hit.
      This avoids relying on Composite OR filters (which may require indexes
      and can be unsupported in some environments) while remaining efficient.
    - If no exact match is found and ignore_case=True, scan the collection and
      perform case-insensitive checks for string fields.
    """
    if not path_parts:
        raise ValueError("Path parts cannot be empty")

    if len(path_parts) % 2 == 0:
        raise ValueError("Path must end with a collection name (odd number of parts)")

    if not fields:
        raise ValueError("Fields dictionary cannot be empty")

    collection_ref = get_nested_collection(path_parts)

    if operation == 'and':
        query = collection_ref
        for field_name, field_value in fields.items():
            query = query.where(filter=admin_firestore.FieldFilter(field_name, "==", field_value))
        docs = query.limit(1).stream()
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            return data

    elif operation == 'or':
        # Issue one query per condition and return the first match
        for field_name, field_value in fields.items():
            q = collection_ref.where(filter=admin_firestore.FieldFilter(field_name, "==", field_value))
            docs = q.limit(1).stream()
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
    else:
        raise ValueError("Invalid operation. Use 'or' or 'and'.")

    # Fallback: manual case-insensitive scan for string fields
    if not ignore_case:
        return None

    scanned = 0
    for doc in collection_ref.stream():
        scanned += 1
        data = doc.to_dict()
        # Initialize based on operation
        matched = (operation == 'and')
        for field_name, field_value in fields.items():
            current = data.get(field_name)
            if isinstance(current, str) and isinstance(field_value, str):
                condition = current.casefold() == field_value.casefold()
            else:
                condition = current == field_value

            if operation == 'and':
                matched = matched and condition
                if not matched:
                    break
            else:  # operation == 'or'
                matched = matched or condition
                if matched:
                    break

        if matched:
            data['id'] = doc.id
            return data
        if scan_limit is not None and scanned >= scan_limit:
            break

    return None


def delete_document_by_path(path_parts: List[str]) -> None:
    """Delete a document by its nested path parts.
    
    The path supports nested subcollections. This does not recursively delete any
    subcollections under the target document; if that is needed, a recursive delete
    should be implemented by callers.
    """
    doc_ref = get_nested_document(path_parts)
    doc_ref.delete()


def set_document(collection_name: str, document_id: str, data: Dict[str, Any]) -> None:
    get_collection(collection_name).document(document_id).set(data)


def add_document(collection_name: str, data: Dict[str, Any]):
    return get_collection(collection_name).add(data)


def get_document(collection_name: str, document_id: str):
    return get_collection(collection_name).document(document_id).get()


def replace_subcollection(collection_path: str, document_id: str, subcollection_name: str, docs: List[Dict[str, Any]]) -> None:
    """Replace all documents in a subcollection with the provided docs.
    
    This performs a best-effort two-step operation:
    1) Batch-delete current documents in the subcollection
    2) Batch-set new documents with generated IDs
    """
    db = get_db()
    subcol_ref = get_document_collection(collection_path, document_id, subcollection_name)

    # Delete existing documents in batches
    delete_batch = db.batch()
    count = 0
    for doc in subcol_ref.stream():
        delete_batch.delete(doc.reference)
        count += 1
        # Commit intermittently to avoid overly large batches
        if count % 400 == 0:
            delete_batch.commit()
            delete_batch = db.batch()
    # Final commit for remaining deletes
    delete_batch.commit()

    # Add new documents in batches
    if not docs:
        return

    set_batch = db.batch()
    count = 0
    for d in docs:
        new_ref = subcol_ref.document()
        set_batch.set(new_ref, d)
        count += 1
        if count % 400 == 0:
            set_batch.commit()
            set_batch = db.batch()
    set_batch.commit()


def vector_search_topics(collection_name: str, query_vector: List[float], limit: int = 10) -> Iterable[Any]:
    """Use Firestore vector search to retrieve nearest topic docs (raw doc refs).

    Caller is responsible for reading fields and computing distances if needed.
    """
    col = get_collection(collection_name)
    vector_query = col.where(filter=FieldFilter("embedding_vector", "!=", None))
    results = vector_query.find_nearest(
        vector_field="embedding_vector",
        query_vector=Vector(query_vector),
        distance_measure=DistanceMeasure.COSINE,
        limit=limit,
    ).stream()
    return results


def list_topics_batch(collection_name: str, limit: int = 10, offset: Optional[int] = None) -> List[Dict[str, Any]]:
    """List topics in batches for manual processing.

    Returns a list of dicts containing topic fields, including 'id'.
    """
    col = get_collection(collection_name)
    query = col
    if offset:
        query = query.offset(offset)
    docs_iter = query.limit(limit).stream() if isinstance(limit, int) and limit > 0 else query.stream()
    result: List[Dict[str, Any]] = []
    for doc in docs_iter:
        d = doc.to_dict()
        d["id"] = doc.id
        result.append(d)
    return result
