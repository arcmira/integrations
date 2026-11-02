{
  description = "Arcmira CLI for YouTube and podcast transcript search";

  outputs = { self }: {
    packages = builtins.listToAttrs (map (system: {
      name = system;
      value = let arcmira = import ./nix { inherit system; }; in {
        inherit arcmira;
        default = arcmira;
      };
    }) [ "aarch64-linux" "x86_64-linux" "aarch64-darwin" ]);
  };
}
