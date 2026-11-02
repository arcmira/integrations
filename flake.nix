{
  description = "Arcmira CLI for YouTube transcript search";

  outputs = { self }: {
    packages = builtins.listToAttrs (map (system: {
      name = system;
      value.default = import ./nix { inherit system; };
    }) [ "aarch64-linux" "x86_64-linux" "aarch64-darwin" ]);
  };
}
