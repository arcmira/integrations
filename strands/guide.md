# Search YouTube and podcast transcripts from a Strands agent

Search YouTube videos and podcast transcripts for quotes and clips, first with a direct tool call and then from a Strands agent. Each result keeps the exact quote, the speakers when the transcript names them, and a watch link cued to the second.

You need Python 3.10 or later and an [Arcmira](https://arcmira.com) account.

## Install the adapter

```bash
python -m pip install strands-arcmira
```

## Set your API key

Create an API key in your Arcmira account. Set the key in the environment where your code runs:

```bash
export ARCMIRA_API_KEY="your-api-key"
```

Do not put the key in an agent prompt or a tool argument.

## Run a search

A direct tool call uses your Arcmira key and no model provider. Keep the topic in a `query` variable so that the later steps can reuse it.

```python
from urllib.parse import urljoin

from strands_arcmira import arcmira_search

query = "AI video production"


def show(result):
	for passage in result["chunks"]:
		print(passage["text"])
		print("Video:    ", passage.get("video_title") or "Unknown")
		print("Channel:  ", passage.get("channel_name") or "Unknown")
		print("Published:", (passage.get("published_at") or "Unknown")[:10])
		if passage.get("speakers"):
			print("Speakers: ", ", ".join(passage["speakers"]))
		watch = urljoin("https://arcmira.com", passage["watch_url"])
		print("Watch:    ", watch)
		print()


show(arcmira_search(q=query))
```

For each passage, `show` prints the quote, the video, the channel, the publication date, and the watch link. `show` prints the speakers when the result supplies them.

A search with the default `limit` of 5 uses no credits. Before you raise `limit`, read [usage and billing](https://arcmira.com/docs/usage-and-billing).

## Limit the search to recent videos

Search videos published in the last 60 days. Your account's coverage window applies.

```python
from datetime import datetime, timedelta, timezone

now = datetime.now(timezone.utc)
day = timedelta(days=1)
after = (now - 60 * day).isoformat()
before = now.isoformat()

recent = arcmira_search(q=query, after=after, before=before)
print("Window starts:", recent["window"]["after"])
show(recent)
```

Check the returned window and coverage notes before drawing conclusions about recent conversations.

## Filter by a person or a company

The `by` and `about` filters take entity IDs, not names. Resolve the name first.

```python
import json

from strands_arcmira import arcmira_resolve

name = "PlanetScale"
candidates = arcmira_resolve(q=name, type="organization")
print(json.dumps(candidates, indent=2))
```

Read the candidates and copy the ID of the entity you mean. If more than one candidate fits, ask the person who made the request. Do not guess an ID.

```python
entity_id = "PASTE_THE_ID"
entity_query = "database"
show(arcmira_search(q=entity_query, about=entity_id))
```

`about` narrows the keyword search to passages mentioning the entity. To find a person speaking the query words, resolve the person and pass the ID as `by`.

## Give the tools to an agent

Configure a [Strands model provider](https://strandsagents.com/latest/documentation/docs/user-guide/concepts/model-providers/amazon-bedrock/) before running this example. `Agent()` defaults to Amazon Bedrock, which needs AWS credentials and model access. Model usage is billed separately from Arcmira.

```python
from strands import Agent
from strands_arcmira import arcmira_resolve, arcmira_search

query = "AI video production"

agent = Agent(tools=[arcmira_search, arcmira_resolve])
agent(
	f"Find five passages about {query}. "
	"Keep the exact quotes and timestamped watch links. "
	"Include speaker attribution when the result supplies it."
)
```

## Keep the source attached

Open the watch link to inspect the surrounding exchange before quoting it. An empty result does not prove that something was never said, and speaker labels cover only part of the index.

Want coverage for a channel, speaker, industry, or workflow? [Help shape the index](https://arcmira.com/docs/feedback#help-shape-the-index). Tell us what you want to research and why it matters. Feedback is free to give and helps us prioritize what to build next.

## Keep going

- Read the [README](https://github.com/arcmira/integrations/tree/master/packages/strands) for every parameter, the response fields, and the error behavior.
- [Continue this investment research example workflow](https://arcmira.com/docs/workflows/investment-research). You will learn how to test competing explanations, inspect the surrounding exchanges, and bring timestamped sources into a research brief.
- Read the [API documentation](https://arcmira.com/docs) for the rest of the Arcmira API.
