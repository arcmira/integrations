import { z } from "zod";

export const searchInput = z.object({
  q: z.string().min(2).describe("One topic or phrase. Do not concatenate unrelated names; make one call per topic."),
  channel_ids: z.string().optional().describe("Comma-separated YouTube channel ids (UC...), at most 8. Pass every show in scope unless drilling into one. Ids only: a name answers 400 id_required. Resolve names first with GET /v1/entities/resolve."),
  channel: z.string().optional().describe("Alias of channel_ids for code-mode clients; the union of both is the scope."),
  entity_ids: z.string().optional().describe("Comma-separated entity ids (ent_{n}), at most 8. A person id filters to that person's appearances; a channel id widens channel_ids. Ids only: a name answers 400 id_required. Resolve names first with GET /v1/entities/resolve."),
  about: z.string().optional().describe("Comma-separated entity ids (ent_{n}), at most 8. Only passages about these entities: excerpt pins, exact-name mentions and ad verdicts. Ids only: a name answers 400 id_required. Resolve names first with GET /v1/entities/resolve."),
  by: z.string().optional().describe("Comma-separated person ids (ent_{n}), at most 8. Only passages where one of these people says the query words (each line of a chunk is labeled with its speaker); a non-person id is refused with invalid_query naming its type. Speaker labels cover a minority of shows; an empty result carries a note saying whether the person is labeled anywhere. Ids only: a name answers 400 id_required. Resolve names first with GET /v1/entities/resolve."),
  kind: z.string().optional().describe("Comma-separated passage classes: sponsored, organic, mention. Combine with about to read what was said about a brand in ad reads or in organic talk."),
  after: z.string().optional().describe("Only media published at or after this instant. An after later than your plan's freshness gate is refused with freshness_requires_paid rather than widened. An ISO 8601 date (2026-09-01) or datetime with offset (2026-09-01T00:00:00Z), read in UTC. The window is half-open: after is inclusive, before is exclusive."),
  before: z.string().optional().describe("Only media published before this instant, so before=2026-09-02 includes all of 2026-09-01. An ISO 8601 date (2026-09-01) or datetime with offset (2026-09-01T00:00:00Z), read in UTC. The window is half-open: after is inclusive, before is exclusive."),
  source: z.enum(["arcmira_premium", "creator_captions", "third_party_quick"]).optional().describe("Restrict to one transcript source class. arcmira_premium on a plan without Premium transcripts is refused with filter_requires_paid."),
  limit: z.number().int().min(1).max(20).optional().describe("Chunks to return, 1 to 20. Default 5."),
}).strict();

export const resolveInput = z.object({
  q: z.string().min(2).describe("A name, @handle, YouTube URL or channel id (UC...). One thing per call."),
  type: z.enum(["person", "organization", "product", "topic", "channel"]).optional().describe("Restrict candidates to one type. Pass channel for a show and read best.youtube_channel_id."),
  limit: z.number().int().min(1).max(15).optional().describe("Candidates to return, 1 to 15. Default 8."),
  context: z.string().min(2).max(300).optional().describe("What the user said about the name, in their words (\"the startup bank\", \"Canada's prime minister\", \"on My First Million\"). Ranks candidates by their description and by the episodes they share with what the context names; a clear winner comes back as suggested with reason context."),
}).strict();
