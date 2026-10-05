"""Check record schemas against the included public OpenAPI snapshot."""

import json
from pathlib import Path

root = Path(__file__).parent
api = json.loads((root / "openapi.json").read_text())


def expand(value):
    if isinstance(value, list):
        return [expand(item) for item in value]
    if not isinstance(value, dict):
        return value
    if "$ref" in value:
        target = api
        for part in value["$ref"][2:].split("/"):
            target = target[part]
        return expand(target)
    return {key: expand(item) for key, item in value.items()}


for stream, component in [
    ("mentions", "MentionListResponse"),
    ("recommendations", "RecommendationListResponse"),
]:
    expected = expand(api["components"]["schemas"][component])["properties"][stream]["items"]
    actual = json.loads((root / "tap_arcmira" / "schemas" / f"{stream}.json").read_text())
    if actual != expected:
        raise SystemExit(f"Schema drift: {stream}")
print("Both record schemas match the included API snapshot.")
