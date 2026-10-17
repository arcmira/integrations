import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import SourceSheet from './SourceSheet.mjs';
const app = JSON.parse(fs.readFileSync(new URL('./arcmira-source-shortlist.appsmith.json', import.meta.url)));
const reset = () => {
  globalThis.appsmith = { store: {} };
  globalThis.storeValue = async (key, value, persist) => {
    assert.equal(persist, false);
    appsmith.store[key] = value;
  };
};

test('demo contains three invented passages, with unknown real provenance preserved', () => {
  reset();
  const packet = SourceSheet.packet();
  assert.equal(packet.is_synthetic, true);
  assert.equal(packet.candidates.length, 3);
  assert.deepEqual(packet.requested_window, { after: '2026-08-01', before: '2026-09-01' });
  for (const field of ['applied_window', 'partial', 'search_index']) assert.equal(packet[field], null);
  for (const row of packet.candidates) {
    assert.equal(row.transcript_type, 'synthetic');
    assert.equal(row.watch_url, null);
    assert.equal(row.video_id, null);
    assert.equal(row.published_at, null);
  }
});

test('empty and reset change only session demo rows and export a header for empty results', async () => {
  reset();
  await SourceSheet.empty();
  assert.deepEqual(SourceSheet.packet().candidates, []);
  assert.equal(SourceSheet.packet().status, 'demo_empty');
  assert.equal(SourceSheet.csv().split('\r\n').length, 2);
  await SourceSheet.demo();
  assert.equal(SourceSheet.packet().candidates.length, 3);
});

test('CSV quotes commas, quotes and multiline text; neutralizes formula prefixes', () => {
  reset();
  const packet = SourceSheet.fixture();
  packet.candidates = ['=HYPERLINK("https://example.invalid")', ' +SUM(1,2)', '\t@x', '-1', 'a,"b"\nc'].map(text => ({ text, start_seconds: 1 }));
  appsmith.store.arcmiraSourceSheet = packet;
  const csv = SourceSheet.csv();
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.invalid"")"'));
  assert.ok(csv.includes('"\' +SUM(1,2)"'));
  assert.ok(csv.includes('"\'\t@x"'));
  assert.ok(csv.includes('"\'-1"'));
  assert.ok(csv.includes('"a,""b""\nc"'));
  assert.ok(csv.includes('"requested_after","requested_before","applied_window","partial","search_index"'));
});

test('downloads preserve exact JSON packet and emit safe CSV with explicit synthetic filename', async () => {
  reset();
  const outputs = [];
  globalThis.download = async (...args) => outputs.push(args);
  await SourceSheet.downloadJSON();
  await SourceSheet.downloadCSV();
  assert.deepEqual(JSON.parse(outputs[0][0]), SourceSheet.fixture());
  assert.equal(outputs[0][1], 'arcmira-synthetic-source-shortlist.json');
  assert.equal(outputs[1][2], 'text/csv');
  assert.equal(outputs[1][0], SourceSheet.csv());
});

