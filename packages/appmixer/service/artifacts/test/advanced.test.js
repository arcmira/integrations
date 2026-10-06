'use strict';
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { createMockContext } = require('./context');
const component = require('../../core/MakeApiCall/MakeApiCall');
const manifest = require('../../core/MakeApiCall/component.json');
const Ajv = require('ajv');
const ajv = new Ajv({ strict: false });
function context(input = { url: 'search', method: 'GET' }) {
    return createMockContext({
        auth: { apiKey: 'synthetic-key-not-live' },
        messages: { in: { content: input } }
    });
}

function sent(ctx) {
    assert.equal(ctx.sendJson.callCount, 1);
    return ctx.sendJson.firstCall.args;
}

describe('Advanced native API action', () => {
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
        it('executes explicit ' + method + ' once with full HTTP result', async () => {
            const input = {
                method,
                url: '/v1/monitors',
                parameters: [{ key: 'cursor', value: 'opaque+/==' }],
                headers: [{ key: 'X-Request-ID', value: 'fixture_request' }]
            };
            if (method !== 'GET') {
                input.body = JSON.stringify({
                    topics: ['climate'],
                    enabled: true,
                    nested: { limit: 3 },
                    empty: null
                });
            }
            const ctx = context(input);
            const response = {
                status: method === 'POST' ? 201 : 200,
                headers: { 'x-request-id': 'req_fixture', 'x-pagination-cursor': 'next+/==' },
                data: { records: [1, 2], partial: true, coverage: { missing: 2 } }
            };
            ctx.httpRequest.resolves(response);
            await component.receive(ctx);
            const request = ctx.httpRequest.firstCall.args[0];
            assert.equal(ctx.httpRequest.callCount, 1);
            assert.equal(request.method, method);
            assert.equal(request.url, 'https://api.arcmira.com/v1/monitors');
            assert.deepEqual(request.params, { cursor: 'opaque+/==' });
            assert.deepEqual(request.headers, {
                'x-request-id': 'fixture_request',
                Authorization: 'Bearer synthetic-key-not-live'
            });
            assert.equal(request.maxRedirects, 0);
            assert.equal(request.timeout, 30000);
            assert.equal(request.validateStatus(403), true);
            if (method === 'GET') assert(!Object.hasOwn(request, 'data'));
            else assert.deepEqual(request.data, JSON.parse(input.body));
            assert.deepEqual(sent(ctx), [
                { statusCode: response.status, headers: response.headers, body: response.data },
                'out'
            ]);
        });
    }
    it('supports JSON-encoded key-value rows and an array body without changing values', async () => {
        const ctx = context({
            method: 'PATCH',
            url: 'monitors/monitor_fixture',
            parameters: JSON.stringify([{ key: 'limit', value: '10' }]),
            headers: JSON.stringify([{ key: 'If-Match', value: '"etag_fixture"' }]),
            body: '[false,0,null,{"test":"value"}]'
        });
        ctx.httpRequest.resolves({ status: 200, data: [] });
        await component.receive(ctx);
        const request = ctx.httpRequest.firstCall.args[0];
        assert.deepEqual(request.data, [false, 0, null, { test: 'value' }]);
        assert.deepEqual(request.params, { limit: '10' });
        assert.equal(request.headers['if-match'], '"etag_fixture"');
        assert.deepEqual(sent(ctx), [{ statusCode: 200, headers: {}, body: [] }, 'out']);
    });
    it('preserves an empty 204 response', async () => {
        const ctx = context({ method: 'DELETE', url: 'monitors/monitor_fixture' });
        ctx.httpRequest.resolves({ status: 204, headers: { 'x-request-id': 'req_delete' }, data: '' });
        await component.receive(ctx);
        assert.deepEqual(sent(ctx), [
            { statusCode: 204, headers: { 'x-request-id': 'req_delete' }, body: '' },
            'out'
        ]);
    });
    for (const status of [400, 401, 402, 403, 429, 503]) {
        it('preserves refusal ' + status + ' and does not repeat writes', async () => {
            const ctx = context({ method: 'POST', url: 'monitors', body: '{"name":"fixture"}' });
            const error = {
                type: 'permission_error',
                code: 'fixture_refusal',
                request_id: 'req_fixture',
                gate: 'plan'
            };
            const body = { error, partial: { preserved: true } };
            const headers = { 'retry-after': '120', 'x-request-id': 'req_fixture' };
            ctx.httpRequest.resolves({ status, headers, data: body });
            await component.receive(ctx);
            assert.equal(ctx.httpRequest.callCount, 1);
            assert.deepEqual(sent(ctx), [
                {
                    statusCode: status,
                    headers,
                    body,
                    error,
                    requestId: 'req_fixture',
                    retryAfterSeconds: 120
                },
                'error'
            ]);
        });
    }
    it('preserves Axios error response but not its credential-bearing config', async () => {
        const ctx = context();
        const body = { error: { type: 'quota_exceeded', code: 'quota_exceeded' } };
        ctx.httpRequest.rejects({
            response: { status: 402, headers: { 'x-request-id': 'req_fixture' }, data: body },
            config: { headers: { Authorization: 'synthetic-key-not-live' } }
        });
        await component.receive(ctx);
        const [data, port] = sent(ctx);
        assert.equal(port, 'error');
        assert.deepEqual(data.body, body);
        assert.equal(data.statusCode, 402);
        assert(!JSON.stringify(data).includes('synthetic-key-not-live'));
    });
    it('sanitizes transport errors and never retries an uncertain write', async () => {
        const ctx = context({ method: 'POST', url: 'monitors', body: '{}' });
        ctx.httpRequest.rejects(new Error('contains synthetic-key-not-live'));
        await component.receive(ctx);
        const [data, port] = sent(ctx);
        assert.equal(port, 'error');
        assert.equal(data.statusCode, null);
        assert.equal(data.error.type, 'transport_error');
        assert.match(data.error.message, /write may have completed/);
        assert(!JSON.stringify(data).includes('synthetic-key-not-live'));
        assert.equal(ctx.httpRequest.callCount, 1);
    });
    it('does not follow a redirect', async () => {
        const ctx = context();
        ctx.httpRequest.resolves({
            status: 302,
            headers: { location: 'https://example.invalid/' },
            data: ''
        });
        await component.receive(ctx);
        assert.equal(sent(ctx)[1], 'error');
        assert.equal(ctx.httpRequest.callCount, 1);
        assert.equal(ctx.httpRequest.firstCall.args[0].maxRedirects, 0);
    });
    for (const url of [
        '',
        'https://example.invalid',
        'https://api.arcmira.com/v1/search',
        '//example.invalid',
        '/search',
        '../admin',
        '/v1/../admin',
        'a/../../admin',
        '%2e%2e/admin',
        'a/%2E%2E/admin',
        '%252e%252e/admin',
        '%2f%2fevil',
        'a%5cb',
        'a\\b',
        'search?api_key=secret',
        'search#fragment',
        ' search',
        'search\n',
        '%00',
        '%zz',
        '/v1/'
    ]) {
        it('rejects unsafe path ' + JSON.stringify(url) + ' before HTTP', async () => {
            const ctx = context({ method: 'GET', url });
            await assert.rejects(component.receive(ctx), (e) => e.name === 'CancelError');
            assert.equal(ctx.httpRequest.callCount, 0);
        });
    }
    for (const key of [
        'Authorization',
        'authorization',
        'Host',
        'Cookie',
        'Set-Cookie',
        'Proxy-Authorization',
        'X-Api-Key',
        'Connection',
        'Transfer-Encoding',
        'Content-Length',
        'X-HTTP-Method-Override',
        'X-Forwarded-Host',
        'CF-Access-Client-Secret',
        '__proto__'
    ]) {
        it('rejects sensitive or routing header ' + key, async () => {
            const ctx = context({ method: 'GET', url: 'me', headers: [{ key, value: 'override' }] });
            await assert.rejects(component.receive(ctx), (e) => e.name === 'CancelError');
            assert.equal(ctx.httpRequest.callCount, 0);
        });
    }
    for (const extra of [
        { method: 'HEAD' },
        { body: '{}' },
        { parameters: 'not json' },
        { parameters: {} },
        { parameters: [{ key: 'a', value: 4 }] },
        {
            parameters: [
                { key: 'a', value: '1' },
                { key: 'a', value: '2' }
            ]
        },
        { headers: [{ key: 'Accept', value: 'application/json\r\nHost: evil' }] },
        {
            headers: [
                { key: 'Accept', value: 'a' },
                { key: 'accept', value: 'b' }
            ]
        },
        { method: 'POST', body: '{bad' },
        { method: 'POST', body: {} },
        { apiKey: 'input-secret' }
    ]) {
        it('rejects invalid advanced input ' + JSON.stringify(extra), async () => {
            const ctx = context({ url: 'search', method: 'GET', ...extra });
            await assert.rejects(component.receive(ctx), (e) => e.name === 'CancelError');
            assert.equal(ctx.httpRequest.callCount, 0);
        });
    }
    it('cancels missing managed key before the request', async () => {
        const ctx = context();
        ctx.auth = {};
        await assert.rejects(component.receive(ctx), (e) => e.name === 'CancelError');
        assert.equal(ctx.httpRequest.callCount, 0);
    });
    it('propagates downstream failure instead of misreporting the API call', async () => {
        const ctx = context();
        ctx.httpRequest.resolves({ status: 200, data: {} });
        ctx.sendJson.rejects(new Error('downstream fixture'));
        await assert.rejects(component.receive(ctx), /downstream fixture/);
        assert.equal(ctx.sendJson.callCount, 1);
    });
    it('declares supported methods, write capabilities and output contracts', () => {
        assert.deepEqual(manifest.inPorts[0].schema.properties.method.enum, [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'DELETE'
        ]);
        assert.match(manifest.description, /may modify account data/);
        for (const port of manifest.outPorts) { assert(ajv.validate(port.schema, { statusCode: 200, headers: {}, body: { all: 'preserved' } })); }
    });
});
