import arcmira from "../../arcmira.app.mjs";
import { text, integer, option, ENTITY_TYPES } from "../../common/input.mjs";

export default {
  key: "arcmira-resolve-entity",
  name: "Resolve Entity",
  description: "Resolve a person, organization, product, topic or channel to candidates and canonical IDs. Suggestions remain suggestions; no candidate is selected automatically. [See API documentation](https://arcmira.com/docs/search)",
  version: "0.0.1",
  type: "action",
  annotations: { destructiveHint: false, openWorldHint: true, readOnlyHint: true },
  props: {
    arcmira,
    query: { type: "string", label: "Name or Handle", description: "One name, YouTube handle, channel URL or ID per call." },
    entityType: { type: "string", label: "Entity Type", options: ENTITY_TYPES, optional: true },
    context: { type: "string", label: "Context", description: "2 to 300 characters describing the intended entity. A context-ranked suggestion still requires confirmation.", optional: true },
    limit: { type: "integer", label: "Candidate Limit", default: 8, min: 1, max: 15, optional: true },
  },
  async run({ $ }) {
    const response = await this.arcmira.resolveEntity($, {
      q: text(this.query, "Name or handle"),
      type: option(this.entityType, "Entity type", ENTITY_TYPES),
      context: text(this.context, "Context", { optional: true, max: 300 }),
      limit: integer(this.limit, "Candidate limit", 15, 8),
    });
    if (!Array.isArray(response.candidates)) throw new Error("Arcmira entity response is missing its candidates array.");
    $.export("$summary", `Returned ${response.candidates.length} entity candidates. Check confidence, best, suggested and ask; confirm uncertain matches before using an ID.`);
    return response;
  },
};
