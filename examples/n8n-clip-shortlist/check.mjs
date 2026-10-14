import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const workflow = JSON.parse(readFileSync(new URL('./arcmira-clip-shortlist.n8n.json', import.meta.url)));
assert.equal(workflow.active, false);
assert.equal(workflow.id, undefined);
assert.equal(workflow.pinData, undefined);
for (const node of workflow.nodes) assert.equal(node.credentials, undefined);
const search = workflow.nodes.find(node => node.name === 'Search transcripts');
assert.equal(search.parameters.url, 'https://api.arcmira.com/v1/search');
assert.equal(search.parameters.genericAuthType, 'httpHeaderAuth');
assert.equal(search.parameters.queryParameters.parameters.find(p => p.name === 'limit').value, '5');
const code = workflow.nodes.find(node => node.name === 'Keep source-linked passages').parameters.jsCode;
const run = response => JSON.parse(JSON.stringify(vm.runInNewContext(`(function () { ${code} })()`, {
  $input: { all: () => [{ json: response }] },
})));
const response = {
  query: 'example', note: 'Limited indexed coverage', search_index: { state: 'catching_up' },
  window: { after: '2026-01-01' }, freshness: { partial: true }, as_of: '2026-10-14',
  chunks: [{ id: 'passage-1', video_id: 'example-id', text: 'A complete example sentence.',
    start_seconds: 12.7, watch_url: '/watch?v=example-id&t=12', video_title: 'Example video',
    channel_name: 'Example channel', published_at: '2026-09-01', speakers: ['Example speaker'], source: 'captions' }],
};
const [row] = run(response);
assert.equal(row.json.passage, 'A complete example sentence.');
assert.equal(row.json.youtube_url, 'https://www.youtube.com/watch?v=example-id&t=12s');
assert.equal(row.json.arcmira_url, 'https://arcmira.com/watch?v=example-id&t=12');
assert.equal(row.json.coverage_note, 'Limited indexed coverage');
assert.equal(row.json.speakers, 'Example speaker');
assert.equal(row.json.review_status, 'Needs review');
assert.deepEqual(JSON.parse(row.json.freshness), { partial: true });
assert.throws(() => run({ chunks: [] }), /No passages matched/);
assert.throws(() => run({ error: 'refused' }), /Expected transcript search results/);
assert.throws(() => run({ chunks: [{ ...response.chunks[0], watch_url: 'https://example.com/watch' }] }), /Unexpected source link/);
const exportNode = workflow.nodes.find(node => node.name === 'Export clip shortlist');
assert.equal(exportNode.parameters.operation, 'csv');
assert.equal(exportNode.parameters.options.fileName, 'arcmira-clip-shortlist.csv');
console.log('Clip shortlist mapping and packaging checks passed.');
