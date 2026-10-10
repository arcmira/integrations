# Arcmira API documentation for DSH

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [DSH](https://github.com/deepseek-ai/deepseek-harness) · [Arcmira research MCP](https://arcmira.com/docs/mcp-server)

Search Arcmira API documentation from a selectable DSH preset. This uses the public documentation endpoint and needs no API key. **It does not search YouTube transcripts or access your Arcmira account.**

The preset exposes three tools, including `submit_feedback`. It is **not read-only**. The verification script never calls feedback. See [tool exposure](#tool-exposure) before using this preset in an agent session.

## Add the preset

Tested with `@deepseek-ai/dsh` **0.1.7-rc.2**. Use an existing installation of that version, or install it using [DSH's setup instructions](https://github.com/deepseek-ai/deepseek-harness). Clone this repository and run:

```sh
cd integrations/examples/dsh
dsh web --patch "$PWD/arcmira-docs.patch.yml" --dump-config
```

The composed configuration should contain `preset-arcmira-docs` with a nested `@deepseek-ai/dsh-mcp-client` entry. Start the Web profile:

```sh
dsh web --patch "$PWD/arcmira-docs.patch.yml" --host 127.0.0.1 --port 3086
```

Put `--patch` before app-specific options such as `--host` and `--port`. Open the local URL printed by DSH. In a new session, select **Arcmira API documentation** before its first turn. Ask a documentation question such as:

> Find the Arcmira API authentication documentation. Use only documentation search; do not submit feedback.

That prompt is guidance, not an enforced tool restriction. The patch adds a separate preset and leaves the default preset unchanged. Omit `--patch` to stop loading it. For persistent setup, merge the insert entry into `$DSH_HOME/profiles/web/cordis.patch.yml`, preserving any existing entries. DSH defaults to `~/.dsh` when `DSH_HOME` is unset.

The Web server started on loopback in a local check. The browser blocked navigation with `ERR_BLOCKED_BY_CLIENT`, so browser-visible selection and model-backed Web chat remain unverified. The native session test below verifies the underlying preset and tool path without a browser or inference.

## Tool exposure

The documentation server currently advertises:

- `mcp__arcmiraDocs__search_arcmira_api`
- `mcp__arcmiraDocs__query_docs_filesystem_arcmira_api`
- `mcp__arcmiraDocs__submit_feedback`

DSH 0.1.7-rc.2's MCP-client configuration has no per-tool allowlist. The YAML therefore exposes all three. Do not add an invented `allowedTools` field or describe this patch as read-only.

For an embedded host that owns session creation, the native tool runtime supports restricting inherited tools after mounting the preset:

```js
await ctx.agentPresets.mount(agentCtx, 'arcmira-docs');
agentCtx.tools.restrict({
  allow: [
    'mcp__arcmiraDocs__search_arcmira_api',
    'mcp__arcmiraDocs__query_docs_filesystem_arcmira_api',
  ],
});
```

This restriction passed the native check. It is **not installed by the YAML patch** and is not a documented switch in the stock Web UI.

## Verify native sessions

Use a local project that already has `@deepseek-ai/dsh@0.1.7-rc.2` installed. Set the directory containing that project's `package.json` and `node_modules`:

```sh
DSH_INSTALL_DIR=/absolute/path/to/dsh-project node verify-session.mjs
```

The script resolves dependencies from that existing installation and writes evidence to a temporary directory. It makes a live public documentation search, so it needs network access. It does not install packages, register a model provider, queue a prompt, read credentials or start a Web server.

The check uses DSH's real AgentLoop, session store, preset registry and MCP client. Its resolve/mount sequence follows the installed Web API session controller. It verifies:

- The docs session sees all three advertised tools and receives a successful documentation-search result.
- A control session sees none and gets `UNKNOWN_TOOL`, without another remote tool call.
- A restricted session sees only the two documentation tools, while the unrestricted session retains all three.

The fetch guard allows only `https://arcmira.com/docs/mcp`, rejects authorization headers and redirects, and admits only the `search_arcmira_api` tool call. `submit_feedback` is never invoked. The test is intentionally sensitive to upstream tool-list changes.

Native checks passed on October 5, 2026. They do not establish browser UI behavior, model-backed chat, authenticated research, or catalog publication.

## YouTube research is separate

The authenticated research endpoint is `https://mcp.arcmira.com/mcp`. Follow the [research MCP documentation](https://arcmira.com/docs/mcp-server) for its setup. This preset and its verification do not connect to that endpoint.

A paid read uses credits from your plan, then your on-demand budget. That describes authenticated research usage, not this public documentation test.
