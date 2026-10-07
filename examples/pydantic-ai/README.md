# YouTube transcript search with Pydantic AI

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [MCP reference](https://arcmira.com/docs/mcp-server)

Connect a Pydantic AI agent to Arcmira and retrieve a timestamped YouTube passage. This example uses a real MCP connection and agent tool loop. A deterministic `FunctionModel` selects one search in Python, so you need an Arcmira API key but no model provider key.

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/examples/pydantic-ai
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
export ARCMIRA_API_KEY='your-key'
.venv/bin/python research.py
```

The JSON output retains the transcript-source label, timestamp, watch link, account window and coverage note. Empty results do not establish that nobody discussed the topic. The example raises on MCP errors or an unsuccessful Arcmira execution.

Pass the filtered `MCPToolset` to your agent's `toolsets` argument. To let your own model choose research calls, replace `FunctionModel(search_once)` with your configured Pydantic AI model and set appropriate run limits. The deterministic callback belongs to this connection check. See [Pydantic AI's MCP client guide](https://pydantic.dev/docs/ai/mcp/client/) for model setup and toolset configuration.

This example exposes `arcmira_describe` and `arcmira_execute_read`. Consult `arcmira_describe` for the current client reference when writing other research programs. A paid read uses credits from your plan, then any top-up credits, then your on-demand budget. See [usage and billing](https://arcmira.com/docs/usage-and-billing).

Verified on October 5, 2026 with `pydantic-ai-slim` 2.51.0, MCP client 2.2.0 and Arcmira's deployed MCP 0.10.4. The bounded free-account check returned source evidence with on-demand disabled and no observed credit decrease. No external model call or trace exporter was used. This is a tested example, not a separate package or framework catalog listing.
