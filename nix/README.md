# Arcmira: YouTube Transcript Search for Nix

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Authentication](https://arcmira.com/docs/authentication) · [CLI and SDK guide](https://github.com/arcmira/arcmira)

Build the Arcmira CLI from its published 0.5.1 source release with Nix. This is Arcmira's own package definition. It is not listed in Nixpkgs.

## Install

With Nix already installed:

```sh
git clone https://github.com/arcmira/integrations.git
cd integrations
nix-build nix
./result/bin/arcmira --version
nix-env -if ./nix
```

Then configure your [API key](https://arcmira.com/docs/authentication) and search:

```sh
export ARCMIRA_API_KEY='your-key'
arcmira search 'AI agents'
```

Search results retain timestamps and source links. A paid read uses credits from your plan, then your on-demand budget. See [usage and billing](https://arcmira.com/docs/usage-and-billing).

## Package contents

The package builds the CLI and TypeScript SDK from the GitHub release source, using its locked npm dependencies. It includes all six agent skill guides, the API reference and license. The wrapper disables the CLI's automatic update check; update through this Nix package instead.

`default.nix` pins Nixpkgs and its hash. `package.nix` can also be used with your own package set:

```nix
pkgs.callPackage /path/to/integrations/nix/package.nix { }
```

## Validation

On October 8, 2026, CLI 0.5.1 passed the source build, all 70 fixture tests and the documented install commands in an aarch64-linux container with Node 24.20.0. The installed CLI returned the expected version and entity-resolution schema. Nix sandboxing was disabled inside the disposable container; native sandboxed hosts remain unverified. See the [release status](../RELEASE.md) for the tested platform and version. These checks use local fixture responses and no live API credentials. Other platforms and an unpinned package set require their own validation.
