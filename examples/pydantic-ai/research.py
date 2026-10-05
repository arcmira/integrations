"""Run a real Arcmira search through Pydantic AI with a deterministic model."""
import asyncio
import json
import os

from pydantic_ai import Agent
from pydantic_ai.mcp import MCPToolset
from pydantic_ai.messages import ModelResponse, TextPart, ToolCallPart, ToolReturnPart
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.usage import UsageLimits

ALLOWED_TOOLS = {"arcmira_describe", "arcmira_execute_read"}


def search_once(messages, info):
    """Select one tool call in Python so the example needs no model API key."""
    if {tool.name for tool in info.function_tools} != ALLOWED_TOOLS:
        raise RuntimeError("Unexpected Arcmira tool discovery result.")
    for message in messages:
        for part in message.parts:
            if isinstance(part, ToolReturnPart):
                content = part.content
                payload = json.loads(content) if isinstance(content, str) else content
                if not isinstance(payload, dict) or payload.get("ok") is not True:
                    raise RuntimeError("Arcmira did not return a successful execution.")
                return ModelResponse(parts=[TextPart(json.dumps(payload))])
    return ModelResponse(parts=[ToolCallPart("arcmira_execute_read", {
        "code": 'return await arcmira.search({ query: "AI agents", limit: 1 });',
    })])


async def main():
    key = os.environ.get("ARCMIRA_API_KEY")
    if not key:
        raise SystemExit("Set ARCMIRA_API_KEY. API docs: https://arcmira.com/docs")
    research = MCPToolset(
        "https://mcp.arcmira.com/mcp",
        headers={"Authorization": "Bearer " + key},
        tool_error_behavior="error",
        read_timeout=40,
    ).filtered(lambda ctx, tool: tool.name in ALLOWED_TOOLS)
    agent = Agent(FunctionModel(search_once), toolsets=[research], retries=0)
    async with agent:
        result = await agent.run(
            "Find one YouTube transcript passage about AI agents.",
            usage_limits=UsageLimits(request_limit=2, tool_calls_limit=1),
        )
    print(json.dumps(json.loads(result.output), indent=2))


if __name__ == "__main__":
    asyncio.run(main())
