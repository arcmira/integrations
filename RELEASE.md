# Release status

The TypeScript LangChain package is a verified release candidate at 0.1.0 with public publication metadata. Its first npm publication is pending. The AI SDK, Activepieces and n8n JavaScript packages remain previews at 0.1.0 with `private: true`. Pipedream is a separate private native-component preview at 0.0.1. None of these JavaScript packages is available on npm. Dify is a source preview at version 0.1.2, tested in Community Edition 1.17.1. Version 0.1.1 was installed separately as a local Cloud plugin. The Python LangChain package is [published on PyPI at 0.1.4](https://pypi.org/project/langchain-arcmira/0.1.4/). The Python package is listed in the LangChain provider directory and tools catalog; the other framework catalog reviews remain separate.

## Verified versions

| Package | Framework | Arcmira SDK | Checks |
| --- | --- | --- | --- |
| @arcmira/langchain | @langchain/core 1.2.13; @langchain/langgraph 1.4.18 | 0.5.1 | TypeScript, 14 workflow tests, archive checks; earlier live search and resolution used SDK 0.4.3 |
| langchain-arcmira | langchain-core 1.6.5; langchain-tests 1.1.9; langgraph 1.2.12 | 0.5.1 | 58 source tests and 58 public-wheel tests; no new live API test for this dependency update |
| @arcmira/ai-sdk | ai 7.0.127 | 0.5.1 | TypeScript, 14 tool-loop tests, archive checks; earlier live search and resolution used SDK 0.4.3 |
| @arcmira/piece-arcmira | Activepieces host 0.92.0; pieces-framework 0.32.0 | Direct HTTP | TypeScript, 13 action tests, isolated bundle check, live native-host search |
| n8n-nodes-arcmira | n8n host 2.41.3; routing engine 2.41.2; workflow 2.41.0 | Direct HTTP | TypeScript, strict lint, seven routing tests, parameter contract, live native-host search and resolution |
| Arcmira for Dify | dify-plugin 0.10.2; plugin 0.1.2; Community Edition 1.17.1 | Direct HTTP | 18 SDK tests, local SDK research, native Community Edition resolution and bounded search; Cloud installation at 0.1.1 |

Direct third-party dependencies met a seven-day release-age policy when selected on October 5, 2026. The first-party SDK uses the current released contract. AI SDK 7.0.127 passed the age policy and source/packed compatibility checks on October 8, 2026 after 19:20 UTC. Recheck newer releases before publishing.

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

Dify dependencies retain the September 28, 2026 cutoff in `pyproject.toml` and `uv.lock`. Its requirements export is pinned. The Marketplace artifact must exclude tests, local environments and credentials. Native Community Edition entity resolution and bounded transcript search passed with plugin 0.1.2. Authenticated Cloud workflow testing, publisher agreement and Marketplace review remain. See [Dify submission requirements](https://github.com/langgenius/dify-plugins/blob/main/docs/plugin-submission-requirements.md).

## Python LangChain publication

### Published 0.1.4

Version 0.1.4 pins released Arcmira SDK 0.5.1. Full local `scripts/ci.sh --offline` passed. The built wheel passed all 58 adapter tests in a fresh environment with external network connections blocked. Third-party versions and artifact hashes are unchanged. No new live API test was performed. Publication completed through the existing trusted publisher. Both public PyPI artifacts match the signed manifest, and the downloaded wheel passed all 58 tests with external network connections blocked.

[PyPI 0.1.4](https://pypi.org/project/langchain-arcmira/0.1.4/) · [Signed release artifacts](https://github.com/arcmira/integrations/releases/tag/langchain-python-v0.1.4) · [Publication run](https://github.com/arcmira/integrations/actions/runs/37855506741)

The TypeScript LangChain and AI SDK candidates also pin SDK 0.5.1. Each passed 14 source tests and 14 packed-artifact tests. They remain unpublished on npm.

### Previous release 0.1.3

Version 0.1.3 pins the released Arcmira SDK 0.5.0. Full local `scripts/ci.sh --offline` passed, including 58 adapter tests. A fresh installation of the built wheel also passed all 58 tests with external network connections blocked. Third-party versions and artifact hashes are unchanged; the resolver narrowed two transitive Python-version markers. No new live API test was performed for this dependency-only update.

Published October 8, 2026 through the existing trusted publisher. Both independently downloaded PyPI artifacts match `release-artifacts/langchain-python/current.json`. A fresh installation of the public wheel passed all 58 tests with external network connections blocked. Registry metadata retains the Arcmira homepage and pins SDK 0.5.0.

- [PyPI 0.1.3](https://pypi.org/project/langchain-arcmira/0.1.3/)
- [Signed source and artifacts](https://github.com/arcmira/integrations/releases/tag/langchain-python-v0.1.3)
- [Successful publication run](https://github.com/arcmira/integrations/actions/runs/37843140578)

### Previous release 0.1.2

Version 0.1.2 aligns `ArcmiraResolve` with the deployed API: `q` requires at least two characters and optional `context` accepts 2–300 characters. Invalid input is rejected before an HTTP request. Seventeen new sync/async boundary and schema cases extend the local suite to 58 tests. The Arcmira SDK remains pinned to 0.4.3; third-party dependencies and valid request behavior are unchanged.

Published October 8, 2026 through the existing trusted publisher. Both downloaded PyPI artifacts match the signed release hashes in `release-artifacts/langchain-python/current.json`. PyPI provides attestations for both files from `arcmira/integrations` and `publish-langchain-python.yml`. A fresh installation of the public wheel passed all 58 unit tests with external network access blocked. Full local repository CI also passed before publication.

- [PyPI 0.1.2](https://pypi.org/project/langchain-arcmira/0.1.2/)
- [Signed source and artifacts](https://github.com/arcmira/integrations/releases/tag/langchain-python-v0.1.2)
- [Successful publication run](https://github.com/arcmira/integrations/actions/runs/37763501324)

### Previous release 0.1.1

`langchain-arcmira==0.1.1` is published with PyPI trusted-publisher attestations. Both downloaded PyPI artifact hashes match the signed GitHub release and recorded manifest. Registry metadata points to the Arcmira homepage, and the package guide includes the current pip quick start and top-up credit wording. Dependencies and request behavior are unchanged.

- [PyPI package](https://pypi.org/project/langchain-arcmira/0.1.1/)
- [Signed source and artifacts](https://github.com/arcmira/integrations/releases/tag/langchain-python-v0.1.1)
- [Successful publication run](https://github.com/arcmira/integrations/actions/runs/37661347709)
- [LangChain provider directory](https://docs.langchain.com/oss/python/integrations/providers/all_providers)
- [LangChain tools catalog](https://docs.langchain.com/oss/python/integrations/tools)
- [Merged catalog contribution](https://github.com/langchain-ai/docs/pull/6457)

The package README is the dedicated guide. LangChain merged the catalog contribution on October 6, 2026. Both production catalog pages include Arcmira and link to this guide.

Historical [PyPI 0.1.0](https://pypi.org/project/langchain-arcmira/0.1.0/), its [signed release artifacts](https://github.com/arcmira/integrations/releases/tag/langchain-python-v0.1.0) and [publication run](https://github.com/arcmira/integrations/actions/runs/37342305530) remain unchanged. Its fresh public installation passed 41 offline tests, including native LangGraph `ToolNode` execution. The separate 0.1.1 release passed full local repository CI and 41 installed-wheel tests before publication.


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
5. Run `python3 scripts/verify-python-release.py --tag langchain-python-v0.1.3 packages/langchain-python/dist` on the release checkout.
6. Confirm that the PyPI publisher configuration matches the table above. Dispatch **Publish Python LangChain package** from `master`.
7. Verify the PyPI files, provenance, clean installation, and import before marking the package published or submitting the LangChain catalog issue.

Never rebuild or replace assets after their checksums are recorded without repeating the local checks and updating the manifest. The verifier permits only the two recorded artifacts and the exact `.gitignore` metadata file that `uv build` adds locally.

## Homebrew CLI

The root `Formula/arcmira.rb` packages CLI 0.5.1 through this repository's first-party tap and links its homepage to Arcmira. On October 8, 2026, the SHA-256 checked archive installed unlinked on Apple Silicon macOS with existing Node 24.19.0. The actual offline formula test passed through `Formula.run_test`, and `brew audit --new --formula` passed. The development install skipped dependency upgrades; standard `brew test --force` stopped before running the test because local dependencies lag the catalog. The current dependency matrix, Linux and Intel macOS remain unverified. No Homebrew core inclusion is claimed. See the [Homebrew guide](Formula).

## Nix CLI

The [first-party Nix package](nix) builds CLI 0.5.1 from its GitHub release source with pinned npm dependencies. Nix 2.24.11, Nixpkgs `bfdc17373049aec7e5a4ad159f614c7a7c2e050c` and Node 24.20.0 passed the October 8 source build, 70 fixture-based tests and documented nix-build/nix-env installation checks on aarch64-linux in Docker on Apple Silicon. Nix sandboxing was disabled inside that disposable container; a sandboxed native-host build and other platforms remain unverified. The package adjusts only the setup test's shell and utility paths for Nix. All six skill guides are present. No live API credentials or paid calls were used. This is an Arcmira install route, with no Nixpkgs catalog inclusion claimed.

## dlt REST example

The [dlt example](examples/dlt) loads bounded search responses or cursor-paginated channel-video metadata into local JSONL files. It uses dlt 1.30.0 with locked dependencies. Eight local tests passed through the real REST transport, extraction, normalization and filesystem destination. They verify complete response retention, empty coverage notes, cursor/filter consistency, request bounds, refusal bodies and headers, no automatic HTTP retries, and no destination load after a later-page failure. On October 5, 2026, one authenticated Free-account search also loaded a complete response into local JSONL with no observed credit use and on-demand disabled. Live channel pagination, paid source filters and Premium reads remain unverified. This is a tested first-party example, not a dlt verified-source catalog listing or an exhaustive transcript export.

## Airbyte source preview

The [Airbyte candidate](packages/airbyte) is a Python CDK 7.31.0 source preview at 0.1.0 for explicitly scoped channel videos, mentions and recommendations. Its 58 synthetic HTTP tests run through the native CDK transport and source-read protocol. The included public OpenAPI snapshot regenerates the connector specification and six schemas exactly. Those 58 tests use synthetic credentials and make no live API calls.

Only full refresh is implemented. Scoped pagination preserves filters and opaque cursors. Preview, access and malformed responses fail the affected stream and mark the sync unsuccessful. Other configured streams can continue, and a later-page failure can follow already-emitted records, so destination rollback is not promised. Broader live validation, production destination commit-policy checks and the connector acceptance suite remain pending under [existing discussion #87666](https://github.com/airbytehq/airbyte/discussions/87666). No registry image, Python release or Airbyte catalog inclusion is claimed.

`./scripts/ci.sh --offline` runs the same builds and tests using cached dependency artifacts and fails if they are missing. The Airbyte check requires an existing locked environment, selected with `ARCMIRA_AIRBYTE_PYTHON` or `packages/airbyte/.venv/bin/python`; it does not install one.

The source CLI also passed synthetic protocol tests against the official `airbyte/destination-duckdb:0.6.0` ARM64 image. Initial overwrite, repeated overwrite and append behaved as documented. A later-page source refusal returned source exit 1 but destination exit 0 and committed an incomplete replacement. Records and `_arcmira` metadata survived unchanged. These DuckDB protocol checks are separate from the local platform check below. They do not establish other destinations' staging or commit behavior.

The custom source image now builds from Airbyte Python base 4.1.1 pinned by digest, using the unchanged hash-locked dependencies and no network during installation. Its ARM64 entrypoint passed spec, discovery, successful/refused checks and synthetic paginated reads. A later-page refusal correctly returned exit 1 after partial records. Python 3.13.14 and CDK 7.31.0 were tested. See the [build commands and limits](packages/airbyte#build-a-custom-connector-image). This custom Dockerfile route is not certified catalog packaging; no registry publication or AMD64 run is claimed.

A separate local ARM64 Airbyte 2.3.0 platform sync completed successfully with the official Postgres 3.0.22 destination and synthetic HTTP responses. Direct database queries verified two channel videos, two mentions and two recommendations with every expected source field intact. A separate later-page HTTP 403 check into an initially empty schema ended in a failed platform job after five automatic whole-sync attempts, with zero persisted records and no saved connection state. This does not prove atomic overwrite of existing data or rollback after larger batches. Both runs used no real Arcmira credentials or credits. See the [platform validation and limits](packages/airbyte#failure-behavior).

On October 6, one bounded live channel-video metadata export also passed through the actual Airbyte 2.3.0 platform and Postgres 3.0.22 destination. The unchanged source used an isolated read-only Free account with on-demand disabled. A one-second window and page size 1 returned one video without pagination; direct database comparison preserved all source fields and coverage context, and account usage was unchanged. Live multi-page exports, mentions and recommendations remain unverified.

## Pipedream Connect and MCP preview

The [Pipedream source preview](packages/pipedream) contains three native actions and a proposed managed API-key app definition. It uses `@pipedream/platform` 3.1.1 with a frozen npm lock. Its 22 offline tests exercise native action modules through the platform HTTP wrapper with synthetic responses and a zero-socket-attempt guard. A local validator checks syntax, component shape and parameters against the included public API schema. The unchanged official ESLint configuration also passes, as do upstream key, app-property and duplicate-key checks scoped to Arcmira. The isolated lint environment uses upstream direct tool versions with some different transitive resolutions. Full upstream catalog CI and hosted testing remain unverified.

The target is Connect/MCP; Workflows and String are being retired. App registration, confirmation of the managed auth fields, actual Connect execution and MCP discovery remain pending under [existing app request #22142](https://github.com/PipedreamHQ/pipedream/issues/22142). Private custom-tool publishing requires a Business plan; a no-upgrade contributor testing route still needs confirmation. No hosted app, registry inclusion, npm publication or live authenticated research is claimed.

## Meltano source preview

`packages/meltano` is a Singer tap source preview for scoped mentions and optional recommendations. Version 0.1.0 is local source metadata, not a PyPI or Hub release. The Apache-2.0 package retains the reviewed tap runtime and adds public setup instructions, pinned test dependencies and schema parity checks. Local fixture checks, package builds and previous Meltano installation/discovery passed. A separate synthetic pipeline through target-duckdb 0.8.0 and DuckDB 1.5.5 verified loading, primary-key upserts and partial writes on a later-page source failure. Omitted rows remain, and a successful target exit alone does not mean the source succeeded. The exact submitted Git URL at source commit `41d8bb40ce8f02d62f2b6dcc15bfd0cf2eda67f2` installs and discovers both streams. Meltano 4.3.0 orchestration with synthetic HTTP responses returned failure for the source refusal while the target retained partial writes. Authenticated export and other destinations remain unverified. No provider publication is implied.

## Appmixer connector

The [Appmixer connector](packages/appmixer) provides transcript search, entity resolution and an advanced managed-account API action. Version 1.0.4 is installed in a private test tenant and passed native entity resolution on October 7, returning an exact OpenAI match through `resolved`. Fresh 1.0.4 transcript-search and advanced-action execution remain unverified. The [first-party 1.0.4 service ZIP](https://github.com/arcmira/integrations/releases/tag/appmixer-v1.0.4) is published and its exact final archive was installed successfully. It adds top-up credit wording and a homepage link without changing request behavior. The published [1.0.3 service ZIP](https://github.com/arcmira/integrations/releases/tag/appmixer-v1.0.3) remains available. Appmixer catalog acceptance is separate and remains pending under [proposal #1369](https://github.com/Appmixer-ai/appmixer-connectors/issues/1369).

On October 6, native 1.0.3 tests resolved OpenAI, returned one timestamped transcript passage with its Free-account window and index notes, and preserved a complete HTTP 200 response from the advanced action. A separate invalid-query test routed HTTP 400 to `error` with the explanation, docs link and request ID unchanged. These checks used an isolated Free managed account; the flow remained inactive. No before/after usage ledger was captured for this version. Premium reads, writes, timeout and rate-limit behavior, fresh native account labels and team-account selection remain unverified.

Portable local tests exercise the component modules against synthetic responses. The package excludes upstream E2E templates, their result/email actions, the copied manifest schema and the upstream test utility. No public marketplace approval or complete upstream E2E conformance is claimed.

## Langflow extension preview

The [Langflow extension](packages/langflow) provides native YouTube transcript search and entity resolution components. The unpublished `lfx-arcmira` 0.1.0 package passes installed LFX 1.12.3 extension discovery and executed-import validation, four native component/tool checks and eleven HTTP transport tests. Agent tool output retains the complete response as a structured artifact, including coverage and access metadata. All tests use synthetic responses with socket connections blocked. No real account, model inference or paid read is included.

The source and wheel metadata link to Arcmira and the API docs. Visual editor presentation, live-account execution, PyPI trusted publishing and catalog inclusion remain pending. [Upstream proposal #15539](https://github.com/langflow-ai/langflow/issues/15539) is not maintainer approval. LFX's `@official` loader slot is not a catalog endorsement.

### Langflow publisher setup

The manual `publish-langflow.yml` workflow uploads prebuilt, checksum-verified wheel and source artifacts from a signed release tag. It runs only on `master`, uses the `pypi` environment and does not build or test in GitHub Actions. The verifier checks the Langflow package tree at both HEAD and the release tag, refuses a dirty package directory, and requires exactly the recorded artifacts.

Before its first dispatch, configure a PyPI pending publisher for project `lfx-arcmira`, owner `arcmira`, repository `integrations`, workflow `publish-langflow.yml`, environment `pypi`. This configuration grants only the new project's publishing access. No publishing token belongs in this repository.

Then finish the package's release copy, run local CI, commit `release-artifacts/langflow/current.json` with the verified package tree and artifact SHA-256 hashes, create its signed release tag and upload those exact files. Run `python3 scripts/verify-python-release.py --package langflow --tag <release-tag> packages/langflow/dist` before dispatch. Do not claim a PyPI release until the public registry files and provenance have been verified. No release manifest or tag has been created yet.
