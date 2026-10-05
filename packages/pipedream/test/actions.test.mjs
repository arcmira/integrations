import test, { afterEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
const require = createRequire(import.meta.url);
const axios = require("axios");
const socketGuard = mock.method(net.Socket.prototype, "connect", () => { throw new Error("Network disabled in fixture tests"); });
after(() => {
  const attempts = socketGuard.mock.callCount();
  socketGuard.mock.restore();
  assert.equal(attempts, 0, "A fixture test attempted to open a network socket");
});
import app from "../components/arcmira/arcmira.app.mjs";
import search from "../components/arcmira/actions/search-transcripts/search-transcripts.mjs";
import resolve from "../components/arcmira/actions/resolve-entity/resolve-entity.mjs";
import sponsors from "../components/arcmira/actions/list-channel-sponsors/list-channel-sponsors.mjs";
const KEY = "fixture-key-not-a-real-credential";
const CHANNEL = "UC-DRzaGnL_vtBUpCFH5M0tg";
const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`fixtures/${name}.json`, import.meta.url)));
const forbidden = async () => { throw new Error("Unexpected request: all network is disabled."); };
axios.defaults.adapter = forbidden;
afterEach(() => { axios.defaults.adapter = forbidden; });
function scenario(data, status = 200, headers = {}) {
  const calls = [], exported = {};
  const $ = { export(name, value) { exported[name] = value; } };
  const account = { ...app.methods, $auth: { api_key: KEY } };
  axios.defaults.adapter = async (config) => {
    calls.push(config);
    assert.ok(config.url.startsWith("https://api.arcmira.com/v1/"));
    assert.equal(config.headers.Authorization, `Bearer ${KEY}`);
    assert.equal(config.maxRedirects, 0);
    assert.equal(config.debug, false);
    return { status, data, headers: { "x-request-id": "fixture-request", ...headers }, config };
  };
  return { calls, exported, $, account, run: (action, props = {}) => action.run.call({ arcmira: account, ...props }, { $ }) };
}
test("search preserves full envelope, source, timestamps and partial coverage", async () => {
  const data = { ...fixture("search"), access: { code: "fixture_gate", gate: "freshness" }, future_field: { preserve: true } };
  const s = scenario(data);
  assert.deepEqual(await s.run(search, { query: " Ramp cards ", source: "arcmira_premium", channelIds: [CHANNEL], entityIds: ["ent_14"], after: "2026-08-01", limit: 7 }), data);
  assert.deepEqual(s.calls[0].params, { q: "Ramp cards", channel_ids: CHANNEL, entity_ids: "ent_14", after: "2026-08-01", source: "arcmira_premium", limit: 7 });
  assert.equal(s.calls.length, 1);
  assert.deepEqual(s.exported.http, { status: 200, headers: { "x-request-id": "fixture-request" } });
});
test("empty search retains access and coverage without claiming absence", async () => {
  const data = { ...fixture("search"), chunks: [], returned: 0, search_index: { state: "catching_up", missing_before: "2026-09-01" }, access: { gate: "rows", code: "fixture_limit" } };
  const s = scenario(data);
  assert.deepEqual(await s.run(search, { query: "example", after: "", before: null }), data);
  assert.deepEqual(s.calls[0].params, { q: "example", limit: 5 });
  assert.match(s.exported.$summary, /Check note/);
});
test("entity ambiguity stays intact without selecting or following a suggestion", async () => {
  const data = fixture("resolve"), s = scenario(data);
  assert.deepEqual(await s.run(resolve, { query: "Sam", context: "the startup founder", entityType: "person" }), data);
  assert.equal(data.best, null);
  assert.ok(data.suggested);
  assert.equal(s.calls.length, 1);
  assert.match(s.exported.$summary, /confirm uncertain/);
});
test("sponsor defaults omit Pro+ filters and preserve withheld-result metadata", async () => {
  const data = { channel: { youtube_channel_id: CHANNEL }, sponsors: [], meta: { min_ad_reads: 3, count: 0, total: 12 }, access: { gate: "plan" } }, s = scenario(data);
  assert.deepEqual(await s.run(sponsors, { channelId: CHANNEL }), data);
  assert.deepEqual(s.calls[0].params, {});
  assert.equal(s.calls[0].url, `https://api.arcmira.com/v1/channels/${CHANNEL}/sponsors`);
});
test("explicit sponsor filters are preserved", async () => {
  const s = scenario({ sponsors: [], meta: { total: 0, count: 0 } });
  await s.run(sponsors, { channelId: CHANNEL, minAdReads: 5, limit: 20, status: "uncertain" });
  assert.deepEqual(s.calls[0].params, { min_ad_reads: 5, status: "uncertain", limit: 20 });
});
for (const status of [400, 401, 402, 403, 404, 409, 429, 500]) {
  test(`HTTP ${status} retains structured refusal without retry or fallback`, async () => {
    const body = { error: { type: "fixture_error", code: "fixture_refusal", message: "Illustrative refusal", gate: "plan", request_id: "r", retry_after_seconds: 20, doc_url: "https://arcmira.com/docs/errors" } };
    const s = scenario(body, status, { "retry-after": "20" });
    await assert.rejects(s.run(search, { query: "example", source: "arcmira_premium" }), new RegExp(`HTTP ${status}`));
    assert.deepEqual(s.exported.arcmira_error, body);
    assert.equal(s.exported.http.headers["retry-after"], "20");
    assert.equal(s.calls.length, 1);
    assert.equal(s.calls[0].params.source, "arcmira_premium");
  });
}
test("redirects are not followed and sensitive response headers not exported", async () => {
  const s = scenario({ note: "redirect" }, 302, { location: "https://unrelated.example", authorization: KEY, "set-cookie": KEY });
  await assert.rejects(s.run(search, { query: "example" }), /HTTP 302/);
  assert.equal(s.calls.length, 1);
  assert.equal(JSON.stringify(s.exported).includes(KEY), false);
});
test("a reflected credential is redacted from structured errors", async () => {
  const s = scenario({ error: { code: "fixture", message: `bad ${KEY}` } }, 401);
  await assert.rejects(s.run(resolve, { query: "example" }), /HTTP 401/);
  assert.equal(s.exported.arcmira_error.error.message, "bad [REDACTED]");
});
test("transport failure does not expose credential or Axios config", async () => {
  const s = scenario({});
  axios.defaults.adapter = async () => { throw new Error(`network ${KEY}`); };
  await assert.rejects(s.run(search, { query: "example" }), (e) => !String(e).includes(KEY) && /could not be reached/.test(e.message));
  assert.deepEqual(s.exported, {});
});
for (const data of ["not JSON", null, [], { wrong: "shape" }]) {
  test(`malformed response ${JSON.stringify(data)} does not become empty results`, async () => {
    const s = scenario(data);
    await assert.rejects(s.run(search, { query: "example" }), /invalid JSON object|missing its chunks/);
  });
}
test("bad filters fail before HTTP", async () => {
  const s = scenario({});
  for (const props of [{ query: " " }, { query: "example", limit: 21 }, { query: "example", source: "any" }, { query: "example", channelIds: ["show name"] }, { query: "example", entityIds: Array(9).fill("ent_1") }]) await assert.rejects(s.run(search, props));
  await assert.rejects(s.run(resolve, { query: "Sam", context: "x" }));
  await assert.rejects(s.run(sponsors, { channelId: "../me" }));
  assert.equal(s.calls.length, 0);
});
test("connection needs read scope, not remaining allowance", async () => {
  const s = scenario({ scopes: ["read"], usage: { remaining: 0 } });
  assert.deepEqual(await s.account.testConnection(s.$), { scopes: ["read"], usage: { remaining: 0 } });
  const noRead = scenario({ scopes: [] });
  await assert.rejects(noRead.account.testConnection(noRead.$), /read access/);
});
