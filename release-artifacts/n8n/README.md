# Publish the Arcmira n8n node

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [n8n setup](../../packages/n8n)

The [0.1.0 release](https://github.com/arcmira/integrations/releases/tag/n8n-v0.1.0) includes the locally tested package. Its filename, SHA-256 checksum, source tree and tag are in [current.json](current.json).

## Prepare a release

1. Build the package in `packages/n8n`. Run the lint, routing tests, contract check and authenticated n8n editor check.
2. Commit the tested source and pack it locally. Inspect the archive contents.
3. Record the version, tag, package tree from `git rev-parse HEAD:packages/n8n`, archive filename and SHA-256 in `current.json`.
4. Tag the tested source and attach the archive to its GitHub release.

## Publish and verify

1. Confirm npm publishing access for `n8n-nodes-arcmira`. The trusted publisher is `arcmira/integrations`, workflow `publish-n8n.yml`, environment `npm`. First publication also requires npm authorization.
2. Run `python3 scripts/verify-n8n-release.py ARCHIVE_DIRECTORY --tag RELEASE_TAG` from the repository root.
3. Dispatch the [release workflow](../../.github/workflows/publish-n8n.yml) from master. It verifies the tagged archive and rebuilds the package on the runner. It compares every file’s contents and mode with the tested archive before publishing the rebuilt package with npm provenance.
4. Verify the published version, package contents and provenance on npm before submitting the node for n8n review.
