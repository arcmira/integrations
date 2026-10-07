# Arcmira: YouTube Transcript Search

Search indexed YouTube transcripts from Activepieces workflows. Get timestamped passages, source links, and coverage metadata.

[Arcmira](https://arcmira.com) · [API documentation](https://arcmira.com/docs) · [OpenAPI specification](https://api.arcmira.com/v1/openapi.json) · [Authentication](https://arcmira.com/docs/authentication)

## Add transcript search to a workflow

This source preview has passed authenticated search in an official Activepieces 0.92.0 development host. It is not yet available on npm or included in the Activepieces catalog. Browser-editor validation and fresh npm installation remain before release.

After publication:

1. In Activepieces, open **Settings → My Pieces → Install Piece** and enter `@arcmira/piece-arcmira`.
2. Add **Arcmira: YouTube Transcript Search** to your flow.
3. Create a connection with an [Arcmira API key](https://arcmira.com/dashboard/api). Validation reads your account details without running a search.
4. Choose **Search YouTube transcripts** and enter one topic or phrase.
5. Set a result limit from 1 to 20. Optionally filter by channel IDs, publication dates, or transcript source.
6. Pass the returned JSON to the next step. Keep the source links and coverage fields with each result.

The minimum supported host version is Activepieces 0.92.0. The framework library has a separate version. The publishable archive is self-contained and includes framework code plus its license notices.

## Results and usage

Search uses your account's search allowance. This action searches indexed passages. Full-transcript reads and monitor changes are outside this action's scope. Paid reads use credits from your plan, then any top-up credits, then your on-demand budget. Review [usage, limits, and billing](https://arcmira.com/docs/usage-and-billing).

Premium source access depends on your account. If that access is refused, the action fails and preserves the API error. It never changes the source filter or silently retries with captions. Configure workflow retries deliberately because a host-level retry is another request.

The complete response is returned, including partial-coverage indicators and access metadata. Empty results do not establish that nobody discussed the topic. Speaker attribution is available where the returned data identifies a speaker. Resolve relative `watch_url` values against `https://arcmira.com`.

The [community npm route](https://www.activepieces.com/docs/build-pieces/sharing-pieces/community) supports manual installation by package name. It does not mean Activepieces has added Arcmira to its global catalog. The separate [private tarball upload](https://www.activepieces.com/docs/build-pieces/sharing-pieces/private) requires a paid Activepieces edition.

## Develop

```sh
npm ci --ignore-scripts
npm test
npm run bundle
npm pack ./bundle --json > pack.json
ARCMIRA_PIECE_PATH=../bundle/index.js node --test test/*.test.cjs
node scripts/check-packed.cjs
```

The 13 tests run the actual framework action with controlled HTTP responses. They cover evidence preservation, filters, authentication, failures, and the absence of automatic fallback. The bundled archive is also checked in isolation with external package imports blocked.

On October 5, 2026, the official Activepieces 0.92.0 development host validated an Arcmira connection and ran a bounded search successfully. Native output retained its timestamp, watch link, source label, account window and coverage note. This covered basic free-account research, with no observed credit decrease and on-demand disabled. Premium access and paid filters were not exercised.

`node smoke.cjs` checks a live invalid-key refusal. It does not require an account key or run paid research.

The MIT license covers this integration code. Arcmira's hosted API and data retain their own terms.
