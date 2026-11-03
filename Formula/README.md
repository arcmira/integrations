# YouTube transcript search with the Arcmira CLI on Homebrew

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs)

Install the [Arcmira CLI](https://arcmira.com/docs/libraries) from Arcmira’s Homebrew tap to find timestamped quotes in indexed YouTube videos and podcast transcripts.

```sh
brew tap arcmira/integrations https://github.com/arcmira/integrations.git
brew install arcmira/integrations/arcmira
arcmira --version
arcmira search --help
```

The formula installs CLI 0.6.2 and declares Node 24 LTS. Homebrew can install or upgrade dependencies. If your environment enforces a release-age policy, check the current dependency releases before installing. Arcmira does not pin Homebrew's dependency catalog.

The version and help commands work without an API key. After [authenticating](https://arcmira.com/docs/authentication), find up to three passages about agent payments:

```sh
arcmira search "agent payments" --limit 3 --json
```

Each match includes a timestamped source link. See the [transcript search guide](https://arcmira.com/docs/search) for channel and date filters. A paid read uses credits from your plan, then your on-demand budget.

If another package manager already supplies `arcmira`, keep that installation until you choose which one should own the command. To inspect a separate unlinked Homebrew installation, add `--skip-link` to the install command and invoke `$(brew --prefix arcmira/integrations/arcmira)/bin/arcmira` directly.

## Update

```sh
brew update
brew upgrade arcmira/integrations/arcmira
```

The wrapper disables npm update notices. Homebrew manages the installed CLI version.

## Validation

On November 2, 2026, a fresh ARM64 Debian 12 installation with Homebrew 7.0.11 installed CLI 0.6.2 and its dependencies from the October 22 Homebrew Core catalog. Node 24.22.1 ran the CLI. The formula passed `brew test --force arcmira/integrations/arcmira`. The search example above sent the expected query and limit to a local test server.

On Apple Silicon macOS, CLI 0.6.2 passed the version and schema checks on October 15 using an unlinked installation and an existing Node 24.19.0 runtime. The Linux result applies to the dated catalog. Intel macOS and x86-64 Linux still need testing.

The release archive is SHA-256 checked and has no runtime npm dependencies. Installation uses Homebrew's npm helper with lifecycle scripts disabled. No account credential or network research request is needed for the formula test.

## Maintain the formula

Update the immutable npm release URL and SHA-256 together. Check the current CLI version independently from MCP server versions. Run a fresh install, formula test and audit before publishing each formula change. Record the actual Node version and any untested host or dependency combination.
