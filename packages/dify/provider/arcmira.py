from dify_plugin import ToolProvider
from dify_plugin.errors.tool import ToolProviderCredentialValidationError
from arcmira_api import request


class ArcmiraProvider(ToolProvider):
    def _validate_credentials(self, credentials: dict) -> None:
        try:
            request(credentials.get("api_key"), "/v1/me")
        except ValueError as exc:
            raise ToolProviderCredentialValidationError(str(exc)) from None
