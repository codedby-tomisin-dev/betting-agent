import json
from datetime import datetime
from typing import Any, Optional

from firebase_functions import https_fn


def _make_response(payload: dict, status: int = 200) -> https_fn.Response:
    def default_serializer(obj):
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        if hasattr(obj, "dict"):
            return obj.dict()
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")

    return https_fn.Response(
        json.dumps(payload, default=default_serializer),
        status=status,
        headers={"Content-Type": "application/json"}
    )


def make_success_response(data: Any, status: int = 200) -> https_fn.Response:
    payload = {
        "status": "success",
        "data": data or {}
    }

    return _make_response(payload, status)


def make_error_response(message: str, status: int = 400) -> https_fn.Response:
    payload = {
        "status": "error",
        "message": message or "An error occurred"
    }

    return _make_response(payload, status)
