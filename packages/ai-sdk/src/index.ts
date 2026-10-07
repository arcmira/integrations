import { tool, type Tool } from "ai";
import { ArcmiraClient } from "arcmira";
import { z } from "zod";
import { searchInput, resolveInput } from "./inputs.js";

export type ArcmiraToolsOptions = {
  apiKey: string;
  fetch?: typeof fetch;
};

export type ArcmiraTools = {
  arcmiraSearch: Tool<z.infer<typeof searchInput>, Awaited<ReturnType<ArcmiraClient["transcripts"]["search"]>>>;
  arcmiraResolve: Tool<z.infer<typeof resolveInput>, Awaited<ReturnType<ArcmiraClient["entities"]["resolve"]>>>;
};

export function createArcmiraTools(options: ArcmiraToolsOptions): ArcmiraTools {
  const apiKey = z.string().trim().min(1).parse(options.apiKey);
  const client = new ArcmiraClient({
    apiKey,
    fetch: options.fetch,
    maxRetries: 0,
  });
  return {
    arcmiraSearch: tool({
      description:
        "Search indexed YouTube transcripts for timestamped passages. Use one topic per call. Resolve names with arcmiraResolve before using ID filters. Source coverage and publication-date access vary by account. Speaker labels cover a minority of shows. Preserve returned coverage notes and source links. A paid read uses credits from your plan, then any top-up credits, then your on-demand budget. Do not silently widen refused filters or substitute another transcript source.",
      inputSchema: searchInput,
      execute: (input, { abortSignal }) =>
        client.transcripts.search(input, { abortSignal }),
    }),
    arcmiraResolve: tool({
      description:
        "Resolve one person, organization, product, topic or channel name to Arcmira IDs before searching. Use the user's context to disambiguate. Preserve ambiguous candidates instead of treating a suggestion as confirmed. For a channel, use the returned youtube_channel_id in the search channel_ids filter.",
      inputSchema: resolveInput,
      execute: (input, { abortSignal }) =>
        client.entities.resolve(input, { abortSignal }),
    }),
  };
}
