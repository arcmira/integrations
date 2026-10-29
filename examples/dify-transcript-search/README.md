# YouTube transcript search workflow for Dify

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Dify plugin](https://marketplace.dify.ai/plugin/arcmira/arcmira)

Find timestamped passages for a research brief or clip shortlist. This three-node workflow takes a topic and publication-date window, searches with the Arcmira plugin, and returns the complete JSON response. It uses no language model and contains no credentials.

## Import and run

1. Install the [Arcmira plugin](https://marketplace.dify.ai/plugin/arcmira/arcmira) in your Dify workspace. The template was tested with version 0.1.3. The DSL does not install a plugin automatically.
2. Configure your own [Arcmira API key](https://arcmira.com/docs/authentication) in the plugin's secret credential field.
3. Download [arcmira-transcript-search.yml](arcmira-transcript-search.yml). In Dify Studio, choose **Create → Import App**, select the file, and create the workflow.
4. Open **YouTube transcript search** and select your saved authorization. The imported node uses your workspace default when one exists.
5. Choose **Test Run** and enter a topic, an inclusive start date and an exclusive end date.

For example:

| Input | Value |
| --- | --- |
| Topic or phrase | `AI agents` |
| Published on or after | `2026-08-01` |
| Published before | `2026-09-01` |

The limit is three passages. To include September 1, use `2026-09-02` as the end date. Use a date window available to your plan; access errors should be resolved explicitly rather than silently changing the requested scope.

## Use the output

`transcript_results` is an array containing the full search response. Each passage includes its text, timestamp, source label and source link. Speaker attribution appears where available. Keep the response's window, coverage notes and partial-result information when passing it to a later step.

This is source discovery for research or editing. It does not download or edit video, generate new transcripts, or establish rights to reuse media. Review the original recording and surrounding context before quoting or clipping. The template does not request a specific transcript source; if you add `source=arcmira_premium`, an access refusal must not become a caption fallback.

A paid read uses credits from your plan, then your on-demand budget. See [usage and billing](https://arcmira.com/docs/usage-and-billing). No language-model tokens does not mean every API request is free.

## Verification

On October 29, 2026, this file imported into Dify Cloud and completed all three steps with the installed Arcmira 0.1.3 plugin. The example inputs returned three passages with the requested date window, source links, source labels and coverage notes. Dify reported success in 3.839 seconds and zero model tokens. This is one observed run, not a latency guarantee.

Dify displayed a version-difference caution for DSL 0.3.1; import and execution still succeeded. The file uses JSON syntax, which is valid YAML, with a literal UTF-8 icon. No API key, saved credential identifier or account identifier is included.
