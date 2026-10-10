# Install the Arcmira CLI with Homebrew

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs)

This repository is a first-party Homebrew tap for the [Arcmira CLI](https://arcmira.com/docs/libraries). It is separate from Homebrew core.

```sh
brew tap arcmira/integrations https://github.com/arcmira/integrations.git
brew install arcmira/integrations/arcmira
arcmira --version
arcmira schema resolve --json
```

The formula installs CLI 0.5.1 and declares Node 24 LTS. Homebrew can install or upgrade dependencies. If your environment enforces a release-age policy, check the current dependency releases before installing. Arcmira does not pin Homebrew's dependency catalog.

The version and schema commands run without an API key. For research commands, follow the [authentication guide](https://arcmira.com/docs/authentication). A paid read uses credits from your plan, then your on-demand budget.

If another package manager already supplies `arcmira`, keep that installation until you choose which one should own the command. To inspect a separate unlinked Homebrew installation, add `--skip-link` to the install command and invoke `$(brew --prefix arcmira/integrations/arcmira)/bin/arcmira` directly.

## Update

```sh
brew update
brew upgrade arcmira/integrations/arcmira
```

The wrapper disables npm update notices. Homebrew manages the installed CLI version.

## Validation

On October 8, 2026, CLI 0.5.1 installed unlinked on Apple Silicon macOS with the existing Node 24.19.0 runtime. The formula's test passed through Homebrew's `Formula.run_test` and assertion helpers, checking the installed version and offline entity-resolution schema. `brew audit --new --formula` passed.

The development install used `--ignore-dependencies --skip-link` to test the new first-party archive without changing the host's dependencies or default CLI. Standard `brew test --force` stopped at dependency preflight because the installed dependency versions lag Homebrew's catalog. It did not run the test block. The current dependency matrix, Linux and Intel macOS remain unverified.

Our validation environment applies a seven-day release-age policy to third-party software. Recheck the complete live dependency graph before the next standard-install test; an earlier dependency's eligibility date does not establish that today's graph is eligible.

The release archive is SHA-256 checked and has no runtime npm dependencies. Installation uses Homebrew's npm helper with lifecycle scripts disabled. No account credential or network research request is needed for the formula test.

## Maintain the formula

Update the immutable npm release URL and SHA-256 together. Check the current CLI version independently from MCP server versions. Run a fresh install, formula test and audit before publishing each formula change. Record the actual Node version and any untested host or dependency combination.
