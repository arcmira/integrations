# Release status

The TypeScript LangChain package is a verified release candidate at 0.1.0 with public publication metadata. Its first npm publication is pending. The AI SDK, Activepieces and n8n JavaScript packages remain previews at 0.1.0 with `private: true`. Pipedream is a separate private native-component preview at 0.0.1. None of these JavaScript packages is available on npm. Dify is a source preview at version 0.1.1, installed as a local Cloud plugin. The Python LangChain package is [published on PyPI at 0.1.0](https://pypi.org/project/langchain-arcmira/0.1.0/). None has completed its framework catalog review.

## Verified versions

| Package | Framework | Arcmira SDK | Checks |
| --- | --- | --- | --- |
| @arcmira/langchain | @langchain/core 1.2.13; @langchain/langgraph 1.4.18 | 0.4.3 | TypeScript, 14 workflow tests, archive checks, live search and resolution |
| langchain-arcmira | langchain-core 1.6.5; langchain-tests 1.1.9; langgraph 1.2.12 | 0.4.3 | 41 local checks, 11 live standard and evidence checks; zero credit delta |
| @arcmira/ai-sdk | ai 7.0.118 | 0.4.3 | TypeScript, 14 tool-loop tests, archive checks, live search and resolution |
| @arcmira/piece-arcmira | Activepieces host 0.92.0; pieces-framework 0.32.0 | Direct HTTP | TypeScript, 13 action tests, isolated bundle check, live native-host search |
| n8n-nodes-arcmira | n8n host 2.41.3; routing engine 2.41.2; workflow 2.41.0 | Direct HTTP | TypeScript, strict lint, seven routing tests, parameter contract, live native-host search and resolution |
| Arcmira for Dify | dify-plugin 0.10.2; plugin 0.1.1 | Direct HTTP | 18 SDK tests, Cloud installation, local SDK research against live API |

Direct third-party dependencies met a seven-day release-age policy when selected on October 5, 2026. The first-party SDK uses the current released contract. AI SDK 7.0.127 was too new for that policy and needs a separate compatibility check after October 8, 2026 at 19:20 UTC. Recheck releases before publishing.

## TypeScript LangChain first publication

The `@arcmira/langchain` 0.1.0 source is prepared for a public npm release. It is not published yet. Its package metadata deliberately omits `private` and specifies the public npm registry. Keep release execution separate from preparing the source.

1. Run `scripts/ci.sh` locally on the exact source commit.
2. From `packages/langchain`, run `npm pack --ignore-scripts --json` and inspect the resulting archive. It must contain compiled JavaScript, declarations, README, Apache-2.0 license, and package metadata.
3. Verify the archive imports and runs the native LangChain tools against fixture responses. Record the artifact SHA-256 and source commit before publishing.
4. Confirm the branded npm identity and permission to publish in the `@arcmira` scope. Publish the verified archive only after the release is authorized.
5. Verify registry metadata, a fresh installation, native tool execution, and provenance when configured. Then update this status and extend [LangChain listing issue #6442](https://github.com/langchain-ai/docs/issues/6442) to include TypeScript.

After publication, install the package with `npm install @arcmira/langchain@0.1.0 @langchain/core zod` and import `createArcmiraTools` from `@arcmira/langchain`. Until then, use the [tested source quick start](packages/langchain).

## Before remaining npm and catalog publication

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

n8n has no runtime dependencies beyond its host peer. Its frozen pnpm lock includes build and test tools. The package remains private with a publication guard. Browser-editor validation, GitHub Actions publication with npm provenance, and Creator Portal review remain. See the [current n8n verification requirements](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines).

Dify dependencies retain the September 26, 2026 cutoff in `pyproject.toml` and `uv.lock`. Its requirements export is pinned. The Marketplace artifact must exclude tests, local environments and credentials. Authenticated Cloud workflow and Community Edition tests, publisher agreement and Marketplace review remain. See [Dify submission requirements](https://github.com/langgenius/dify-plugins/blob/main/docs/plugin-submission-requirements.md).

## Python LangChain publication

`langchain-arcmira==0.1.0` is published with PyPI trusted-publisher attestations. Both PyPI artifact hashes match the signed GitHub release. A fresh environment installed the public package and passed all 41 offline package tests, including native LangGraph `ToolNode` execution.

- [PyPI package](https://pypi.org/project/langchain-arcmira/0.1.0/)
- [Signed source and artifacts](https://github.com/arcmira/integrations/releases/tag/langchain-python-v0.1.0)
- [Successful publication run](https://github.com/arcmira/integrations/actions/runs/37342305530)
- [LangChain listing request, pending review](https://github.com/langchain-ai/docs/issues/6442)

The package README is the dedicated guide. Catalog inclusion remains pending maintainer review.

The guide on `master` now leads with the published pip install. PyPI 0.1.0 retains its original source-checkout guide inside the immutable release artifacts. That registry copy will refresh with the next package release; this documentation update does not change version 0.1.0 or replace its artifacts. A future publication must record the new package source tree and artifact checksums.


### Configure PyPI trusted publishing

Create a pending publisher in the branded PyPI account with these fields:

| Field | Value |
| --- | --- |
| PyPI project | `langchain-arcmira` |
| GitHub owner | `arcmira` |
| GitHub repository | `integrations` |
| Workflow filename | `publish-langchain-python.yml` |
| Environment | `pypi` |

The manual workflow runs on `master` and uploads prebuilt GitHub release assets. It does not build or test packages. It verifies artifact SHA-256 checksums, the package source tree at both `HEAD` and the release tag, and a clean package directory before obtaining PyPI publishing credentials.

### Prepare and publish the Python release

1. Run `scripts/ci.sh` locally on the release source. The Python checks build the wheel and source archive in `packages/langchain-python/dist/`.
2. Record their SHA-256 checksums and the committed package tree in `release-artifacts/langchain-python/current.json`.
3. Commit the manifest and run `python3 scripts/verify-python-release.py packages/langchain-python/dist`.
4. Merge the reviewed release commit to `master`. Create the manifest's signed tag at that commit and attach the verified wheel and source archive to its GitHub release.
5. Run `python3 scripts/verify-python-release.py --tag langchain-python-v0.1.0 packages/langchain-python/dist` on the release checkout.
6. Confirm that the PyPI publisher configuration matches the table above. Dispatch **Publish Python LangChain package** from `master`.
7. Verify the PyPI files, provenance, clean installation, and import before marking the package published or submitting the LangChain catalog issue.

Never rebuild or replace assets after their checksums are recorded without repeating the local checks and updating the manifest. The verifier permits only the two recorded artifacts and the exact `.gitignore` metadata file that `uv build` adds locally.

## Homebrew CLI

The root `Formula/arcmira.rb` packages CLI 0.4.3 through this repository's first-party tap. See the [Homebrew guide](Formula) for installation and validation limits. Native installation and the actual offline formula test passed on Apple Silicon macOS with Node 24.19.0. `brew audit --new` passed against the published remote tap. Standard `brew test --force` remains blocked by locally older dependencies relative to Homebrew's current catalog; Linux and Intel macOS remain unverified. No Homebrew core inclusion is claimed.

## Nix CLI

The [first-party Nix package](nix) builds CLI 0.4.3 from its GitHub release source with pinned npm dependencies. Nix 2.24.11, Nixpkgs `bfdc17373049aec7e5a4ad159f614c7a7c2e050c` and Node 24.20.0 passed the source build, 68 fixture-based tests and installed CLI checks on aarch64-linux in Docker on Apple Silicon. Nix sandboxing was disabled inside that disposable container; a sandboxed native-host build and other platforms remain unverified. The package adjusts only the setup test's shell and utility paths for Nix. All six skill guides are present. No live API credentials or paid calls were used. This is an Arcmira install route, with no Nixpkgs catalog inclusion claimed.

## dlt REST example

The [dlt example](examples/dlt) loads bounded search responses or cursor-paginated channel-video metadata into local JSONL files. It uses dlt 1.30.0 with locked dependencies. Eight local tests passed through the real REST transport, extraction, normalization and filesystem destination. They verify complete response retention, empty coverage notes, cursor/filter consistency, request bounds, refusal bodies and headers, no automatic HTTP retries, and no destination load after a later-page failure. Live authenticated Arcmira validation remains incomplete because no suitable established smoke credential was available. This is a fixture-tested first-party example, not a dlt verified-source catalog listing or an exhaustive transcript export.

## Airbyte source preview

The [Airbyte candidate](packages/airbyte) is a Python CDK 7.31.0 source preview at 0.1.0 for explicitly scoped channel videos, mentions and recommendations. Its 58 synthetic HTTP tests run through the native CDK transport and source-read protocol. The included public OpenAPI snapshot regenerates the connector specification and six schemas exactly. Credentials are synthetic; no live research is part of the checks.

Only full refresh is implemented. Scoped pagination preserves filters and opaque cursors. Preview, access and malformed responses stop the sync; a later-page failure can follow already-emitted records, so destination rollback is not promised. Deployed Airbyte sync, dedicated sandbox validation, destination overwrite/failure checks and the connector acceptance suite remain pending under [existing discussion #87666](https://github.com/airbytehq/airbyte/discussions/87666). No host artifact, Python release or Airbyte catalog inclusion is claimed.

`./scripts/ci.sh --offline` runs the same builds and tests using cached dependency artifacts and fails if they are missing. The Airbyte check requires an existing locked environment, selected with `ARCMIRA_AIRBYTE_PYTHON` or `packages/airbyte/.venv/bin/python`; it does not install one.

## Pipedream Connect and MCP preview

The [Pipedream source preview](packages/pipedream) contains three native actions and a proposed managed API-key app definition. It uses `@pipedream/platform` 3.1.1 with a frozen npm lock. Its 22 offline tests exercise native action modules through the platform HTTP wrapper with synthetic responses and a zero-socket-attempt guard. A local validator checks syntax, component shape and parameters against the included public API schema. These are not Pipedream-hosted tests or the official upstream monorepo linter.

The target is Connect/MCP; Workflows and String are being retired. App registration, confirmation of the managed auth fields, actual Connect execution and MCP discovery remain pending under [existing app request #22142](https://github.com/PipedreamHQ/pipedream/issues/22142). Private custom-tool publishing requires a Business plan; a no-upgrade contributor testing route still needs confirmation. No hosted app, registry inclusion, npm publication or live authenticated research is claimed.

## Meltano source preview

`packages/meltano` is a Singer tap source preview for scoped mentions and optional recommendations. Version 0.1.0 is local source metadata, not a PyPI or Hub release. The Apache-2.0 package retains the reviewed tap runtime and adds public setup instructions, pinned test dependencies and schema parity checks. Local fixture checks, package builds and previous Meltano installation/discovery passed. A separate synthetic pipeline through target-duckdb 0.8.0 and DuckDB 1.5.5 verified loading, primary-key upserts and partial writes on a later-page source failure. Omitted rows remain, and a successful target exit alone does not mean the source succeeded. Authenticated export, other destinations and end-to-end Meltano orchestration remain unverified. No provider publication is implied.
