import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url)));
const clip = read('examples/n8n-clip-shortlist/arcmira-clip-shortlist.n8n.json').nodes.find(n => n.name === 'Keep source-linked passages').parameters.jsCode;
const shortlist = read('examples/n8n-source-shortlist/arcmira-source-shortlist.n8n.json').nodes.find(n => n.name === 'Build source shortlist').parameters.jsCode;
const nodeRed = read('examples/node-red-source-shortlist/arcmira-source-shortlist.json').find(n => n.name === 'Build safe CSV and source packet').func;
for (const [line, expected] of [[151, '151'], [0, '0'], [null, '12'], [undefined, '12']]) {
  const chunk = {video_id: 'test-video', text: 'Synthetic passage.', start_seconds: 12,
    watch_url: 'https://arcmira.com/watch?v=test-video&t=' + expected};
  if (line !== undefined) chunk.line_start_seconds = line;
  const response = {chunks: [chunk], note: 'Synthetic coverage note'};
  const run = (code, context) => vm.runInNewContext(`(function () { ${code} })()`, context);
  const clipRow = run(clip, {$input: {all: () => [{json: response}]}})[0].json;
  const sourceRow = run(shortlist, {$input: {first: () => ({json: response})}, $: () => ({first: () => ({json: {}})})})[0].json.candidates[0];
  const redOutput = run(nodeRed, {msg: {payload: response, statusCode: 200, outputDir: 'fixture-output'}});
  const redRow = JSON.parse(redOutput[1].payload).candidates[0];
  assert.ok(redOutput[0].payload.split('\r\n')[0].includes('"line_start_seconds"'), 'CSV exposes matched-line metadata');
  for (const [name, row, urlField, startField] of [
    ['n8n clip', clipRow, 'youtube_url', 'start_seconds'],
    ['n8n source', sourceRow, 'original_source_url', 'passage_start_seconds'],
    ['Node-RED', redRow, 'original_source_url', 'passage_start_seconds'],
  ]) {
    assert.equal(row[urlField], 'https://www.youtube.com/watch?v=test-video&t=' + expected + 's', name);
    assert.equal(row[startField], 12, name + ' preserves the excerpt start');
    assert.equal(row.line_start_seconds, line ?? null, name + ' preserves matched-line metadata');
    assert.equal(row.arcmira_url, chunk.watch_url, name + ' preserves the API link');
  }
}
console.log('Source links prefer matched lines, preserve zero, and fall back for null or older responses.');
