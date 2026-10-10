# Arcmira: YouTube Transcript Search

[Arcmira](https://arcmira.com) · [API documentation and quickstart](https://arcmira.com/docs) · [Authentication](https://arcmira.com/docs/authentication) · [Usage](https://arcmira.com/docs/usage-and-billing)

Local native component candidate for the Pipedream Connect/MCP tool registry. These components have not been published or tested on Pipedream. Managed authentication requires Pipedream to register the Arcmira app and its API-key field. Existing request: [PipedreamHQ/pipedream#22142](https://github.com/PipedreamHQ/pipedream/issues/22142).

Arcmira searches indexed YouTube videos and livestreams, including podcast shows. Find timestamped passages, resolve entities and inspect recurring channel sponsors.

| Action | Result |
| --- | --- |
| Search YouTube Transcripts | Full API response with passages, timestamps, source classes, filters, publication window, index coverage, notes and any access restriction. |
| Resolve Entity | Full response with confidence, best match, suggestions, clarification options and candidates. No automatic selection or follow-up request. |
| List Channel Sponsors | Full response with channel, sponsor evidence, returned/total counts and any account access restriction. |

Connect a customer-owned Arcmira API key with read access. The connection test uses `/v1/me` and does not require a remaining usage allowance. Credentials belong in Pipedream's managed connection, never action inputs.

A paid read uses credits from your plan, then your on-demand budget. Account limits still apply. These actions do not request transcript generation or mutate monitors.

Each action makes one bounded request. The selected endpoints have no cursor/offset parameter in the current API contract. Sponsor filters are unset by default; advanced filters require Pro+. Explicit filters and source choices are never dropped after a refusal. No automatic retry or alternate data source is used.

Actions return the complete envelope rather than a bare array so a limited or incomplete result cannot lose its explanation. This is an intentional exception to Pipedream's general list-action preference. Map `chunks` or `sponsors` into later steps while retaining `access`, `note`, `search_index`, `window` and `meta` wherever present. HTTP metadata is exported separately as `http`; structured refusals are exported as `arcmira_error` before the action fails.

Resolve a channel name first, inspect uncertainty and confirm the intended match before using `youtube_channel_id`. `suggested`, `ask` or fuzzy confidence must not be silently promoted into a confirmed ID. A person filter covers appearances; it does not establish that person spoke every matching passage.

Index coverage and account restrictions can make results partial. Empty results do not prove absence. Sponsor classifications can be uncertain and are not exhaustive. Source captions and Premium transcripts are different source classes; explicit Premium filters are preserved.

## Connect and MCP testing route

Pipedream Workflows and String close on March 31, 2027. New Workflows signups are closed. Connect API, MCP Servers and API Proxy remain supported. These native action modules use the shared component format, so their target is Connect and its tool registry. [Official announcement](https://pipedream.com/docs/workflows) · [Component registry](https://pipedream.com/docs/components)

Private custom-tool publishing requires a Business plan. General free Connect development does not establish access to that feature. Confirm an existing entitlement or ask Pipedream for a contributor test route under request #22142 before any paid upgrade. [Custom-tool requirements](https://pipedream.com/docs/connect/components/custom-tools)

Once managed app registration and test access are available, publish each action with `pd publish <action.mjs> --connect-environment development`. Private component IDs receive a `~/` prefix. Invoke them through `POST /v1/connect/{project_id}/actions/run` with `X-PD-Environment: development`, a server-side Pipedream access token, a stable `external_user_id` and `configured_props.arcmira.authProvisionId` for that user's approved isolated account. Inspect `ret`, `exports` and host error observations. [Executing actions](https://pipedream.com/docs/connect/components/actions)

Published custom actions are documented as available to the relevant app's MCP server; verify actual discovery after publication. None of these host steps has run for this candidate. No new Workflows or String setup is required.
