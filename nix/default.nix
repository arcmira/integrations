{ system ? builtins.currentSystem }:
let
  nixpkgs = builtins.fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/bfdc17373049aec7e5a4ad159f614c7a7c2e050c.tar.gz";
    sha256 = "sha256-NTjASztGsZTT2auptwyiAWLmDIpy1meEOMzjAYVAWRI=";
  };
  pkgs = import nixpkgs { inherit system; };
in
pkgs.callPackage ./package.nix { }
