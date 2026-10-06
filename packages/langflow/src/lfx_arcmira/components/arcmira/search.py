from lfx.custom.custom_component.component import Component
from lfx.io import DropdownInput, IntInput, MessageTextInput, Output, SecretStrInput
from lfx.schema.data import Data

from lfx_arcmira.client import read


class ArcmiraTranscriptSearch(Component):
    display_name = "Arcmira YouTube Transcript Search"
    description = ("Search timestamped passages with source and coverage evidence. "
                   "A paid read uses credits from your plan, then your on-demand budget.")
    documentation = "https://arcmira.com/docs/search"
    icon = "Search"
    name = "ArcmiraTranscriptSearch"
    inputs = [
        SecretStrInput(name="api_key", display_name="Arcmira API key", required=True),
        MessageTextInput(name="query", display_name="Query", required=True, tool_mode=True),
        IntInput(name="limit", display_name="Maximum passages", value=5),
        DropdownInput(name="source", display_name="Transcript source", value="",
                      options=["", "arcmira_premium", "creator_captions", "third_party_quick"],
                      info="Leave blank to omit the source filter. Premium restricts results to Premium; access refusals are preserved."),
        MessageTextInput(name="channel_ids", display_name="Channel IDs", advanced=True),
        MessageTextInput(name="entity_ids", display_name="Entity IDs", advanced=True),
        MessageTextInput(name="about", display_name="Mentioned entity IDs", advanced=True),
        MessageTextInput(name="by", display_name="Speaker person IDs", advanced=True,
                         info="Resolve names first. Speaker labels have limited coverage."),
        MessageTextInput(name="kind", display_name="Passage kinds", advanced=True,
                         info="Comma-separated sponsored, organic, mention."),
        MessageTextInput(name="after", display_name="Published at or after", advanced=True,
                         info="ISO8601 date or offset datetime. Account access applies."),
        MessageTextInput(name="before", display_name="Published before", advanced=True,
                         info="Exclusive ISO8601 date or offset datetime. Account access applies."),
    ]
    outputs = [Output(display_name="Complete response", name="response", method="search_transcripts")]

    async def search_transcripts(self) -> Data:
        params = {name: getattr(self, name, None) for name in
                  ("limit", "source", "channel_ids", "entity_ids", "about", "by", "kind", "after", "before")}
        params["q"] = self.query
        response = await read(self.api_key, "search", params)
        return Data(data=response)
