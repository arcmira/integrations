{
  lib,
  buildNpmPackage,
  fetchFromGitHub,
  coreutils,
  runtimeShell,
}:

buildNpmPackage (finalAttrs: {
  pname = "arcmira";
  version = "0.5.1";

  src = fetchFromGitHub {
    owner = "arcmira";
    repo = "arcmira";
    tag = "v${finalAttrs.version}";
    hash = "sha256-UyAGdp1/+xBy8s/6lRbUxeBiQ6tq4dQDoOw8/1kiUm4=";
  };

  npmDepsHash = "sha256-get7ZFuBkHprzfFkacR8yHLWzhuhiRNKVYikLuXXVNE=";
  npmPackFlags = [ "--ignore-scripts" ];
  makeWrapperArgs = [ "--set ARCMIRA_NO_UPDATE_CHECK 1" ];

  preCheck = ''
    substituteInPlace tests/setup.test.mjs \
      --replace-fail '/usr/bin:/bin' '${lib.makeBinPath [ coreutils ]}' \
      --replace-fail '#!/bin/sh' '#!${runtimeShell}'
  '';

  doCheck = true;
  checkPhase = ''
    runHook preCheck
    export HOME="$TMPDIR/arcmira-home"
    export XDG_CONFIG_HOME="$TMPDIR/arcmira-config"
    export ARCMIRA_NO_UPDATE_CHECK=1
    unset ARCMIRA_API_KEY
    node --test tests/*.test.mjs
    runHook postCheck
  '';

  doInstallCheck = true;
  installCheckPhase = ''
    runHook preInstallCheck
    test "$("$out/bin/arcmira" --version)" = "$version"
    for skill in arcmira company-watch compare-shows find-quotes person-research sponsor-research; do
      test -s "$out/lib/node_modules/arcmira/skills/$skill/SKILL.md"
    done
    "$out/bin/arcmira" --help > "$TMPDIR/arcmira-help.txt"
    grep -i arcmira "$TMPDIR/arcmira-help.txt"
    runHook postInstallCheck
  '';

  meta = {
    description = "YouTube transcript search with timestamps, mentions, sponsors and recommendations";
    homepage = "https://arcmira.com";
    changelog = "https://github.com/arcmira/arcmira/releases/tag/v${finalAttrs.version}";
    license = lib.licenses.asl20;
    mainProgram = "arcmira";
  };
})
