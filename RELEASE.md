# Release status

The four JavaScript packages are source previews, version 0.1.0, with `private: true`. They are not available on npm. Dify is a source preview at version 0.1.1, installed as a local Cloud plugin. The Python LangChain package is a tested source preview at 0.1.0; PyPI publication remains. None has completed its framework catalog review.

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

n8n has no runtime dependencies beyond its host peer. Its frozen pnpm lock includes build and test tools. The package remains private with a publication guard. Browser-editor validation, GitHub Actions publication with npm provenance, and Creator Portal review remain. See the [current n8n verification requirements](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines).

Dify dependencies retain the September 26, 2026 cutoff in `pyproject.toml` and `uv.lock`. Its requirements export is pinned. The Marketplace artifact must exclude tests, local environments and credentials. Authenticated Cloud workflow and Community Edition tests, publisher agreement and Marketplace review remain. See [Dify submission requirements](https://github.com/langgenius/dify-plugins/blob/main/docs/plugin-submission-requirements.md).

## Before Python LangChain publication

Publish the verified wheel to PyPI as `langchain-arcmira`, then file an Integration listing issue with LangChain. The package README is the dedicated guide. A source preview alone does not qualify for the catalog. First publication and trusted publishing must use the branded Arcmira publisher account. No listing issue has been filed.


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
