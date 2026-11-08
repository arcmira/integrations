# Arcmira: YouTube Transcript Search

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [MCP setup](https://arcmira.com/docs/mcp-server) · [Download the recipe](https://raw.githubusercontent.com/arcmira/integrations/master/examples/goose-quote-search/quote-search.yaml)

YouTube transcript search and monitoring for your AI: exact quotes, full transcripts and speakers.

Give goose a topic to find up to five quoted passages across indexed videos and podcasts. Each result should include the channel, video title and a timestamped link so you can check the words against the recording.

Version 1.56 of goose includes the current working directory in MCP tool-call metadata. For a shared demo, run goose from a directory whose path you are comfortable sharing with the server.

Save the recipe as `quote-search.yaml`. Preview the instructions and topic without starting a model:

```sh
goose run --recipe ./quote-search.yaml --params 'topic=podcast ad reads' --render-recipe
```

With a model provider configured in goose, run the same command without `--render-recipe`. Sign in to Arcmira when goose prompts you. The recipe uses the hosted MCP server and exposes its reference and read tools. Search uses your account's [plan and usage settings](https://arcmira.com/docs/usage-and-billing).

The recipe asks goose to keep the speaker unnamed when the search result does not identify one and to retain any coverage limits. For an example you can inspect without signing in, open the [playable quote timeline](https://arcmira.github.io/integrations/quote-timeline/).
