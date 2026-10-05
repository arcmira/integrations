import copy
import json
from unittest.mock import Mock

import pytest
import requests
from click.testing import CliRunner
from singer_sdk.exceptions import ConfigValidationError, FatalAPIError

from tap_arcmira.tap import TapArcmira


CONFIG = {"api_key": "synthetic-test-secret", "entity_ids": ["ent_14"], "after": "2026-09-01", "before": "2026-10-01"}
MENTION = {
    "id": "men_1", "entity": {"id": "ent_14", "name": "Example", "type": "product", "slug": None, "page": None},
    "media": {"video_id": "abcdefghijk", "title": "Synthetic episode", "url": "https://www.youtube.com/watch?v=abcdefghijk",
              "published_at": "2026-09-10T00:00:00Z", "channel_id": None, "view_count": None, "source_channel": None},
    "start_seconds": 42, "end_seconds": 48, "is_appearance": False, "description": "Synthetic test fixture.",
    "confidence": None, "sentiment_score": None, "sentiment": "neutral", "referenced_url": None,
    "referenced_platform": None, "extracted_content": None,
}
RECOMMENDATION = {
    "id": "com_1", "class": "organic", "entity": MENTION["entity"],
    "media": {k: v for k, v in MENTION["media"].items() if k not in ("url", "view_count")},
    "start_seconds": None, "end_seconds": None, "verbatim_quote": "Synthetic recommendation.",
    "promo_code": None, "offer": None, "sentiment": None, "sentiment_score": None,
    "confidence": 0.9, "speaker_role": "host", "conflict_status": None, "resolution": None,
}


def response(body, status=200):
    r = Mock(status_code=status)
    r.json.return_value = body
    return r


def page(records=None, **updates):
    return {"mentions": [MENTION] if records is None else records, "has_more": False, "next_cursor": None, **updates}


def tap(**updates):
    return TapArcmira(config={**CONFIG, **updates})


def test_full_table_metadata_and_optional_recommendations():
    t = tap()
    assert list(t.streams) == ["mentions"]
    assert t.streams["mentions"].replication_method == "FULL_TABLE"
    assert t.streams["mentions"].replication_key is None
    assert "state" not in [c.value for c in t.capabilities]
    assert t.streams["mentions"].primary_keys == ["id"]
    assert set(tap(include_recommendations=True).streams) == {"mentions", "recommendations"}


def test_cursor_keeps_filters_and_preserves_records(monkeypatch):
    second = {**MENTION, "id": "men_2", "start_seconds": 0}
    calls = []
    responses = iter([response(page(has_more=True, next_cursor="signed-cursor")), response(page([second]))])
    def get(url, **kwargs):
        calls.append((url, copy.deepcopy(kwargs)))
        return next(responses)
    monkeypatch.setattr(requests, "get", get)
    got = list(tap().streams["mentions"].get_records(None))
    assert got == [MENTION, second]
    assert calls[0][0] == calls[1][0] == "https://api.arcmira.com/v1/mentions"
    assert calls[0][1]["params"] == {"entity_id": "ent_14", "after": "2026-09-01", "before": "2026-10-01", "limit": 100}
    assert calls[1][1]["params"] == {**calls[0][1]["params"], "cursor": "signed-cursor"}
    assert calls[0][1]["allow_redirects"] is False
    assert calls[0][1]["headers"]["Authorization"] == "Bearer synthetic-test-secret"


def test_recommendation_metadata_survives(monkeypatch):
    monkeypatch.setattr(requests, "get", Mock(return_value=response({"recommendations": [RECOMMENDATION], "has_more": False, "next_cursor": None})))
    assert list(tap(include_recommendations=True).streams["recommendations"].get_records(None)) == [RECOMMENDATION]


@pytest.mark.parametrize("updates", [{"note": "Preview"}, {"unlock": {"tier": "pro", "url": "https://arcmira.com/pricing"}}])
def test_preview_fails_before_emitting_records(monkeypatch, updates):
    monkeypatch.setattr(requests, "get", Mock(return_value=response(page(**updates))))
    with pytest.raises(FatalAPIError, match="limited preview"):
        next(tap().streams["mentions"].get_records(None))


@pytest.mark.parametrize("body,status,expected", [
    ({"error": {"code": "quota_exceeded"}}, 402, "quota_exceeded"),
    (["unexpected error shape"], 503, "http_error"),
    ({"error": {"code": "rate_limited"}}, 429, "rate_limited"),
    ({}, 302, "http_error"),
])
def test_failures_preserve_status_and_do_not_retry(monkeypatch, body, status, expected):
    get = Mock(return_value=response(body, status))
    monkeypatch.setattr(requests, "get", get)
    with pytest.raises(FatalAPIError, match=f"HTTP {status}: {expected}"):
        list(tap().streams["mentions"].get_records(None))
    assert get.call_count == 1


def test_network_error_does_not_log_secret(monkeypatch):
    monkeypatch.setattr(requests, "get", Mock(side_effect=requests.ConnectionError("synthetic-test-secret")))
    with pytest.raises(FatalAPIError) as e:
        list(tap().streams["mentions"].get_records(None))
    assert "synthetic-test-secret" not in str(e.value)


@pytest.mark.parametrize("body", [[], {"mentions": [], "has_more": False}, page(has_more="true"), page(has_more=True), page(next_cursor="inconsistent"), page([{"id": "men_broken"}])])
def test_malformed_data_fails(monkeypatch, body):
    monkeypatch.setattr(requests, "get", Mock(return_value=response(body)))
    with pytest.raises(FatalAPIError):
        list(tap().streams["mentions"].get_records(None))


def test_page_cap_does_not_report_partial_run_as_success(monkeypatch):
    get = Mock(return_value=response(page(has_more=True, next_cursor="next")))
    monkeypatch.setattr(requests, "get", get)
    stream = tap(max_pages_per_entity=1).streams["mentions"].get_records(None)
    assert next(stream) == MENTION
    with pytest.raises(FatalAPIError, match="incomplete"):
        next(stream)
    assert get.call_count == 1


def test_repeated_cursor_stops(monkeypatch):
    get = Mock(return_value=response(page(has_more=True, next_cursor="repeat")))
    monkeypatch.setattr(requests, "get", get)
    with pytest.raises(FatalAPIError, match="repeated"):
        list(tap().streams["mentions"].get_records(None))
    assert get.call_count == 2


@pytest.mark.parametrize("updates", [{"entity_ids": ["Ramp"]}, {"page_size": 101}, {"after": "2026-10-01"}, {"after": "2026-02-30"}])
def test_invalid_configuration_rejected_before_network(monkeypatch, updates):
    get = Mock()
    monkeypatch.setattr(requests, "get", get)
    with pytest.raises(ConfigValidationError):
        list(tap(**updates).streams)
    get.assert_not_called()


def test_native_singer_cli_emits_schema_and_record(monkeypatch, tmp_path):
    monkeypatch.setattr(requests, "get", Mock(return_value=response(page())))
    config = tmp_path / "config.json"
    config.write_text(json.dumps(CONFIG))
    result = CliRunner().invoke(TapArcmira.cli, ["--config", str(config)])
    assert result.exit_code == 0, result.output
    messages = [json.loads(line) for line in result.stdout.splitlines() if line.startswith('{')]
    records = [m for m in messages if m.get("type") == "RECORD"]
    assert len(records) == 1
    assert records[0]["stream"] == "mentions"
    assert records[0]["record"] == MENTION
    assert any(m.get("type") == "SCHEMA" and m["key_properties"] == ["id"] for m in messages)
