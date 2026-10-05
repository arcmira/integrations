"""Bounded Arcmira REST snapshots loaded by dlt into local JSONL files."""

import argparse
import os
from pathlib import Path
import re

import dlt
from dlt.destinations import filesystem
from dlt.sources.helpers.requests import Client
from dlt.sources.helpers.rest_client.paginators import JSONResponseCursorPaginator
from dlt.sources.rest_api import rest_api_source
from requests import HTTPError


def arcmira_source(
    api_key: str,
    *,
    query: str | None = None,
    channel_id: str | None = None,
    after: str | None = None,
    before: str | None = None,
    transcript_source: str | None = None,
    limit: int = 5,
    max_pages: int = 1,
    base_url: str = "https://api.arcmira.com/v1/",
):
    if not api_key or bool(query) == bool(channel_id):
        raise ValueError("Provide an API key and exactly one query or channel ID.")
    if not 1 <= limit <= 20 or not 1 <= max_pages <= 100:
        raise ValueError("Use limit 1–20 and max_pages 1–100.")
    if query and max_pages != 1:
        raise ValueError("Search has no pagination; max_pages must be 1.")
    if channel_id and not re.fullmatch(r"UC[A-Za-z0-9_-]{22}", channel_id):
        raise ValueError("Use a YouTube channel ID, not a channel name or URL.")
    if transcript_source and (
        channel_id
        or transcript_source
        not in {"arcmira_premium", "creator_captions", "third_party_quick"}
    ):
        raise ValueError("A transcript source filter applies only to search.")

    params = {"limit": limit}
    for name, value in {
        "q": query,
        "after": after,
        "before": before,
        "source": transcript_source,
    }.items():
        if value is not None:
            params[name] = value
    response_field = "chunks" if query else "episodes"

    def require_success(response, *args, **kwargs):
        if response.status_code != 200:
            raise HTTPError(
                f"Arcmira HTTP {response.status_code}: {response.text}",
                response=response,
            )
        body = response.json()
        if not isinstance(body, dict) or not isinstance(body.get(response_field), list):
            raise ValueError(
                f"Expected an Arcmira response containing {response_field}."
            )
        return response

    session = Client(
        request_timeout=30, request_max_attempts=1, raise_for_status=False
    ).session
    source = rest_api_source(
        {
            "client": {
                "base_url": base_url,
                "auth": {"type": "bearer", "token": api_key},
                "session": session,
            },
            "resources": [
                {
                    "name": "search_pages" if query else "channel_pages",
                    "write_disposition": "append",
                    "columns": {"response": {"data_type": "json"}},
                    "endpoint": {
                        "path": "search" if query else f"channels/{channel_id}/videos",
                        "params": params,
                        "paginator": "single_page"
                        if query
                        else JSONResponseCursorPaginator(
                            cursor_path="next_cursor",
                            cursor_param="cursor",
                            has_more_path="has_more",
                        ),
                        "data_selector": "$",
                        "response_actions": [require_success],
                    },
                    "processing_steps": [{"map": lambda page: {"response": page}}],
                }
            ],
        },
        name="arcmira",
        max_table_nesting=0,
    )
    return source.add_limit(max_pages)


def load_local(source, output: Path):
    output = output.resolve()
    pipeline = dlt.pipeline(
        pipeline_name="arcmira_rest",
        pipelines_dir=str(output / ".pipeline"),
        destination=filesystem(bucket_url=output.as_uri()),
        dataset_name="arcmira",
    )
    return pipeline.run(source, loader_file_format="jsonl")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--query")
    mode.add_argument("--channel-id")
    parser.add_argument("--after")
    parser.add_argument("--before")
    parser.add_argument(
        "--source", choices=["arcmira_premium", "creator_captions", "third_party_quick"]
    )
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--max-pages", type=int, default=1)
    parser.add_argument("--output", type=Path, default=Path("output"))
    args = parser.parse_args()
    source = arcmira_source(
        os.environ.get("ARCMIRA_API_KEY", ""),
        query=args.query,
        channel_id=args.channel_id,
        after=args.after,
        before=args.before,
        transcript_source=args.source,
        limit=args.limit,
        max_pages=args.max_pages,
    )
    print(load_local(source, args.output))


if __name__ == "__main__":
    main()
