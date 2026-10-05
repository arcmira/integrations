from dify_plugin import Tool
from arcmira_api import parameters, request


class ArcmiraSearch(Tool):
    def _invoke(self, tool_parameters: dict):
        params = parameters(tool_parameters, {"q", "channel_ids", "entity_ids", "about", "by", "kind", "after", "before", "source", "limit"}, 20, 5)
        result = request(self.runtime.credentials.get("api_key"), "/v1/search", params)
        yield self.create_json_message(result)
