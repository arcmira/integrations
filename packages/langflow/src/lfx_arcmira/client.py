"""Bounded HTTP reads. Account usage and source selection stay with the caller."""
import json

import httpx


class ArcmiraReadError(RuntimeError):
    def __init__(self, status, body, headers):
        self.status = status
        self.body = body
        self.headers = headers
        super().__init__(f"Arcmira HTTP {status}: {json.dumps(body, ensure_ascii=False)}")


def _redact(value, secret):
    if isinstance(value, str):
        return value.replace(secret, "[REDACTED]")
    if isinstance(value, list):
        return [_redact(item, secret) for item in value]
    if isinstance(value, dict):
        return {_redact(key, secret): _redact(item, secret) for key, item in value.items()}
    return value


async def read(api_key, path, parameters):
    if hasattr(api_key, "get_secret_value"):
        api_key = api_key.get_secret_value()
    if not isinstance(api_key, str) or not api_key.strip():
        raise ValueError("An Arcmira API key is required. See https://arcmira.com/docs/authentication.")
    if path not in ("search", "entities/resolve"):
        raise ValueError("Unsupported read operation")
    if not isinstance(parameters.get("q"), str) or len(parameters["q"].strip()) < 2:
        raise ValueError("Query must contain at least two characters")
    limit = parameters.get("limit", 5)
    maximum = 20 if path == "search" else 15
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= maximum:
        raise ValueError(f"Limit must be an integer from 1 to {maximum}")
    params = {k: v for k, v in parameters.items() if v is not None and v != ""}
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
            response = await client.get(
                "https://api.arcmira.com/v1/" + path,
                params=params,
                headers={"Authorization": "Bearer " + api_key, "Accept": "application/json"},
            )
    except httpx.RequestError:
        raise RuntimeError("Arcmira request failed before a response; no automatic retry was made.") from None
    try:
        body = response.json()
    except ValueError:
        raise RuntimeError(f"Arcmira returned a non-JSON response (HTTP {response.status_code}).") from None
    if not 200 <= response.status_code < 300:
        safe_body = _redact(body, api_key)
        headers = {k: response.headers[k].replace(api_key, "[REDACTED]")
                   for k in ("retry-after", "x-request-id") if k in response.headers}
        raise ArcmiraReadError(response.status_code, safe_body, headers)
    if not isinstance(body, dict):
        raise RuntimeError("Arcmira returned an unexpected response shape")
    expected = "chunks" if path == "search" else "candidates"
    if not isinstance(body.get(expected), list):
        raise RuntimeError("Arcmira returned an unexpected response shape")
    return body
