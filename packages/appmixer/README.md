# Arcmira: YouTube Transcript Search for Appmixer

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Authentication](https://arcmira.com/docs/authentication) · [Usage and billing](https://arcmira.com/docs/usage-and-billing)

Search indexed YouTube videos and livestreams for timestamped passages. Resolve people, organizations, products, topics and channels before filtering your research.

This is Arcmira's first-party source for Appmixer connector 1.0.4. See [release status](../../RELEASE.md#appmixer-connector) for hosted verification and downloadable packages. Public Appmixer catalog acceptance is pending.

## Build and install

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations/packages/appmixer
npm ci --ignore-scripts
npm test
npm run pack:service
```

Upload the generated service ZIP from `dist/` through your Appmixer Backoffice connector upload, then connect an [Arcmira API key](https://arcmira.com/docs/authentication) in the managed account form. You need an Appmixer tenant with permission to install custom connectors. See [Appmixer's custom connector guide](https://docs.appmixer.com/getting-started/custom-connectors) for tenant setup.

Add **Search Transcripts** to a flow. Set **Query** to `AI agents` and **Limit** to `1`, then use **Test Flow**. Inspect the output's passage, timestamped `watch_url`, source, window and index-coverage notes. Connect downstream actions to the output that matches the result.

## Choose an action

| Action | Use it for | Outputs |
| --- | --- | --- |
| Search Transcripts | Find spoken passages with optional channel, entity, speaker, date, source and mention-kind filters | `out`, `limited`, `notFound`, `error` |
| Resolve Entities | Identify the person, organization, product, topic or channel you mean | `resolved`, `review`, `notFound`, `error` |
| Make API Call (Advanced) | Call another documented Arcmira v1 endpoint with the managed account | `out`, `error` |

Search preserves the complete response, including limited-coverage notes and source labels. An empty result does not establish that something was never discussed. Resolve routes uncertain matches to `review`; inspect the candidates before choosing an ID.

For the advanced action, supply a relative path such as `entities/resolve`, select `GET`, and add `q=OpenAI` and `limit=1` in **Parameters**. Use the key-value editors for parameters and optional headers. Authentication comes from the managed account. Full URLs and path escapes are rejected.

Explicit `POST`, `PUT`, `PATCH` and `DELETE` requests can modify account data under the key's scopes. There are no automatic retries or transcript-quality fallbacks. If a write loses its response, check its outcome before retrying.

A paid read uses credits from your plan, then any top-up credits, then your on-demand budget. Account access and indexed coverage vary. Preserve the API's error explanation and documentation link instead of silently changing the requested source or filters.

## What has been verified

Version 1.0.4 was installed in the private test tenant on October 7, 2026. Native entity resolution returned an exact OpenAI match through `resolved`. Fresh 1.0.4 transcript-search and advanced-action execution remain unverified; the host displayed repeated logs from the same entity-resolution execution. No before/after usage ledger was captured for that check.

Private hosted connector 1.0.3 passed these checks on October 6, 2026:

- Entity resolution found an exact OpenAI match.
- A one-result transcript search returned a timestamped passage through `limited`, preserving the Free-account window and index notes.
- The advanced action returned the complete HTTP 200 entity-resolution response.
- An invalid one-character query returned HTTP 400 through `error`, preserving its explanation, documentation link and request ID.

These checks used an isolated Free account. The test flow remained inactive. They did not test Premium reads, writes, timeouts, rate limits, team-account selection or a fresh account label in the native picker. No before/after usage ledger was captured for the 1.0.3 checks.

Local tests exercise the actual component modules with synthetic HTTP responses. They cover filters, output routing, ambiguity, managed authentication, account-label fallbacks, request restrictions and error retention. They do not certify Appmixer marketplace acceptance.

Request behavior is unchanged from the privately tested 1.0.3 source. Version 1.0.4 changes usage descriptions, version metadata and the bundled guide. Upstream E2E templates and the copied publisher manifest schema are not included in this first-party package. The existing [Appmixer proposal](https://github.com/Appmixer-ai/appmixer-connectors/issues/1369) tracks the separate catalog process.

## Feedback

[Report an issue](https://github.com/arcmira/integrations/issues) with the Appmixer version, connector version, action, output port and a small reproduction. Include the API error code or request ID if relevant. Leave out API keys, access tokens and unrelated account data.

Arcmira's connector source is Apache-2.0. The hosted Arcmira service and Appmixer platform have their own terms.
