import requests
from collections import namedtuple

Response = namedtuple('Response', ['json', 'status_code', 'success'])

class BaseThirdParty:
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    def __init__(self, api_key: str):
        self.api_key = api_key

    def _make_request(self, endpoint: str, params: dict, method: str = "GET", data: dict = None, json: dict = None):
        url = f"{self.base_url}/{endpoint}"

        method = method.upper()
        
        request_func = getattr(requests, method.lower(), None)
        if not request_func:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response = request_func(
            url,
            params=params if method == "GET" else None,
            data=data,
            json=json,
            headers=self.headers
        )

        return Response(response.json(), response.status_code, response.ok)
