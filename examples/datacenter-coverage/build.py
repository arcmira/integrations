"""Write daily counts for the two windows in Arcmira's September 2026 edition."""
import csv
from datetime import datetime, timedelta
import hashlib
import json
from pathlib import Path
import sys

SOURCE_SHA256 = "9d6374f55602b9d498a55d7c6019c710b58bd112785fafcc2f2894edc11177a1"


def instant(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def main(path):
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        sys.exit("The source differs from the cited September 2026 snapshot.")
    source = json.loads(raw)
    videos = source["videos"]
    if len({row["video_id"] for row in videos}) != len(videos):
        sys.exit("The snapshot contains duplicate video IDs.")

    writer = csv.writer(sys.stdout, lineterminator="\n")
    writer.writerow(["period", "day", "start_utc", "end_utc", "videos", "active_channels"])
    for period in ("previous", "current"):
        start, end = map(instant, source["momentum"][period + "_window"])
        for i in range((end - start).days):
            lower = start + timedelta(days=i)
            upper = lower + timedelta(days=1)
            rows = [r for r in videos if lower <= instant(r["published_at"]) < upper]
            channels = {r["channel_id"] for r in rows}
            writer.writerow([period, i + 1, lower.isoformat(), upper.isoformat(), len(rows), len(channels)])


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 build.py topic-videos.json")
    main(Path(sys.argv[1]))