test('distributed export matches the tested JS and contains no live connector or on-load actions', () => {
  assert.deepEqual(app.datasourceList, []);
  assert.deepEqual(app.customJSLibList, []);
  assert.equal(app.exportedApplication.isPublic, false);
  const source = fs.readFileSync(new URL('./SourceSheet.mjs', import.meta.url), 'utf8');
  assert.equal(app.actionCollectionList[0].unpublishedCollection.body, source);
  assert.equal(app.actionCollectionList[0].publishedCollection.body, source);
  assert.equal(app.actionList.length, Object.keys(SourceSheet).length);
  for (const action of app.actionList) {
    assert.equal(action.pluginType, 'JS');
    for (const version of ['unpublishedAction', 'publishedAction']) {
      const def = action[version];
      assert.equal(def.runBehaviour, 'MANUAL');
      assert.equal(def.userSetOnLoad, false);
      const expected = SourceSheet[def.name].toString().replace(/^(async )?\w+\(/, (_, a) => `${a || ''}function (`);
      assert.equal(def.actionConfiguration.body, expected);
    }
  }
  for (const version of ['unpublishedPage', 'publishedPage']) {
    const layout = app.pageList[0][version].layouts[0];
    assert.deepEqual(layout.layoutOnLoadActions, []);
    const table = layout.dsl.children.find(w => w.widgetName === 'Sources');
    assert.equal(table.isVisibleDownload, false);
    assert.equal(table.tableData, '{{SourceSheet.packet().candidates}}');
  }
  assert.doesNotMatch(JSON.stringify(app), /host\.docker\.internal|Authorization|Bearer |fetch\(|axios|api\.arcmira\.com/);
});

const { default: PrivateSourceSheet } = await import('./PrivateSourceSheet.mjs');
const response = () => ({
  query: 'creator economy', window: { after: '2026-08-01T00:00:00Z', before: '2026-09-01T00:00:00Z' },
  search_index: { state: 'catching_up', missing_before: '2015-06-23' },
  note: 'Synthetic protocol fixture, not an observed live response.',
  chunks: [{ id: 'fixture', video_id: 'synthetic01', video_title: '=A title', text: 'An invented passage.', start_seconds: 42, watch_url: '/watch?v=synthetic01&t=42', source: 'creator_captions', published_at: '2026-08-12T12:00:00Z', speakers: [] }]
});

test('private search makes one explicit call and retains source and coverage facts without a false partial default', async () => {
  reset();
  let calls = 0;
  const raw = response();
  globalThis.Arcmira_Search = { run: async () => { calls++; assert.equal(PrivateSourceSheet.packet().status, 'loading'); assert.deepEqual(PrivateSourceSheet.packet().candidates, []); return raw; } };
  const packet = await PrivateSourceSheet.search();
  assert.equal(calls, 1);
  assert.equal(packet.is_synthetic, false);
  assert.equal(packet.status, 'ready');
  assert.equal(packet.partial, null);
  assert.deepEqual(packet.search_index, raw.search_index);
  assert.deepEqual(packet.applied_window, raw.window);
  assert.equal(packet.candidates[0].transcript_type, 'creator_captions');
  assert.equal(packet.candidates[0].title, '=A title');
  assert.equal(packet.candidates[0].watch_url, raw.chunks[0].watch_url);
  assert.equal(packet.raw_response, raw);
  assert.ok(PrivateSourceSheet.csv().includes('"\'=A title"'));
});

test('private empty response replaces prior rows while JSON retains access and coverage', async () => {
  reset();
  globalThis.Arcmira_Search = { run: async () => response() };
  await PrivateSourceSheet.search();
  const empty = { ...response(), chunks: [], partial: true, access: { code: 'fixture_gate' } };
  Arcmira_Search.run = async () => empty;
  await PrivateSourceSheet.search();
  assert.deepEqual(PrivateSourceSheet.packet().candidates, []);
  assert.equal(PrivateSourceSheet.packet().partial, true);
  assert.deepEqual(PrivateSourceSheet.packet().access, empty.access);
  assert.equal(PrivateSourceSheet.csv().split('\r\n').length, 2);
  const outputs = [];
  globalThis.download = async (...args) => outputs.push(args);
  await PrivateSourceSheet.downloadJSON();
  await PrivateSourceSheet.downloadCSV();
  assert.deepEqual(JSON.parse(outputs[0][0]).raw_response, empty);
  assert.equal(outputs[0][1], 'arcmira-source-shortlist.json');
  assert.equal(outputs[1][1], 'arcmira-source-shortlist.csv');
});

test('private failures and malformed responses clear stale rows and do not expose raw error text', async () => {
  reset();
  globalThis.Arcmira_Search = { run: async () => response() };
  await PrivateSourceSheet.search();
  Arcmira_Search.run = async () => { throw new Error('sensitive error detail'); };
  let packet = await PrivateSourceSheet.search();
  assert.equal(packet.status, 'error');
  assert.deepEqual(packet.candidates, []);
  assert.doesNotMatch(JSON.stringify(packet), /sensitive error detail/);
  Arcmira_Search.run = async () => ({ chunks: [{ text: 'invalid' }], query: 'test' });
  packet = await PrivateSourceSheet.search();
  assert.equal(packet.status, 'error');
  assert.deepEqual(packet.candidates, []);
  assert.equal(packet.raw_response, undefined);
});

test('private companion is never embedded in the public app', () => {
  assert.doesNotMatch(JSON.stringify(app), /PrivateSourceSheet|Arcmira_Search/);
  const privateCode = fs.readFileSync(new URL('./PrivateSourceSheet.mjs', import.meta.url), 'utf8');
  assert.equal((privateCode.match(/Arcmira_Search\.run\(/g) || []).length, 1);
  assert.doesNotMatch(privateCode, /fetch\(|axios|setTimeout|Authorization|Bearer /);
});

test('private source links normalize relative Arcmira URLs and validate YouTube ID/time', async () => {
  reset();
  const raw = response();
  delete raw.note;
  globalThis.Arcmira_Search = { run: async () => raw };
  await PrivateSourceSheet.search();
  let row = PrivateSourceSheet.packet().candidates[0];
  assert.equal(row.watch_url, '/watch?v=synthetic01&t=42');
  assert.equal(row.arcmira_url, 'https://arcmira.com/watch?v=synthetic01&t=42');
  assert.equal(row.original_source_url, 'https://www.youtube.com/watch?v=synthetic01&t=42s');
  assert.match(PrivateSourceSheet.summary(), /Search response received/);
  assert.doesNotMatch(PrivateSourceSheet.summary(), /No search response yet/);
  for (const timestamp of [null, undefined]) {
    raw.chunks[0].start_seconds = timestamp;
    await PrivateSourceSheet.search();
    row = PrivateSourceSheet.packet().candidates[0];
    assert.equal(row.start_seconds, null);
    assert.equal(row.original_source_url, 'https://www.youtube.com/watch?v=synthetic01');
  }
  raw.chunks[0].watch_url = '//untrusted.example/watch?v=synthetic01';
  raw.chunks[0].video_id = 'bad/id';
  await PrivateSourceSheet.search();
  row = PrivateSourceSheet.packet().candidates[0];
  assert.equal(row.arcmira_url, null);
  assert.equal(row.original_source_url, null);
  raw.chunks[0].start_seconds = -1;
  await PrivateSourceSheet.search();
  assert.equal(PrivateSourceSheet.packet().status, 'error');
  assert.deepEqual(PrivateSourceSheet.packet().candidates, []);
});
