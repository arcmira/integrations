const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createMockActionContext } = require('@activepieces/pieces-framework');
const { arcmira } = require(process.env.ARCMIRA_PIECE_PATH || '../dist/index.js');
const action = arcmira.getAction('search_transcripts');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
function context(props = {}) {
  return { ...createMockActionContext({ propsValue: { query: 'coding agents', limit: 5, ...props } }), auth: { secret_text: 'fixture-key' } };
}
const evidence = { chunks: [{ text: 'Synthetic passage for testing.', start_seconds: 42, watch_url: '/watch?v=fixture&t=42', speaker_id: 'speaker-fixture' }], partial: true, failed_batches: 1, note: 'Synthetic partial coverage note', search_index: { status: 'partial' }, access: { source: 'arcmira_premium' } };
test('framework exposes the approved title, documentation and secret connection', () => {
  const meta = arcmira.metadata();
  assert.equal(meta.displayName, 'Arcmira: YouTube Transcript Search');
  assert.match(meta.description, /https:\/\/arcmira.com\/docs/);
  assert.equal(meta.auth.type, 'SECRET_TEXT');
  assert.deepEqual(Object.keys(arcmira.actions()), ['search_transcripts']);
  assert.deepEqual(arcmira.triggers(), {});
});
test('real framework action sends a bounded authenticated read and preserves evidence', async () => {
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.equal(url.origin + url.pathname, 'https://api.arcmira.com/v1/search');
    assert.equal(url.searchParams.get('q'), 'coding agents');
    assert.equal(url.searchParams.get('limit'), '5');
    assert.equal(options.headers.Authorization, 'Bearer fixture-key');
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(evidence);
  };
  assert.deepEqual(await action.run(context()), evidence);
  assert.equal(calls, 1);
});
test('source, channel and half-open date filters reach the API unchanged', async () => {
  global.fetch = async url => {
    assert.equal(url.searchParams.get('source'), 'arcmira_premium');
    assert.equal(url.searchParams.get('channel_ids'), 'UC-one,UC-two');
    assert.equal(url.searchParams.get('after'), '2026-09-01');
    assert.equal(url.searchParams.get('before'), '2026-10-01');
    return Response.json({ chunks: [] });
  };
  await action.run(context({ source: 'arcmira_premium', channel_ids: 'UC-one,UC-two', after: '2026-09-01', before: '2026-10-01' }));
});
for (const status of [401, 403, 429, 500]) test(`HTTP ${status} is an error, without retries or captions fallback`, async () => {
  let calls = 0;
  global.fetch = async url => {
    calls++;
    assert.equal(url.searchParams.get('source'), 'arcmira_premium');
    return Response.json({ error: 'fixture_denial', message: 'Requested data unavailable' }, { status });
  };
  await assert.rejects(action.run(context({ source: 'arcmira_premium' })), new RegExp(`HTTP ${status}.*fixture_denial`));
  assert.equal(calls, 1);
});
test('empty successful results retain coverage metadata', async () => {
  const empty = { chunks: [], partial: false, note: 'No indexed matches' };
  global.fetch = async () => Response.json(empty);
  assert.deepEqual(await action.run(context()), empty);
});
test('transport failures do not leak credentials from the transport error', async () => {
  global.fetch = async () => { throw new Error('request with Bearer fixture-key failed'); };
  await assert.rejects(action.run(context()), error => /request failed or timed out/.test(error.message) && !error.message.includes('fixture-key'));
});
test('non-JSON responses fail without returning an HTML success payload', async () => {
  global.fetch = async () => new Response('<html>upstream error</html>', { status: 502 });
  await assert.rejects(action.run(context()), /non-JSON response \(HTTP 502\)/);
});
test('invalid limits and empty questions are rejected before a network request', async () => {
  global.fetch = async () => { assert.fail('invalid input must not call the API'); };
  for (const limit of [0, 21, 2.5, NaN]) await assert.rejects(action.run(context({ limit })), /integer from 1 to 20/);
  await assert.rejects(action.run(context({ query: ' ' })), /at least two/);
});
test('connection validation uses account inspection, without search consumption', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url.href, 'https://api.arcmira.com/v1/me');
    assert.equal(options.headers.Authorization, 'Bearer fixture-key');
    return Response.json({ tier: 'free' });
  };
  assert.deepEqual(await arcmira.auth.validate({ auth: 'fixture-key' }), { valid: true });
});
test('connection rejection is reported as invalid', async () => {
  global.fetch = async () => Response.json({ error: 'invalid_api_key' }, { status: 401 });
  const result = await arcmira.auth.validate({ auth: 'fixture-key' });
  assert.equal(result.valid, false);
  assert.match(result.error, /HTTP 401/);
});
