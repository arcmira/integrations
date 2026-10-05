from dify_plugin import Tool
from arcmira_api import parameters, request


class ArcmiraResolve(Tool):
    def _invoke(self, tool_parameters: dict):
        params = parameters(tool_parameters, {"q", "type", "context", "limit"}, 15, 8)
        result = request(self.runtime.credentials.get("api_key"), "/v1/entities/resolve", params)
        yield self.create_json_message(result)
