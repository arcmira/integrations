"""Export the saved quote demo as JSON without executing JavaScript or calling APIs."""
import json
from pathlib import Path
import sys


source = Path(__file__).with_name("fixture.js").read_text(encoding="utf-8")
_, separator, payload = source.partition("window.QUOTE_FIXTURE = ")
if not separator:
    raise SystemExit("fixture.js is missing its QUOTE_FIXTURE assignment")
shortlist = json.loads(payload.strip().removesuffix(";"))
json.dump(shortlist, sys.stdout, ensure_ascii=False, indent=2)
sys.stdout.write("\n")
