# Arcmira: YouTube Transcript Search

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [Plans and usage](https://arcmira.com/docs/usage-and-billing)

An Appsmith source-shortlist demo for reviewing passages and timestamps before choosing clips. The three recordings and passages are invented. The import contains no API datasource, credentials, live query, media download or automatic action.

## Try the demo

1. Import [arcmira-source-shortlist.appsmith.json](arcmira-source-shortlist.appsmith.json) as a new Appsmith application. Native import, row selection, reset and empty actions, and populated and empty CSV and JSON downloads passed in Appsmith on October 8, 2026. The private live connection remains unverified.
2. Select a row to inspect its synthetic passage. Use **Empty demo** and **Reset demo** to switch between zero and three rows.
3. Download CSV or JSON. CSV retains requested dates and coverage fields on each row. JSON also preserves metadata when there are no rows; an empty CSV has only the header.

All demo timestamps are invented. Source IDs, publication dates, applied window, partial-result status and search-index health are unknown and remain null in JSON. CSV represents null as an empty cell. It quotes every field and prefixes formula-like text with an apostrophe. JSON retains the original text. The table's built-in CSV export is disabled so downloads use the tested formatter.

## Add a manual query in a private fork

This is a setup recipe, not an installed live integration. The fixture packet is a demo view model, not the literal API response. Keep the original public template fixture-only. A secret stored on Appsmith's server can still authorize queries run by public viewers.

1. Fork or import into a private app. Check its sharing settings before adding a credential. Do not publish or showcase this connected copy.
2. Create an [Authenticated API datasource](https://docs.appsmith.com/connect-data/reference/authenticated-api) with URL `https://api.arcmira.com`. Choose **Bearer Token** and enter your own [Arcmira key](https://arcmira.com/docs/authentication) in the datasource's token field. Keep it out of JS, widget values, query parameters, screenshots and exported files.
3. Create a JSObject named `PrivateSourceSheet`. Replace its body with the complete contents of [PrivateSourceSheet.mjs](PrivateSourceSheet.mjs), including `export default`. Set the topic and dates in its `request()` method. This companion is excluded from the public import.
4. Create a query named `Arcmira_Search` using your authenticated datasource: `GET /v1/search`. Keep encoding enabled and set these parameters:

   | Parameter | Value |
   | --- | --- |
   | `q` | `{{PrivateSourceSheet.request().q}}` |
   | `after` | `{{PrivateSourceSheet.request().after}}` |
   | `before` | `{{PrivateSourceSheet.request().before}}` |
   | `limit` | `3` |

5. In [query settings](https://docs.appsmith.com/connect-data/reference/query-settings), select **Manual**. Do not enable automatic or page-load execution. Make these widget changes:

   | Widget / property | Replacement |
   | --- | --- |
   | Sources / Table data | `{{PrivateSourceSheet.packet().candidates}}` |
   | Sources / column labels | Change Demo recording to Recording and Synthetic passage to Passage |
   | Demo / Text | Search |
   | Demo / onClick | `{{PrivateSourceSheet.search()}}` |
   | Demo / Disabled | `{{PrivateSourceSheet.packet().status === "loading"}}` |
   | EmptyDemo | Delete this button |
   | CSV / onClick | `{{PrivateSourceSheet.downloadCSV()}}` |
   | JSONExport / onClick | `{{PrivateSourceSheet.downloadJSON()}}` |
   | CSV and JSONExport / Disabled | `{{PrivateSourceSheet.packet().status !== "ready"}}` |
   | DemoNotice / Text | Private live-query app. Search runs only when you click Search. |
   | Window / Text | `{{JSON.stringify(PrivateSourceSheet.request())}}` |
   | Selection / Text | `{{Sources.selectedRow && Sources.selectedRow.text ? Sources.selectedRow.text + " | Start: " + Sources.selectedRow.start_seconds + " seconds | Source: " + Sources.selectedRow.watch_url : "No passage selected."}}` |
   | Coverage / Text | `{{PrivateSourceSheet.summary()}}` |
   | Setup / Text | Review source context and reuse rights before editing. Keep this connected app private. |

6. Add two ordinary Button widgets for the selected row:

   | Button | onClick | Disabled |
   | --- | --- | --- |
   | Open in Arcmira | `{{navigateTo(Sources.selectedRow.arcmira_url, {}, "NEW_WINDOW")}}` | `{{!Sources.selectedRow || !Sources.selectedRow.arcmira_url}}` |
   | Open on YouTube | `{{navigateTo(Sources.selectedRow.original_source_url, {}, "NEW_WINDOW")}}` | `{{!Sources.selectedRow || !Sources.selectedRow.original_source_url}}` |

7. Click **Search** once. The companion clears previous rows before the request, then maps the returned passages and coverage or shows a safe error. It makes no automatic retries. Check a refusal in the private query editor before trying again. CSV and JSON use filenames without the synthetic label; JSON includes the original response and retains coverage when no passages match.

The import loads in Appsmith and renders three synthetic rows, source links and export controls. Row selection, reset and empty actions, and all four populated and empty exports passed native checks. The private live connection still needs native verification.

`after` is inclusive and `before` is exclusive, in UTC. Choose a window permitted by your plan. This recipe makes one search request with a fixed limit of three; it does not retrieve Premium transcripts or write monitors. A paid read uses credits from your plan, then your on-demand budget. See current plan limits in the usage documentation above.

The companion maps the released API's `chunks`: `video_title` becomes title, `source` becomes transcript type, and `start_seconds` stays the source offset. It preserves source IDs, channel details, publication dates, watch URLs and available speaker labels. The requested dates remain separate from the API's applied `window`. Missing `partial` remains null. `search_index`, `note`, any `access` gate, and the entire original response remain available in JSON. The raw `watch_url` remains unchanged. The companion also supplies an absolute `arcmira_url` only for a watch URL on the fixed Arcmira origin, and an `original_source_url` only for a valid 11-character YouTube ID. Unknown timestamps omit the YouTube time parameter; invalid negative or non-integer offsets fail the response check.
Search covers indexed YouTube material. A timestamp helps navigate to a passage; it is not a verified edit boundary. Watch the source, check context and attribution, select cut boundaries and establish any required reuse rights before publishing clips. Empty results do not establish that a topic was never discussed.

## Verification and maintenance

Run `node --test examples/appsmith-source-shortlist/source-sheet.test.mjs` from the repository root. The tests check demo/empty state, private success/empty/error mapping, CSV formula handling, original JSON preservation, and that the import matches [SourceSheet.mjs](SourceSheet.mjs) with no API or on-load actions. They do not prove Appsmith import, rendering or browser downloads; those require a native check.

Appsmith's serialized application, stock widgets and JS collection format come from its official import fixtures, pinned in [provenance.json](provenance.json). Both published and unpublished copies contain the same demo. When editing `SourceSheet.mjs`, update both collection bodies and each exported action body in the JSON; the tests reject mismatches.

## License

Copyright 2026 Arcmira. Apache-2.0, as in the integrations repository; see [LICENSE](LICENSE). Appsmith fixture-derived structures retain their attribution in [NOTICE](NOTICE). This license does not grant rights to third-party video or transcript content or replace Arcmira's service terms.
