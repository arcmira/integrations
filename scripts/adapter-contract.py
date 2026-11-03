"""Build the standalone OpenAPI document for the search and resolve adapters."""
import argparse
import json
from pathlib import Path

PACKAGES = Path(__file__).resolve().parents[1] / "packages"
SOURCE = PACKAGES / "pipedream/test/fixtures/openapi.json"
OUTPUT = PACKAGES / "openapi.json"
PATHS = ("/v1/search", "/v1/entities/resolve")


def subset(source):
    paths = {path: source["paths"][path] for path in PATHS}
    components = {}

    def include(group, name):
        items = components.setdefault(group, {})
        if name not in items:
            items[name] = source["components"][group][name]
            collect(items[name])

    def collect(value):
        if isinstance(value, list):
            for item in value:
                collect(item)
        elif isinstance(value, dict):
            if "$ref" in value:
                prefix, group, name = value["$ref"].rsplit("/", 2)
                if prefix != "#/components":
                    raise ValueError(f"Unsupported reference {value['$ref']}")
                include(group, name)
            for child in value.values():
                collect(child)

    collect(paths)
    for path in paths.values():
        for operation in path.values():
            for requirement in operation["security"]:
                for name in requirement:
                    include("securitySchemes", name)
    return {key: source[key] for key in ("openapi", "info", "servers")} | {
        "paths": paths,
        "components": components,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = subset(json.loads(SOURCE.read_text()))
    if args.check:
        if json.loads(OUTPUT.read_text()) != expected:
            raise SystemExit("Regenerate the adapter contract with python3 scripts/adapter-contract.py")
    else:
        OUTPUT.write_text(json.dumps(expected, indent=2, ensure_ascii=False) + "\n")
