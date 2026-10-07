# Source and verification boundaries

Arcmira authored the service runtime, component declarations, documentation and three behavior-test files in this package. They use Apache-2.0 under `LICENSE`. The service and component versions are 1.0.4. This unreleased candidate changes usage descriptions, version metadata and documentation relative to the hosted-tested 1.0.3 release. Request behavior is unchanged. The reviewed-file hashes cover this candidate, not the historical 1.0.3 archive.

The context stub in `service/artifacts/test/context.js` was independently written for the APIs used by these tests. It records calls and returns configured synthetic responses. It does not import or copy Appmixer's test utilities. Tests use Node's built-in test runner.

The official Appmixer manifest schema, upstream test utilities and E2E flow templates are excluded. Three assertions against that external manifest schema have been removed. The corresponding tests still check our declared output schemas, service identity, method list and write-capability description. All 160 behavior tests remain; none is skipped. Passing this suite does not establish current official manifest conformance or marketplace acceptance.

AJV and its five supporting packages retain their own licenses. `package-lock.json` reuses the exact versions and integrity hashes from the October 5, 2026 validation environment. `dependency-age.json` records the prior release-age audit for those six packages. No Mocha, Sinon or upstream CLI package is needed.

`npm run pack:service` creates a service ZIP from thirteen explicit files, including the owned-code Apache-2.0 license. It excludes tests, test utilities, dependency folders, local credentials and tooling. `runtime-sha256.json` locks the eleven reviewed runtime/manifest files; documentation is independently maintained. ZIP metadata is fixed for reproducibility. It checks version consistency and reads every archive member back against its source bytes. Installability and runtime behavior still require the Appmixer host; a ZIP build does not publish the connector.
