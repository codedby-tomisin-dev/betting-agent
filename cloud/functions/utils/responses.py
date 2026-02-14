import json
from datetime import datetime
from typing import Any, Optional, Union

from firebase_functions import https_fn


def _serialize_value(obj):
    """Custom serializer for non-JSON types."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def _make_response(payload: dict, status: int = 200, as_dict: bool = False) -> Union[https_fn.Response, dict]:
    """
    Create a response. 
    If as_dict=True, returns a JSON-serializable dict (for on_call functions).
    Otherwise returns an https_fn.Response (for on_request functions).
    """
    if as_dict:
        # For on_call, we need to serialize and deserialize to handle custom types
        serialized = json.dumps(payload, default=_serialize_value)
        return json.loads(serialized)
    
    return https_fn.Response(
        json.dumps(payload, default=_serialize_value),
        status=status,
        headers={"Content-Type": "application/json"}
    )


def make_success_response(data: Any, status: int = 200, as_dict: bool = False) -> Union[https_fn.Response, dict]:
    """
    Create a success response.
    
    Args:
        data: The data to include in the response
        status: HTTP status code (only used when as_dict=False)
        as_dict: If True, returns a dict instead of Response (for on_call functions)
    """
    payload = {
        "status": "success",
        "data": data if data is not None else {}
    }

    return _make_response(payload, status, as_dict)


def make_error_response(message: str, status: int = 400, as_dict: bool = False) -> Union[https_fn.Response, dict]:
    """
    Create an error response.
    
    Args:
        message: Error message
        status: HTTP status code (only used when as_dict=False)
        as_dict: If True, returns a dict instead of Response (for on_call functions)
    """
    payload = {
        "status": "error",
        "message": message or "An error occurred"
    }

    return _make_response(payload, status, as_dict)
