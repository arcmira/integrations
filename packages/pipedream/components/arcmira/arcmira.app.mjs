import { axios } from "@pipedream/platform";

const BASE_URL = "https://api.arcmira.com/v1";
const RESPONSE_HEADERS = [
  "x-request-id",
  "x-arcmira-version",
  "ratelimit-limit",
  "ratelimit-remaining",
  "ratelimit-reset",
  "retry-after",
];

function redact(value, key) {
  return JSON.parse(JSON.stringify(value).split(key)
    .join("[REDACTED]"));
}

export default {
  type: "app",
  app: "arcmira",
  methods: {
    async _request($, path, params = {}) {
      const key = this.$auth?.api_key;
      if (typeof key !== "string" || !key.trim()) throw new Error("Connect an Arcmira account with read access.");
      if (![
        "/me",
        "/search",
        "/entities/resolve",
      ].includes(path) && !/^\/channels\/UC[A-Za-z0-9_-]{22}\/sponsors$/.test(path)) {
        throw new Error("Unsupported Arcmira route.");
      }
      let response;
      try {
        response = await axios($, {
          method: "GET",
          url: BASE_URL + path,
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: "application/json",
          },
          params: Object.fromEntries(Object.entries(params).filter(([
            , value,
          ]) => value !== undefined)),
          timeout: 20000,
          maxRedirects: 0,
          returnFullResponse: true,
          validateStatus: () => true,
          debug: false,
        });
      } catch {
        throw new Error("Arcmira could not be reached. No fallback or automatic retry was attempted.");
      }
      const http = {
        status: response.status,
        headers: Object.fromEntries(RESPONSE_HEADERS
          .filter((name) => response.headers[name] !== undefined)
          .map((name) => [
            name,
            response.headers[name],
          ])),
      };
      $.export("http", redact(http, key));
      const body = response.data;
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new Error(`Arcmira returned an invalid JSON object (HTTP ${response.status}).`);
      }
      const safe = redact(body, key);
      if (response.status < 200 || response.status >= 300 || safe.error) {
        $.export("arcmira_error", safe);
        const code = safe.error?.code;
        throw new Error(`Arcmira request failed (HTTP ${response.status}${typeof code === "string"
          ? `, ${code}`
          : ""}). See arcmira_error and http for the structured refusal and retry information.`);
      }
      return safe;
    },
    async testConnection($) {
      const account = await this._request($, "/me");
      if (!Array.isArray(account.scopes) || !account.scopes.includes("read")) throw new Error("This Arcmira key needs read access.");
      return account;
    },
    searchTranscripts($, params) {
      return this._request($, "/search", params);
    },
    resolveEntity($, params) {
      return this._request($, "/entities/resolve", params);
    },
    channelSponsors($, channelId, params) {
      return this._request($, `/channels/${channelId}/sponsors`, params);
    },
  },
};
