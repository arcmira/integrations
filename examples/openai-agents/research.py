"""Test authenticated YouTube transcript research through the OpenAI Agents SDK."""
import asyncio
import json
import os

from agents import Agent, RunContextWrapper, set_tracing_disabled
from agents.mcp import MCPServerStreamableHttp, create_static_tool_filter


async def main():
    key = os.environ.get("ARCMIRA_API_KEY")
    if not key:
        raise SystemExit("Set ARCMIRA_API_KEY. API docs: https://arcmira.com/docs")
    set_tracing_disabled(True)
    allowed = ["arcmira_describe", "arcmira_execute_read"]
    async with MCPServerStreamableHttp(
        name="arcmira-research",
        params={
            "url": "https://mcp.arcmira.com/mcp",
            "headers": {"Authorization": "Bearer " + key},
        },
        client_session_timeout_seconds=40,
        tool_filter=create_static_tool_filter(allowed_tool_names=allowed),
    ) as research:
        agent = Agent(name="YouTube transcript researcher", mcp_servers=[research])
        visible = await agent.get_all_tools(RunContextWrapper(context=None))
        if {tool.name for tool in visible} != set(allowed):
            raise RuntimeError("Unexpected Arcmira tool discovery result.")
        result = await research.call_tool("arcmira_execute_read", {
            "code": 'return await arcmira.search({ query: "AI agents", limit: 1 });',
        })
        text = "\n".join(block.text for block in result.content if block.type == "text")
        if result.is_error:
            raise RuntimeError(text)
        payload = json.loads(text)
        if payload.get("ok") is not True:
            raise RuntimeError(text)
        print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
