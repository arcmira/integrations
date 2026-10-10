import { tool, type DynamicStructuredTool } from "@langchain/core/tools";
import { ArcmiraClient } from "arcmira";
import { z } from "zod";
import { searchInput, resolveInput } from "./inputs.js";

export type ArcmiraToolsOptions = {
  apiKey: string;
  fetch?: typeof fetch;
};

export type ArcmiraTools = [
  DynamicStructuredTool<typeof searchInput, z.output<typeof searchInput>, z.input<typeof searchInput>, Awaited<ReturnType<ArcmiraClient["transcripts"]["search"]>>>,
  DynamicStructuredTool<typeof resolveInput, z.output<typeof resolveInput>, z.input<typeof resolveInput>, Awaited<ReturnType<ArcmiraClient["entities"]["resolve"]>>>,
];

export function createArcmiraTools(options: ArcmiraToolsOptions): ArcmiraTools {
  const apiKey = z.string().trim().min(1).parse(options.apiKey);
  const client = new ArcmiraClient({ apiKey, fetch: options.fetch, maxRetries: 0 });
  return [
    tool(
      (input, config) => client.transcripts.search(input, { abortSignal: config.signal }),
      {
        name: "arcmira_search",
        description: "Search indexed YouTube transcripts for timestamped passages. Use one topic per call. Resolve names with arcmira_resolve before using ID filters. Preserve returned coverage notes and source links. Account access and speaker coverage vary. A paid read uses credits from your plan, then your on-demand budget. Do not silently widen refused filters or substitute another transcript source.",
        schema: searchInput,
      },
    ),
    tool(
      (input, config) => client.entities.resolve(input, { abortSignal: config.signal }),
      {
        name: "arcmira_resolve",
        description: "Resolve one person, organization, product, topic or channel name to Arcmira IDs before searching. Use the user's context to disambiguate. Preserve ambiguous candidates instead of treating a suggestion as confirmed. Use a channel's returned youtube_channel_id in the search channel_ids filter.",
        schema: resolveInput,
      },
    ),
  ];
}
