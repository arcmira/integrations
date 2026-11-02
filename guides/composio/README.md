# YouTube and podcast transcript search in Composio

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [MCP setup](https://arcmira.com/docs/mcp-server) · [Composio Custom MCP](https://docs.composio.dev/docs/extending-sessions/custom-mcp)

Connect Arcmira to your own Composio project to find timestamped passages in indexed YouTube and podcast transcripts. Each user signs in to Arcmira through OAuth. This guide uses Composio’s experimental Custom MCP API and Python SDK 0.30.0.

## Register the toolkit once per project

Install `composio==0.30.0` and set `COMPOSIO_API_KEY` to your project key. Run this in your backend or a private terminal. The request includes Arcmira’s official icon so users can recognize the toolkit when connecting.

```python
from base64 import b64encode
from urllib.request import urlopen

from composio import Composio

composio = Composio()
with urlopen("https://mcp.arcmira.com/icon.png", timeout=15) as icon:
    logo = b64encode(icon.read()).decode("ascii")

toolkit = composio.experimental.custom_toolkits.upsert(
    slug="ARCMIRA",
    toolkit_config={
        "name": "Arcmira: YouTube Transcript Search",
        "app_url": "https://mcp.arcmira.com/mcp",
        "logo_file": {"mime_type": "image/png", "content": logo},
        "auth_schemes": [{
            "mode": "DCR_OAUTH",
            "discovery_url": "https://api.arcmira.com/.well-known/oauth-authorization-server",
        }],
    },
)
print(toolkit.slug)  # CUSTOM_ARCMIRA
```

## Connect an Arcmira account

Set `COMPOSIO_USER_ID` to the stable ID your application uses for this signed-in user. Run the following once for a new connection. Open the returned link in the same user’s browser and complete the Arcmira sign-in.

```python
import os

from composio import Composio

composio = Composio()
session = composio.sessions.create(
    user_id=os.environ["COMPOSIO_USER_ID"],
    toolkits=["CUSTOM_ARCMIRA"],
)
connection = session.authorize("CUSTOM_ARCMIRA")
print(connection.redirect_url)
account = connection.wait_for_connection(timeout=180)
print(account.status)
```

## Check tool discovery

Composio starts its initial sync when the account becomes active. This lists the discovered tool definitions without reading a transcript.

```python
from composio import Composio

composio = Composio()
tools = composio.tools.get_raw_composio_tools(toolkits=["CUSTOM_ARCMIRA"])
for tool in tools:
    print(tool.slug)
```

If the list is empty immediately after sign-in, let the initial sync finish and run the discovery check again. For a failed sync or a change to Arcmira’s tool definitions, use [Composio’s resync instructions](https://docs.composio.dev/docs/extending-sessions/custom-mcp#sync-and-resync-tools) with the active connected account ID.

For later sessions, use the same user ID and toolkit slug. Try asking your agent to find three clips about a topic, quote each speaker in context, and link to the original recording at the timestamp. Paid reads use credits from your plan, then your on-demand budget. [Usage and billing](https://arcmira.com/docs/usage-and-billing)
