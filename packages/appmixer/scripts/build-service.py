"""Package only the reviewed Appmixer service files, with stable ZIP metadata."""
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVICE = ROOT / "service"
FILES = [
    "LICENSE",
    "README.html",
    "auth.js",
    "bundle.json",
    "lib.js",
    "package.json",
    "service.json",
    "core/MakeApiCall/MakeApiCall.js",
    "core/MakeApiCall/component.json",
    "core/ResolveEntities/ResolveEntities.js",
    "core/ResolveEntities/component.json",
    "core/SearchTranscripts/SearchTranscripts.js",
    "core/SearchTranscripts/component.json",
]

version = json.loads((SERVICE / "package.json").read_text())["version"]
manifest = json.loads((ROOT / "runtime-sha256.json").read_text())
if manifest["version"] != version or set(manifest["files"]) != set(FILES) - {"README.html", "LICENSE"}:
    raise ValueError("Runtime provenance manifest does not match the service")
for name, expected in manifest["files"].items():
    if hashlib.sha256((SERVICE / name).read_bytes()).hexdigest() != expected:
        raise ValueError("Runtime differs from reviewed service: " + name)
for name in FILES:
    path = SERVICE / name
    if not path.is_file() or path.is_symlink():
        raise ValueError("Missing or non-regular service file: " + name)
    if name.endswith(".json"):
        data = json.loads(path.read_text())
        if "version" in data and data["version"] != version:
            raise ValueError("Service version mismatch: " + name)

output = ROOT / "dist" / ("appmixer.arcmira-" + version + ".zip")
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name in sorted(FILES):
        info = zipfile.ZipInfo("appmixer/arcmira/" + name, (1980, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, (SERVICE / name).read_bytes())

with zipfile.ZipFile(output) as archive:
    expected = {"appmixer/arcmira/" + name for name in FILES}
    if set(archive.namelist()) != expected or len(archive.namelist()) != len(FILES):
        raise ValueError("Unexpected service archive members")
    for name in FILES:
        if archive.read("appmixer/arcmira/" + name) != (SERVICE / name).read_bytes():
            raise ValueError("Archived file differs: " + name)

print(json.dumps({
    "path": str(output.relative_to(ROOT)),
    "version": version,
    "files": len(FILES),
    "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
    "bytes": output.stat().st_size,
}))
