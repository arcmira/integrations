"""Opt-in live checks. Search is limited to one passage per call."""

import os

import pytest
from langchain_tests.integration_tests.tools import ToolsIntegrationTests

from langchain_arcmira import ArcmiraResolve, ArcmiraSearch

pytestmark = pytest.mark.skipif(
    not os.environ.get("ARCMIRA_API_KEY"), reason="Set ARCMIRA_API_KEY for live checks."
)


class TestSearchLive(ToolsIntegrationTests):
    @property
    def tool_constructor(self):
        return ArcmiraSearch

    @property
    def tool_invoke_params_example(self):
        return {"q": "AI agents", "limit": 1}


class TestResolveLive(ToolsIntegrationTests):
    @property
    def tool_constructor(self):
        return ArcmiraResolve

    @property
    def tool_invoke_params_example(self):
        return {"q": "Google", "type": "organization", "limit": 1}


def test_live_source_evidence():
    result = ArcmiraSearch().invoke({"q": "AI agents", "limit": 1})
    assert result["returned"] == 1
    chunk = result["chunks"][0]
    assert chunk["text"] and chunk["watch_url"] and chunk["source_label"]
    assert isinstance(chunk["start_seconds"], (int, float))
    assert "window" in result and result["note"]
    resolved = ArcmiraResolve().invoke(
        {"q": "Google", "type": "organization", "limit": 1}
    )
    assert resolved["candidates"] and resolved["note"]
