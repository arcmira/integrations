# Install the Arcmira CLI with Homebrew

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs)

This repository is a first-party Homebrew tap for the [Arcmira CLI](https://arcmira.com/docs/libraries). It is separate from Homebrew core.

```sh
brew tap arcmira/integrations https://github.com/arcmira/integrations.git
brew install arcmira/integrations/arcmira
arcmira --version
arcmira schema resolve --json
```

The formula installs CLI 0.4.3 and declares Node 24 LTS. Homebrew can install or upgrade dependencies. If your environment enforces a release-age policy, check the current dependency releases before installing. Arcmira does not pin Homebrew's dependency catalog.

The version and schema commands run without an API key. For research commands, follow the [authentication guide](https://arcmira.com/docs/authentication). A paid read uses credits from your plan, then your on-demand budget.

If another package manager already supplies `arcmira`, keep that installation until you choose which one should own the command. To inspect a separate unlinked Homebrew installation, add `--skip-link` to the install command and invoke `$(brew --prefix arcmira/integrations/arcmira)/bin/arcmira` directly.

## Update

```sh
brew update
brew upgrade arcmira/integrations/arcmira
```

The wrapper disables npm update notices. Homebrew manages the installed CLI version.

## Validation

On October 5, 2026, the formula installed on Apple Silicon macOS with existing Node 24.19.0. The unchanged formula test passed through Homebrew's `Formula.run_test` and assertion helpers, checking the CLI version and offline entity-resolution schema. `brew audit --new --formula` passed against the published remote tap.

The standard `brew test --force` command stopped at dependency preflight because the local runtime and several libraries were older than the current Homebrew catalog. It did not execute the test block. No dependency was upgraded to bypass that check. Linux, Intel macOS and the full current dependency matrix remain unverified.

Our validation environment uses a seven-day release-age policy. On October 5, the current Homebrew dependency OpenSSL 3.6.5 was still too new under that policy. It becomes eligible for our next validation run on October 6, 2026 at 14:01:50 UTC. We will recheck the dependency catalog before that run. This date applies to our validation environment; it is not an installation requirement for all users.

The release archive is SHA-256 checked and has no runtime npm dependencies. Installation uses Homebrew's npm helper with lifecycle scripts disabled. No account credential or network research request is needed for the formula test.

## Maintain the formula

Update the immutable npm release URL and SHA-256 together. Check the current CLI version independently from MCP server versions. Run a fresh install, formula test and audit before publishing each formula change. Record the actual Node version and any untested host or dependency combination.
