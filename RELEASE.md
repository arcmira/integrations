# Release status

All three packages are source previews, version 0.1.0, with `private: true`. They are not available on npm and are not listed in framework catalogs yet.

## Verified versions

| Package | Framework | Arcmira SDK | Checks |
| --- | --- | --- | --- |
| @arcmira/langchain | @langchain/core 1.2.13; @langchain/langgraph 1.4.18 | 0.4.3 | TypeScript, 14 workflow tests, archive checks, live search and resolution |
| @arcmira/ai-sdk | ai 7.0.118 | 0.4.3 | TypeScript, 14 tool-loop tests, archive checks, live search and resolution |
| @arcmira/piece-arcmira | Activepieces host 0.92.0; pieces-framework 0.32.0 | Direct HTTP | TypeScript, 13 action tests, isolated bundle check, live native-host search |

Third-party dependencies met a seven-day release-age policy when selected on October 5, 2026. The first-party SDK uses the current released contract. AI SDK 7.0.127 was too new for that policy and needs a separate compatibility check after October 8, 2026 at 19:20 UTC. Recheck releases before publishing.

## Before npm and catalog publication

1. Configure npm first publication and trusted publishing for these new packages, under the Arcmira organization.
2. Set package publication metadata and remove `private: true` only as part of the reviewed release.
3. Rerun local build, tests, package-content and credential checks on the exact release commit.
4. Publish dedicated integration guides with the tested examples.
5. Publish packages with provenance, then submit each catalog's required listing request.

LangChain requires an independent published package before its integration listing issue. The AI SDK tools registry also requires a public npm package, current-SDK validation and a dedicated guide.

- [LangChain contribution rules](https://docs.langchain.com/oss/javascript/contributing/integrations-langchain)
- [AI SDK tools registry](https://ai-sdk.dev/tools-registry)

The repository includes a public OpenAPI subset for schema parity tests. It contains no private backend code or credentials. Test responses are synthetic; live account and research responses are not committed.

Activepieces publishes the self-contained `bundle/` artifact, not its source dependency tree. Its bundle includes third-party license notices. Browser-editor validation and a fresh public npm installation still remain. Public npm installation is separate from global catalog inclusion; upstream contributions are currently paused.
