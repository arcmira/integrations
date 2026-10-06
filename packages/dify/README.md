# Arcmira: YouTube Transcript Search

Search indexed YouTube transcripts for timestamped passages, speaker appearances, mentions and sponsored ad reads from Dify workflows and agents.

[API documentation](https://arcmira.com/docs) · [Source](https://github.com/arcmira/integrations/tree/master/packages/dify)

Plugin version 0.1.1 was installed as a local plugin in the branded Dify Cloud workspace on October 4, 2026. Marketplace publication is pending. Version 0.1.1 completed authenticated entity resolution in Community Edition on October 6, 2026. Version 0.1.2 adds publication metadata and updates Werkzeug to 3.1.9 for its Windows path-handling security fix. Version 0.1.2 passed the same native Community Edition entity-resolution check. Authenticated Dify Cloud workflow execution remains unverified.

## Setup

Install the reviewed plugin package in Dify, then enter your own Arcmira API key in its secret credential field. Credential validation reads `/v1/me`; it does not run a transcript search. The runtime needs HTTPS access to `api.arcmira.com`.

A paid read uses credits from your plan, then your on-demand budget. The budget configured in your dashboard approves on-demand usage. See [usage and billing](https://arcmira.com/docs/usage-and-billing) for account access and limits.

## Use

1. Add **Resolve an entity** to resolve a person, organization, product, topic or channel. Preserve uncertain candidates and ask for clarification when necessary.
2. Add **YouTube transcript search**. Enter one topic in `q` and apply the resolved IDs through the relevant filters. The default limit is five passages; the maximum is twenty.
3. Keep the returned timestamps, source links and coverage notes when generating an answer. Use `by` for a labeled speaker and `about` for what a passage discusses. Speaker labeling and indexed coverage are incomplete.

For example, resolve a named channel, then search for a topic with its YouTube channel ID. To inspect classified ad reads, resolve the organization and pass its ID through `about` with `kind=sponsored`. Classifications are evidence to inspect, not proof of a commercial agreement.

The tools return the complete JSON research response. An access refusal or rate limit is an error, not an empty result. A requested `source=arcmira_premium` never falls back to captions. Neither tool creates monitors or requests new transcript generation.

To restrict results to one transcript source, set `source` to `arcmira_premium`, `creator_captions`, or `third_party_quick`. Omitting it leaves the source unrestricted within your account's access. Keep `partial`, `failed_batches`, `access`, `window`, and `search_index` in context when they appear. Results with incomplete coverage are not proof that a topic was never discussed.

- Search parameters: https://arcmira.com/docs/search
- OpenAPI reference: https://api.arcmira.com/v1/openapi.json
- MCP connection: https://arcmira.com/docs/mcp-server
- Plugin privacy: [PRIVACY.md](PRIVACY.md)
- Support: zeal@arcmira.com

## Development

Use Python 3.12 and uv.

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/packages/dify
uv sync --frozen
uv run --frozen python -m unittest discover -s test -v
```

With the official Dify plugin CLI installed, build a local package with `dify plugin package . -o arcmira-0.1.2.difypkg`. The included `.difyignore` excludes tests, environments and local credentials.

The committed lock was resolved with a September 28, 2026 dependency cutoff. Local adapter tests use Dify's real plugin SDK and a mock HTTP transport, so they make no research calls and spend no account allowance. The local SDK also completed live account validation, bounded search and entity resolution on October 5, 2026. Timestamped evidence, coverage notes and entity identity were preserved. The free test account had on-demand disabled and no observed credit decrease. No key was shared with Dify Cloud for this check. The installed Community Edition plugin also completed a native Resolve an entity node on October 6, 2026 for OpenAI with type organization and limit 1. It returned the exact organization match and preserved the full JSON response without a model node. Native Community Edition transcript search and authenticated Dify Cloud workflows remain unverified.

The Apache-2.0 license covers this adapter source. Arcmira's hosted service and data retain their own terms.
