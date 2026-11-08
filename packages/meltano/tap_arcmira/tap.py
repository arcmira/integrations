"""Bounded full-table research exports from the Arcmira HTTP API."""

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import requests
from jsonschema import Draft202012Validator
from singer_sdk import Stream, Tap
from singer_sdk.exceptions import ConfigValidationError, FatalAPIError
from singer_sdk.helpers.capabilities import PluginCapabilities, TapCapabilities

PRICING = "https://arcmira.com/pricing"


def token(value):
    """An API code or parameter name that is safe to print, else None."""
    return value if isinstance(value, str) and value.replace("_", "").isalnum() and len(value) <= 80 else None


@dataclass(frozen=True)
class PlanRefusal:
    """An HTTP 403 from the plan gate: the account's plan does not include what the stream asks for."""

    code: str
    param: str | None
    unlock_url: str

    @classmethod
    def parse(cls, error):
        unlock = error.get("unlock")
        url = unlock.get("url") if isinstance(unlock, dict) else None
        if not (isinstance(url, str) and url.startswith("https://arcmira.com/") and len(url) <= 300 and url.isprintable() and " " not in url):
            url = PRICING
        return cls(token(error.get("code")) or "http_error", token(error.get("param")), url)

    def line(self, stream):
        what = f"the {self.param} filter" if self.param else f"the {stream} stream"
        return f"Skipped the {stream} stream: this Arcmira plan does not include {what} ({self.code}). Unlock it at {self.unlock_url}"


def error_of(response):
    try:
        body = response.json()
    except ValueError:
        return {}
    error = body.get("error") if isinstance(body, dict) else None
    return error if isinstance(error, dict) else {}


class ArcmiraStream(Stream):
    primary_keys = ["id"]
    forced_replication_method = "FULL_TABLE"

    def __init__(self, tap, name):
        schema = json.loads((Path(__file__).parent / "schemas" / f"{name}.json").read_text())
        super().__init__(tap, schema=schema, name=name)
        self.record_validator = Draft202012Validator(schema)

    def skip(self, refusal):
        """Leave this stream out of the run. A run that every selected stream left out fails."""
        self.logger.warning(refusal.line(self.name))
        refused = self._tap.plan_refusals
        refused[self.name] = refusal
        if all(name in refused for name, stream in self._tap.streams.items() if stream.selected):
            urls = ", ".join(dict.fromkeys(r.unlock_url for r in refused.values()))
            raise FatalAPIError(f"Arcmira exported no stream: this plan does not include any selected stream. Unlock them at {urls}")

    def get_records(self, context):
        emitted = False
        for entity_id in self.config["entity_ids"]:
            params = {
                "entity_id": entity_id,
                "after": self.config["after"],
                "before": self.config["before"],
                "limit": self.config["page_size"],
            }
            if self.config.get("channel_id"):
                params["channel_id"] = self.config["channel_id"]
            seen_cursors = set()
            for page in range(self.config["max_pages_per_entity"]):
                try:
                    response = requests.get(
                        f"https://api.arcmira.com/v1/{self.name}",
                        params=params,
                        headers={
                            "Authorization": f"Bearer {self.config['api_key']}",
                            "Accept": "application/json",
                            "User-Agent": "tap-arcmira/0.1.0",
                        },
                        timeout=30,
                        allow_redirects=False,
                    )
                except requests.RequestException:
                    raise FatalAPIError("Arcmira request failed; no automatic retry.") from None
                if response.status_code != 200:
                    error = error_of(response)
                    # A refusal after records were emitted would leave this stream partial, so it stays fatal.
                    if response.status_code == 403 and error.get("gate") == "plan" and not emitted:
                        self.skip(PlanRefusal.parse(error))
                        return
                    code = token(error.get("code")) or "http_error"
                    raise FatalAPIError(f"Arcmira HTTP {response.status_code}: {code}; no automatic retry.")
                try:
                    body = response.json()
                except ValueError:
                    raise FatalAPIError("Arcmira returned invalid JSON.") from None
                if not isinstance(body, dict):
                    raise FatalAPIError("Arcmira returned an invalid page.")
                if body.get("unlock") or body.get("note"):
                    raise FatalAPIError("Arcmira returned a limited preview; export stopped. Plan access details: https://arcmira.com/pricing")
                records = body.get(self.name)
                has_more = body.get("has_more")
                cursor = body.get("next_cursor")
                if not isinstance(records, list) or type(has_more) is not bool or "next_cursor" not in body:
                    raise FatalAPIError("Arcmira returned an invalid page envelope.")
                if has_more and (not isinstance(cursor, str) or not cursor or cursor in seen_cursors):
                    raise FatalAPIError("Arcmira returned a missing or repeated continuation cursor.")
                if not has_more and cursor is not None:
                    raise FatalAPIError("Arcmira returned inconsistent pagination.")
                for record in records:
                    if not self.record_validator.is_valid(record):
                        raise FatalAPIError("Arcmira returned a record that does not match the saved API schema.")
                emitted = emitted or bool(records)
                yield from records
                if not has_more:
                    break
                if page + 1 == self.config["max_pages_per_entity"]:
                    raise FatalAPIError("Arcmira export reached max_pages_per_entity with more data remaining. The run is incomplete.")
                seen_cursors.add(cursor)
                params["cursor"] = cursor


class TapArcmira(Tap):
    name = "tap-arcmira"
    capabilities = [TapCapabilities.CATALOG, TapCapabilities.DISCOVER, TapCapabilities.ACTIVATE_VERSION, PluginCapabilities.ABOUT]
    config_jsonschema = {
        "type": "object",
        "properties": {
            "api_key": {"type": "string", "minLength": 1, "secret": True},
            "entity_ids": {"type": "array", "minItems": 1, "maxItems": 10, "uniqueItems": True,
                           "items": {"type": "string", "pattern": "^ent_[0-9]+$"}},
            "after": {"type": "string", "format": "date", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
            "before": {"type": "string", "format": "date", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
            "channel_id": {"type": "string", "pattern": "^UC[A-Za-z0-9_-]{22}$"},
            "page_size": {"type": "integer", "minimum": 1, "maximum": 100, "default": 100},
            "max_pages_per_entity": {"type": "integer", "minimum": 1, "maximum": 100, "default": 10},
            "include_recommendations": {"type": "boolean", "default": False,
                                        "description": "Include commercial classifications. Needs a Pro+ plan; on other plans the stream is skipped and its unlock URL is logged."},
        },
        "required": ["api_key", "entity_ids", "after", "before"],
    }

    def __init__(self, *args, **kwargs):
        self.plan_refusals = {}
        super().__init__(*args, **kwargs)

    def discover_streams(self):
        try:
            after = date.fromisoformat(self.config["after"])
            before = date.fromisoformat(self.config["before"])
        except ValueError:
            raise ConfigValidationError("after and before must be valid YYYY-MM-DD dates.") from None
        if after >= before:
            raise ConfigValidationError("after must be before the exclusive before date.")
        names = ["mentions"]
        if self.config["include_recommendations"]:
            names.append("recommendations")
        return [ArcmiraStream(self, name) for name in names]


if __name__ == "__main__":
    TapArcmira.cli()
