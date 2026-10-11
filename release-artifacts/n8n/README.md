# n8n publication

The workflow publishes a locally built archive. It does not build or test packages on GitHub.

Before the first dispatch:

1. Finish release setup and remove the package's private flag for the reviewed release.
2. Run the local build, lint, routing tests, contract check and authenticated n8n editor check.
3. Commit the package changes, pack locally, and inspect the archive contents.
4. Add `current.json` here with `version`, `tag`, `package_tree` from `git rev-parse HEAD:packages/n8n`, and a `files` mapping from the archive filename to its SHA-256 checksum.
5. Create the release tag at the verified package source and upload that exact archive as a GitHub release asset.
6. Configure npm trusted publishing for `arcmira/integrations`, workflow `publish-n8n.yml`, environment `npm`. First-publication authentication must be resolved separately; do not approve a locally staged package as the verified release.
7. Run `python3 scripts/verify-n8n-release.py ARCHIVE_DIRECTORY --tag RELEASE_TAG`, then dispatch the workflow from master.
8. Verify registry contents and provenance before submitting the package to the n8n Creator Portal.

There is deliberately no `current.json` until a release archive is ready. Dispatching early fails before publication. A GitHub workflow result is not evidence of n8n review or marketplace approval.
