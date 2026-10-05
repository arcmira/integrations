import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import app from "../components/arcmira/arcmira.app.mjs";
import search from "../components/arcmira/actions/search-transcripts/search-transcripts.mjs";
import resolve from "../components/arcmira/actions/resolve-entity/resolve-entity.mjs";
import sponsors from "../components/arcmira/actions/list-channel-sponsors/list-channel-sponsors.mjs";

const schema = JSON.parse(fs.readFileSync(new URL("../test/fixtures/openapi.json", import.meta.url)));
const mappings = [
  [search, "/v1/search", { query: "q", channelIds: "channel_ids", entityIds: "entity_ids", after: "after", before: "before", source: "source", limit: "limit" }],
  [resolve, "/v1/entities/resolve", { query: "q", entityType: "type", context: "context", limit: "limit" }],
  [sponsors, "/v1/channels/{channel_id}/sponsors", { channelId: "channel_id", minAdReads: "min_ad_reads", status: "status", limit: "limit" }],
];
const keys = new Set();
for (const [component, path, mapping] of mappings) {
  assert.equal(component.type, "action");
  assert.match(component.key, /^arcmira-[a-z-]+$/);
  assert.ok(!keys.has(component.key));
  keys.add(component.key);
  assert.equal(component.version, "0.0.1");
  assert.equal(typeof component.run, "function");
  assert.match(component.description, /\[.*\]\(https:\/\/arcmira.com\/docs\//);
  assert.equal(component.props.arcmira, app);
  for (const annotation of ["readOnlyHint", "destructiveHint", "openWorldHint"]) assert.equal(typeof component.annotations[annotation], "boolean");
  const parameters = schema.paths[path].get.parameters;
  assert.deepEqual(Object.keys(component.props).filter((key) => key !== "arcmira").sort(), Object.keys(mapping).sort());
  for (const [propName, apiName] of Object.entries(mapping)) {
    const prop = component.props[propName];
    const parameter = parameters.find((row) => row.name === apiName);
    assert.ok(parameter, `${path} ${apiName}`);
    assert.equal(prop.optional ?? false, !parameter.required);
    if (prop.type === "integer") {
      assert.equal(prop.min, parameter.schema.minimum);
      assert.equal(prop.max, parameter.schema.maximum);
    }
    if (prop.options) assert.deepEqual(prop.options, parameter.schema.enum);
    assert.ok(prop.label && prop.type);
  }
}
assert.equal(app.type, "app");
assert.equal(app.app, "arcmira");
for (const prop of ["minAdReads", "limit", "status"]) assert.equal(sponsors.props[prop].default, undefined);
for (const file of fs.readdirSync(new URL("../components/arcmira/", import.meta.url), { recursive: true })) {
  if (file.endsWith(".mjs")) execFileSync(process.execPath, ["--check", new URL(`../components/arcmira/${file}`, import.meta.url).pathname]);
}
console.log("3 native action definitions and app passed documented component-shape, syntax and released OpenAPI parameter checks. This is a local contract validator, not the Pipedream host or official monorepo linter.");
