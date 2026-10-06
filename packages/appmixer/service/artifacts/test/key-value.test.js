'use strict';
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { createMockContext } = require('./context');
const component = require('../../core/MakeApiCall/MakeApiCall');

function context(extra) {
    return createMockContext({
        auth: { apiKey: 'synthetic-key-not-live' },
        messages: { in: { content: { url: 'entities/resolve', method: 'GET', ...extra } } }
    });
}

describe('Documented Designer key-value object text', () => {
    it('preserves query values and uses managed authentication', async () => {
        const ctx = context({ parameters: '{"q":"OpenAI","limit":"1"}' });
        const data = { query: 'OpenAI', candidates: [], note: 'Synthetic transport fixture.' };
        ctx.httpRequest.resolves({ status: 200, headers: {}, data });
        await component.receive(ctx);
        assert.equal(ctx.httpRequest.callCount, 1);
        const request = ctx.httpRequest.firstCall.args[0];
        assert.deepEqual(request.params, { q: 'OpenAI', limit: '1' });
        assert.equal(request.url, 'https://api.arcmira.com/v1/entities/resolve');
        assert.equal(request.headers.Authorization, 'Bearer synthetic-key-not-live');
        assert.equal(request.maxRedirects, 0);
        assert.deepEqual(ctx.sendJson.firstCall.args, [{ statusCode: 200, headers: {}, body: data }, 'out']);
    });
    it('normalizes allowed header names without changing values', async () => {
        const ctx = context({ headers: '{"X-Request-ID":"fixture-request","If-Match":"\\\"etag\\\""}' });
        ctx.httpRequest.resolves({ status: 200, data: {} });
        await component.receive(ctx);
        assert.deepEqual(ctx.httpRequest.firstCall.args[0].headers, {
            'x-request-id': 'fixture-request',
            'if-match': '"etag"',
            Authorization: 'Bearer synthetic-key-not-live'
        });
    });
    it('accepts an empty editor object without adding query or header values', async () => {
        const ctx = context({ parameters: '{}', headers: '{}' });
        ctx.httpRequest.resolves({ status: 200, data: {} });
        await component.receive(ctx);
        assert.deepEqual(ctx.httpRequest.firstCall.args[0].params, {});
        assert.deepEqual(ctx.httpRequest.firstCall.args[0].headers, { Authorization: 'Bearer synthetic-key-not-live' });
    });
    for (const value of [
        'null', 'true', '1', '"value"',
        '{"limit":1}', '{"enabled":true}', '{"q":null}', '{"q":{}}', '{"q":[]}',
        '{"":"value"}', '{"q\\r\\nInjected":"value"}', '{"q":"value\\r\\nInjected"}',
        '{"__proto__":"value"}', '{"constructor":"value"}', '{"prototype":"value"}'
    ]) {
        it('rejects unsafe or non-text object input ' + value, async () => {
            const ctx = context({ parameters: value });
            await assert.rejects(component.receive(ctx), (error) => error.name === 'CancelError');
            assert.equal(ctx.httpRequest.callCount, 0);
        });
    }
    for (const headers of [
        '{"Authorization":"override"}', '{"Host":"evil.invalid"}', '{"Cookie":"x=y"}',
        '{"Accept":"a","accept":"b"}', '{"X-Request-ID":"a\\nInjected"}'
    ]) {
        it('preserves header safeguards for object text ' + headers, async () => {
            const ctx = context({ headers });
            await assert.rejects(component.receive(ctx), (error) => error.name === 'CancelError');
            assert.equal(ctx.httpRequest.callCount, 0);
        });
    }
});
