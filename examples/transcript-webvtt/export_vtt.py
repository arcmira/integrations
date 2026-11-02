"""Convert a saved, timestamped Arcmira transcript response to WebVTT."""
import argparse
import json
import math
import sys
from html import escape


def milliseconds(seconds):
    if type(seconds) not in (int, float) or not math.isfinite(seconds) or seconds < 0:
        raise ValueError("cue times must be nonnegative, finite seconds")
    return round(seconds * 1000)


def timestamp(ms):
    seconds, fraction = divmod(ms, 1000)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02}:{minutes:02}:{seconds:02}.{fraction:03}"


def cue_text(value):
    if not isinstance(value, str) or not value.strip() or "\0" in value:
        raise ValueError("expected nonempty text without null characters")
    return escape(" ".join(value.split()), quote=False)


def to_webvtt(transcript):
    if not isinstance(transcript, dict) or transcript.get("state") != "ready":
        raise ValueError("expected a ready transcript response")
    lines = transcript.get("lines")
    if not isinstance(lines, list) or not lines:
        raise ValueError("expected transcript lines saved with timestamps=true")
    speakers = {s["id"]: s["name"] for s in (transcript.get("speakers") or [])}
    cues = []
    for number, line in enumerate(lines, start=1):
        start = milliseconds(line["start"])
        end = milliseconds(line["end"])
        if end <= start:
            raise ValueError(f"line {number} has no positive duration at millisecond precision")
        text = cue_text(line["text"])
        speaker_id = line.get("speaker")
        if speaker_id is not None:
            if speaker_id not in speakers:
                raise ValueError(f"line {number} refers to a speaker missing from this response")
            text = f"<v {cue_text(speakers[speaker_id])}>{text}</v>"
        cues.append((start, f"{timestamp(start)} --> {timestamp(end)}\n{text}"))
    cues.sort(key=lambda cue: cue[0])
    return "WEBVTT\n\n" + "\n\n".join(text for _, text in cues) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("response", type=argparse.FileType("r", encoding="utf-8"))
    args = parser.parse_args()
    try:
        with args.response as stream:
            result = to_webvtt(json.load(stream))
    except (ValueError, TypeError, KeyError) as error:
        parser.exit(1, f"Cannot export WebVTT: {error}\n")
    sys.stdout.buffer.write(result.encode("utf-8"))
