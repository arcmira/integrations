# YouTube and podcast transcript search in Composio

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [MCP setup](https://arcmira.com/docs/mcp-server) · [Composio Custom MCP](https://docs.composio.dev/docs/extending-sessions/custom-mcp)

Connect Arcmira to your own Composio project to find timestamped passages in indexed YouTube and podcast transcripts. Each user signs in to Arcmira through OAuth. This guide uses Composio’s experimental Custom MCP API and Python SDK 0.30.0.

## Register the toolkit once per project

Install `composio==0.30.0` and set `COMPOSIO_API_KEY` to your project key. If your project already has an Arcmira toolkit, keep its slug and skip to the connection step.

For a new project, run this in your backend or a private terminal. It uses the [Composio v3.1 create endpoint](https://docs.composio.dev/reference/api-reference/toolkits/postCustomToolkits). The `all` setting makes the toolkit available to users in this project. Each user connects their own Arcmira account.

```python
import os
from base64 import b64encode

import httpx

icon = httpx.get("https://mcp.arcmira.com/icon.png", timeout=15)
icon.raise_for_status()
response = httpx.post(
    "https://backend.composio.dev/api/v3.1/custom/toolkits",
    headers={"x-api-key": os.environ["COMPOSIO_API_KEY"]},
    json={
        "name": "Arcmira: YouTube Transcript Search",
        "app_url": "https://mcp.arcmira.com/mcp",
        "user_id": "all",
        "logo_file": {"mime_type": "image/png", "content": b64encode(icon.content).decode("ascii")},
        "auth_schemes": [{
            "mode": "DCR_OAUTH",
            "discovery_url": "https://api.arcmira.com/.well-known/oauth-authorization-server",
        }],
    },
    timeout=30,
)
response.raise_for_status()
print(response.json()["slug"])
```

Set `COMPOSIO_TOOLKIT_SLUG` to the slug printed above or the slug of your existing toolkit.

## Connect an Arcmira account

Set `COMPOSIO_USER_ID` to the stable ID your application uses for this signed-in user. Run the following once for a new connection. Open the returned link in the same user’s browser and complete the Arcmira sign-in.

```python
import os

from composio import Composio

composio = Composio()
slug = os.environ["COMPOSIO_TOOLKIT_SLUG"]
session = composio.sessions.create(
    user_id=os.environ["COMPOSIO_USER_ID"],
    toolkits=[slug],
)
connection = session.authorize(slug)
print(connection.redirect_url)
account = connection.wait_for_connection(timeout=180)
print(account.status)
```

## Check tool discovery

Composio starts its initial sync when the account becomes active. This lists the discovered tool definitions without reading a transcript.

```python
import os

from composio import Composio

composio = Composio()
tools = composio.tools.get_raw_composio_tools(toolkits=[os.environ["COMPOSIO_TOOLKIT_SLUG"]])
for tool in tools:
    print(tool.slug)
```

If the list is empty immediately after sign-in, let the initial sync finish and run the discovery check again. For a failed sync or a change to Arcmira’s tool definitions, use [Composio’s resync instructions](https://docs.composio.dev/docs/extending-sessions/custom-mcp#connect-and-sync) with the active connected account ID.

For later sessions, use the same user ID and toolkit slug. Try asking your agent to find three clips about a topic, quote each speaker in context, and link to the original recording at the timestamp. Paid reads use credits from your plan, then your on-demand budget. [Usage and billing](https://arcmira.com/docs/usage-and-billing)
