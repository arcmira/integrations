import arcmira from "../../arcmira.app.mjs";
import { integer, option, CHANNEL_ID, SPONSOR_STATUSES } from "../../common/input.mjs";

export default {
  key: "arcmira-list-channel-sponsors",
  name: "List Channel Sponsors",
  description: "Find recurring sponsor evidence for an indexed YouTube channel. Preserves account access limits and count/total metadata. Classifications are not exhaustive or infallible. [See API documentation](https://arcmira.com/docs/commercial-intelligence)",
  version: "0.0.1",
  type: "action",
  annotations: { destructiveHint: false, openWorldHint: true, readOnlyHint: true },
  props: {
    arcmira,
    channelId: { type: "string", label: "YouTube Channel ID", description: "The confirmed UC channel ID. Resolve names separately and confirm any ambiguous match." },
    minAdReads: { type: "integer", label: "Minimum Ad Reads", description: "Pro+ filter, 1 to 100. Leave unset to use the API's account-appropriate result.", min: 1, max: 100, optional: true },
    status: { type: "string", label: "Sponsor Status", description: "Pro+ filter against curated sponsor status.", options: SPONSOR_STATUSES, optional: true },
    limit: { type: "integer", label: "Sponsor Limit", description: "Pro+ filter, 1 to 200. Leave unset on other plans; the API can return a limited slice with access metadata.", min: 1, max: 200, optional: true },
  },
  async run({ $ }) {
    if (typeof this.channelId !== "string" || !CHANNEL_ID.test(this.channelId)) throw new Error("Use a confirmed YouTube channel ID in UC form; names and URLs are not accepted here.");
    const response = await this.arcmira.channelSponsors($, this.channelId, {
      min_ad_reads: integer(this.minAdReads, "Minimum ad reads", 100),
      status: option(this.status, "Sponsor status", SPONSOR_STATUSES),
      limit: integer(this.limit, "Sponsor limit", 200),
    });
    if (!Array.isArray(response.sponsors)) throw new Error("Arcmira sponsor response is missing its sponsors array.");
    $.export("$summary", `Returned ${response.sponsors.length} sponsor records within account access. Check meta.total and access for withheld results.`);
    return response;
  },
};
