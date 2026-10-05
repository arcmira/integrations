import arcmira from "../../arcmira.app.mjs";
import { text, integer, option, ids, CHANNEL_ID, ENTITY_ID, SOURCES } from "../../common/input.mjs";

export default {
  key: "arcmira-search-transcripts",
  name: "Search YouTube Transcripts",
  description: "Find timestamped passages in indexed YouTube videos and livestreams. Returns the full response with source, coverage and account access metadata. [See API documentation](https://arcmira.com/docs/search)",
  version: "0.0.1",
  type: "action",
  annotations: { destructiveHint: false, openWorldHint: true, readOnlyHint: true },
  props: {
    arcmira,
    query: { type: "string", label: "Topic or Phrase", description: "One topic per call. Search coverage is limited to Arcmira's index." },
    channelIds: { type: "string[]", label: "YouTube Channel IDs", description: "Up to eight UC IDs. Resolve channel names separately and confirm the intended match.", optional: true },
    entityIds: { type: "string[]", label: "Entity IDs", description: "Up to eight ent_ IDs. A person ID scopes to that person's appearances; it does not guarantee they spoke each matching passage.", optional: true },
    after: { type: "string", label: "Published At or After", description: "ISO 8601 date or timestamp, inclusive. Account freshness limits still apply.", optional: true },
    before: { type: "string", label: "Published Before", description: "ISO 8601 date or timestamp, exclusive.", optional: true },
    source: { type: "string", label: "Transcript Source", options: SOURCES, description: "Preserves this source restriction. Premium access refusals are not replaced with another source.", optional: true },
    limit: { type: "integer", label: "Passage Limit", description: "Return 1 to 20 passages in one request.", default: 5, min: 1, max: 20, optional: true },
  },
  async run({ $ }) {
    const response = await this.arcmira.searchTranscripts($, {
      q: text(this.query, "Topic or phrase"),
      channel_ids: ids(this.channelIds, "Channel IDs", CHANNEL_ID),
      entity_ids: ids(this.entityIds, "Entity IDs", ENTITY_ID),
      after: text(this.after, "After", { optional: true }),
      before: text(this.before, "Before", { optional: true }),
      source: option(this.source, "Source", SOURCES),
      limit: integer(this.limit, "Passage limit", 20, 5),
    });
    if (!Array.isArray(response.chunks)) throw new Error("Arcmira search response is missing its chunks array.");
    $.export("$summary", `Returned ${response.chunks.length} passages within the reported index and account coverage. Check note, search_index and access before drawing conclusions.`);
    return response;
  },
};
