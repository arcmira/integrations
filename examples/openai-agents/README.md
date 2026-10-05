# YouTube transcript search with the OpenAI Agents SDK

[API docs](https://arcmira.com/docs) · [MCP reference](https://arcmira.com/docs/mcp-server)

Connect an agent to Arcmira's research MCP and retrieve a timestamped YouTube passage. This example uses an Arcmira API key, discovers the agent's tools and runs one bounded search. It does not call an OpenAI model or export traces.

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/examples/openai-agents
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
export ARCMIRA_API_KEY='your-key'
.venv/bin/python research.py
```

The example checks both the MCP error flag and Arcmira's execution outcome. Its JSON output preserves the transcript-source label, timestamp, watch link, account window and coverage note. Empty results do not establish that nobody discussed the topic.

The `Agent` receives the research connection through `mcp_servers`. This example exposes `arcmira_describe` and `arcmira_execute_read`; monitor writes and feedback are outside its scope. Consult `arcmira_describe` for the current client reference when writing other research programs. The research tool can perform metered reads: a paid read uses credits from your plan, then your on-demand budget. See [usage and billing](https://arcmira.com/docs/usage-and-billing).

Verified on October 5, 2026 with `openai-agents` 0.22.3, MCP client 2.2.0 and Arcmira's deployed MCP 0.10.4. The bounded free-account check returned source evidence successfully with on-demand disabled. This is a tested example, not a separate package or framework catalog listing.
