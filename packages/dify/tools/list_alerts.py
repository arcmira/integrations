from dify_plugin import Tool
from arcmira_api import MONITOR_ID, request, whole_limit


class ArcmiraListAlerts(Tool):
    def _invoke(self, tool_parameters: dict):
        monitor_id = tool_parameters.get("monitor_id")
        monitor_id = monitor_id.strip() if isinstance(monitor_id, str) else ""
        if not MONITOR_ID.fullmatch(monitor_id):
            raise ValueError("Enter one monitor id, such as mon_ followed by letters and digits.")
        limit = whole_limit(tool_parameters.get("limit", 25), 100)
        result = request(self.runtime.credentials.get("api_key"), f"/v1/monitors/{monitor_id}/alerts", {"limit": limit})
        yield self.create_json_message(result)
