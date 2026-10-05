"""Fixed-origin, read-only Arcmira API requests for the Dify tools."""
import json
import math

import httpx

ORIGIN = "https://api.arcmira.com"


def request(api_key: str, path: str, params: dict | None = None) -> dict:
    if not isinstance(api_key, str) or not api_key.strip():
        raise ValueError("An Arcmira API key is required. See https://arcmira.com/docs.")
    if path not in ("/v1/me", "/v1/search", "/v1/entities/resolve"):
        raise ValueError("Unsupported Arcmira operation.")
    try:
        response = httpx.get(
            ORIGIN + path,
            params=params,
            headers={"Authorization": "Bearer " + api_key, "Accept": "application/json"},
            timeout=30.0,
            follow_redirects=False,
        )
    except httpx.RequestError:
        raise ValueError("Arcmira request failed or timed out; no automatic retry was made.") from None
    if not response.is_success:
        try:
            body = response.json()
        except ValueError:
            body = {"error": "Non-JSON API response"}
        detail = json.dumps(body, ensure_ascii=False).replace(api_key, "[redacted]")
        raise ValueError(f"Arcmira HTTP {response.status_code}: {detail[:3000]}") from None
    try:
        body = response.json()
    except ValueError:
        raise ValueError("Arcmira returned an invalid JSON response.") from None
    if not isinstance(body, dict):
        raise ValueError("Arcmira returned an unexpected response shape.")
    return body


def parameters(values: dict, allowed: set[str], max_limit: int, default_limit: int) -> dict:
    query = values.get("q")
    if not isinstance(query, str) or len(query.strip()) < 2:
        raise ValueError("Enter a query with at least two characters.")
    params = {k: v for k, v in values.items() if k in allowed and v is not None and v != ""}
    params["q"] = query.strip()
    value = values.get("limit", default_limit)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or int(value) != value or not 1 <= value <= max_limit:
        raise ValueError(f"Limit must be a whole number between 1 and {max_limit}.")
    params["limit"] = int(value)
    return params
