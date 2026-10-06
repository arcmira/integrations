'use strict';
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { createMockContext } = require('./context');
const Search = require('../../core/SearchTranscripts/SearchTranscripts');
const Resolve = require('../../core/ResolveEntities/ResolveEntities');
const auth = require('../../auth');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const channel = 'UC' + 'a'.repeat(22);
const candidate = {
    id: 'ent_14',
    name: 'Example',
    slug: null,
    type: 'organization',
    youtube_channel_id: null,
    description: 'Synthetic company',
    page: null,
    match: 'exact',
    appearance_count: 3
};
function resolution(extra = {}) {
    return {
        query: 'Example',
        context: null,
        confidence: 'exact',
        best: structuredClone(candidate),
        suggested: null,
        ask: null,
        candidates: [structuredClone(candidate)],
        note: 'Synthetic exact match.',
        ...extra
    };
}

function search(extra = {}) {
    return {
        query: 'climate',
        limit: 5,
        returned: 2,
        filters: { channel_ids: [], entity_ids: [], about: [], by: [], kind: [] },
        window: { after: null, before: null },
        chunks: [1, 2].map((n) => ({
            id: 'chunk' + n,
            video_id: 'abcdefghijk',
            channel_id: channel,
            source: 'arcmira_premium',
            published_at: '2026-09-01T00:00:00Z',
            text: 'Entire spoken passage ' + n,
            start_seconds: n * 10,
            watch_url: '/watch?v=abcdefghijk&t=' + n * 10,
            score: 0.8,
            extension: { preserved: true }
        })),
        as_of: '2026-09-01T00:00:00Z',
        search_index: { state: 'live', missing_before: null },
        note: 'Results are bounded to indexed material.',
        ...extra
    };
}

function context(input = { query: 'climate' }) {
    return createMockContext({
        auth: { apiKey: 'synthetic-key-not-live' },
        messages: { in: { content: input } }
    });
}

function output(ctx, port, data) {
    assert.equal(ctx.sendJson.callCount, 1);
    assert.deepEqual(ctx.sendJson.firstCall.args, [data, port]);
    assert.equal(ctx.httpRequest.callCount, 1);
}

describe('Native Appmixer component contract', () => {
    it('preserves both passages and the entire search envelope', async () => {
        const ctx = context();
        const data = search({ extension: { future: [1, 2] } });
        ctx.httpRequest.resolves({ status: 200, data });
        await Search.receive(ctx);
        output(ctx, 'out', data);
        assert.equal(ctx.sendArray.callCount, 0);
    });
    it('preserves every explicit filter without quality fallback', async () => {
        const input = {
            query: 'energy policy',
            channelIds: channel,
            entityIds: 'ent_14',
            about: 'ent_15',
            by: 'ent_16',
            kind: 'organic,sponsored',
            after: '2026-01-01T00:00:00Z',
            before: '2026-09-01T00:00:00Z',
            source: 'arcmira_premium',
            limit: 7
        };
        const ctx = context(input);
        ctx.httpRequest.resolves({ status: 200, data: search() });
        await Search.receive(ctx);
        const request = ctx.httpRequest.firstCall.args[0];
        assert.deepEqual(request.params, {
            q: 'energy policy',
            channel_ids: channel,
            entity_ids: 'ent_14',
            about: 'ent_15',
            by: 'ent_16',
            kind: 'organic,sponsored',
            after: input.after,
            before: input.before,
            source: 'arcmira_premium',
            limit: 7
        });
        assert.equal(request.url, 'https://api.arcmira.com/v1/search');
        assert.deepEqual(request.headers, { Authorization: 'Bearer synthetic-key-not-live' });
        assert.equal(request.maxRedirects, 0);
        assert.equal(request.timeout, 30000);
        assert.equal(request.validateStatus(403), true);
    });
    for (const [label, extra] of Object.entries({
        partial: { partial: true, failed_batches: 1 },
        failedBatch: { failed_batches: 2 },
        catchingUp: { search_index: { state: 'catching_up', missing_before: '2026-01-01' } },
        unknownIndex: { search_index: { state: 'unknown', missing_before: null } },
        preview: { preview: true },
        incomplete: { complete: false },
        coverage: { coverage: { caveat: 'new field' } },
        unlock: { unlock: { tier: 'pro', url: 'https://example.invalid/info' } },
        access: {
            access: {
                type: 'permission_error',
                code: 'freshness_requires_paid',
                gate: 'freshness',
                message: 'Window limited',
                doc_url: 'https://arcmira.com/docs/errors',
                request_id: 'req_gate'
            }
        }
    })) {
        it('routes ' + label + ' to limited with its unchanged envelope', async () => {
            const ctx = context();
            const data = search(extra);
            ctx.httpRequest.resolves({ status: 200, data });
            await Search.receive(ctx);
            output(ctx, 'limited', data);
        });
    }
    it('distinguishes empty indexed results from limited empty results', async () => {
        for (const limited of [false, true]) {
            const ctx = context();
            const data = search({ chunks: [], returned: 0, as_of: null, partial: limited });
            ctx.httpRequest.resolves({ status: 200, data });
            await Search.receive(ctx);
            output(ctx, limited ? 'limited' : 'notFound', data);
        }
    });
    it('emits exact resolution intact and makes no search request', async () => {
        const ctx = context({ query: 'Example', type: 'organization', context: 'the company', limit: 8 });
        const data = resolution();
        ctx.httpRequest.resolves({ status: 200, data });
        await Resolve.receive(ctx);
        output(ctx, 'resolved', data);
        assert.equal(ctx.httpRequest.firstCall.args[0].url, 'https://api.arcmira.com/v1/entities/resolve');
        assert.deepEqual(ctx.httpRequest.firstCall.args[0].params, {
            q: 'Example',
            type: 'organization',
            context: 'the company',
            limit: 8
        });
    });
    it('keeps suggestions and assumption evidence in review', async () => {
        const ctx = context({ query: 'Example' });
        const data = resolution({
            confidence: 'ambiguous',
            best: null,
            suggested: { ...candidate, reason: 'dominant', evidence: 'Synthetic evidence', assumed: true }
        });
        ctx.httpRequest.resolves({ status: 200, data });
        await Resolve.receive(ctx);
        output(ctx, 'review', data);
    });
    it('keeps ambiguous options in review without selecting a candidate', async () => {
        const ctx = context({ query: 'Example' });
        const data = resolution({
            confidence: 'ambiguous',
            best: null,
            ask: {
                question: 'Which one?',
                options: [
                    { id: 'ent_14', name: 'Example', type: 'organization', label: 'First' },
                    { id: 'ent_15', name: 'Example two', type: 'organization', label: 'Second' }
                ]
            },
            candidates: [candidate, { ...candidate, id: 'ent_15' }]
        });
        ctx.httpRequest.resolves({ status: 200, data });
        await Resolve.receive(ctx);
        output(ctx, 'review', data);
    });
    it('does not promote single fuzzy best to exact resolution', async () => {
        const ctx = context();
        const data = resolution({ confidence: 'single_fuzzy' });
        ctx.httpRequest.resolves({ status: 200, data });
        await Resolve.receive(ctx);
        output(ctx, 'review', data);
    });
    it('returns no-match resolution without dropping guidance', async () => {
        const ctx = context();
        const data = resolution({ confidence: 'none', best: null, candidates: [], note: 'No match.' });
        ctx.httpRequest.resolves({ status: 200, data });
        await Resolve.receive(ctx);
        output(ctx, 'notFound', data);
    });
    for (const [status, type, code, gate] of [
        [400, 'invalid_request_error', 'id_required', 'key'],
        [401, 'authentication_error', 'invalid_api_key', 'key'],
        [402, 'quota_exceeded', 'quota_exceeded', 'rows'],
        [403, 'permission_error', 'filter_requires_paid', 'plan'],
        [429, 'rate_limit_error', 'rate_limited', 'rate'],
        [503, 'server_error', 'unavailable', null]
    ]) {
        it('preserves typed HTTP ' + status + ' and performs no hidden retries', async () => {
            const ctx = context({ query: 'climate', source: 'arcmira_premium' });
            const error = { type, code, gate, request_id: 'req_fixture', message: 'Synthetic refusal' };
            const data = { error, extra: 'preserve' };
            ctx.httpRequest.resolves({ status, data, headers: { 'retry-after': '120' } });
            await Search.receive(ctx);
            const result = ctx.sendJson.firstCall.args[0];
            assert.equal(ctx.sendJson.firstCall.args[1], 'error');
            assert.deepEqual(result.response, data);
            assert.deepEqual(result.error, error);
            assert.equal(result.httpStatus, status);
            assert.equal(result.retryAfterSeconds, 120);
            assert.equal(ctx.httpRequest.callCount, 1);
        });
    }
    it('handles Axios rejection shapes without leaking config credentials', async () => {
        const ctx = context();
        ctx.httpRequest.rejects({
            config: { headers: { Authorization: 'Bearer synthetic-key-not-live' } },
            response: {
                status: 403,
                data: { error: { type: 'permission_error', code: 'insufficient_scope' } }
            }
        });
        await Search.receive(ctx);
        assert.equal(ctx.sendJson.firstCall.args[1], 'error');
        assert(!JSON.stringify(ctx.sendJson.firstCall.args).includes('synthetic-key-not-live'));
    });
    it('reports transport failure without leaking original exception or key', async () => {
        const ctx = context();
        ctx.httpRequest.rejects(new Error('Secret: synthetic-key-not-live'));
        await Search.receive(ctx);
        const data = ctx.sendJson.firstCall.args[0];
        assert.equal(data.error.type, 'transport_error');
        assert.equal(data.httpStatus, null);
        assert(!JSON.stringify(data).includes('synthetic-key-not-live'));
        assert.equal(ctx.httpRequest.callCount, 1);
    });
    for (const apiKey of [undefined, '', 'invalid\nheader']) {
        it('cancels invalid managed credentials without an HTTP request', async () => {
            const ctx = context();
            ctx.auth = { apiKey };
            await assert.rejects(Search.receive(ctx), (error) => error.name === 'CancelError');
            assert.equal(ctx.httpRequest.callCount, 0);
        });
    }
    it('lets a downstream output failure remain a workflow failure', async () => {
        const ctx = context();
        ctx.httpRequest.resolves({ status: 200, data: search() });
        ctx.sendJson.rejects(new Error('downstream fixture'));
        await assert.rejects(Search.receive(ctx), /downstream fixture/);
        assert.equal(ctx.sendJson.callCount, 1);
    });
    it('routes malformed resolution to error without manufacturing a match', async () => {
        const ctx = context();
        const data = resolution({ confidence: 'invented', candidates: [] });
        ctx.httpRequest.resolves({ status: 200, data });
        await Resolve.receive(ctx);
        assert.equal(ctx.sendJson.firstCall.args[1], 'error');
        assert.deepEqual(ctx.sendJson.firstCall.args[0].response, data);
    });
    it('refuses redirects rather than passing credentials to another origin', async () => {
        const ctx = context();
        ctx.httpRequest.resolves({ status: 302, headers: { location: 'https://example.invalid' }, data: '' });
        await Search.receive(ctx);
        assert.equal(ctx.sendJson.firstCall.args[1], 'error');
        assert.equal(ctx.httpRequest.firstCall.args[0].maxRedirects, 0);
        assert.equal(ctx.httpRequest.callCount, 1);
    });
    for (const input of [
        {},
        { query: 'x' },
        { query: 'test', channelIds: 'Some channel' },
        { query: 'test', by: 'Person Name' },
        { query: 'test', about: Array(9).fill('ent_14').join(',') },
        { query: 'test', kind: 'advert' },
        { query: 'test', source: 'captions_fallback' },
        { query: 'test', limit: 21 },
        { query: 'test', after: '2026-01-01' },
        { query: 'test', after: '2026-02-01T00:00:00Z', before: '2026-01-01T00:00:00Z' },
        { query: 'test', spending: 'existing_credits' },
        { query: 'test', apiKey: 'input-key' }
    ]) {
        it('rejects invalid input before request ' + JSON.stringify(input), async () => {
            const ctx = context(input);
            await assert.rejects(Search.receive(ctx), (error) => error.name === 'CancelError');
            assert.equal(ctx.httpRequest.callCount, 0);
        });
    }
    for (const data of [
        null,
        [],
        'not json',
        { chunks: [] },
        search({ returned: 99 }),
        search({ chunks: [{ id: 'incomplete' }], returned: 1 })
    ]) {
        it('routes malformed response to error ' + typeof data, async () => {
            const ctx = context();
            ctx.httpRequest.resolves({ status: 200, data });
            await Search.receive(ctx);
            assert.equal(ctx.sendJson.firstCall.args[1], 'error');
            assert.equal(ctx.httpRequest.callCount, 1);
        });
    }
});

describe('Managed API-key authentication', () => {
    it('declares the documented secret account input, separate from action inputs', () => {
        assert.equal(auth.type, 'apiKey');
        assert.equal(auth.definition.auth.apiKey.type, 'password');
        assert.equal(auth.definition.accountNameFromProfileInfo, 'accountName');
    });
    it('validates only /me and keeps credentials out of profile info', async () => {
        const ctx = createMockContext({ apiKey: 'synthetic-key-not-live' });
        ctx.httpRequest.resolves({
            status: 200,
            data: {
                user_id: 'u_fixture',
                email_masked: 'z***@example.test',
                scopes: ['read'],
                key_label: 'Automation',
                usage: { do_not_store: true }
            }
        });
        assert.equal(await auth.definition.validate(ctx), true);
        const profile = await auth.definition.requestProfileInfo(ctx);
        assert.deepEqual(profile, { accountName: 'Arcmira · z***@example.test · Automation' });
        assert(ctx.httpRequest.getCalls().every((call) => call.args[0].url.endsWith('/v1/me')));
        assert(!JSON.stringify(profile).includes('synthetic-key-not-live'));
    });
    for (const [name, account, email, keyLabel, expected] of [
        ['team', { id: 'acct_team', name: 'Research team', kind: 'team', plan: 'pro_plus' },
            'z***@example.test', 'Automation', 'Arcmira · Team: Research team · z***@example.test · Automation'],
        ['personal', { id: 'acct_personal', name: 'Zeal', kind: 'personal', plan: 'free' },
            'z***@example.test', 'Automation', 'Arcmira · Personal: Zeal · z***@example.test · Automation'],
        ['unnamed team without email', { id: 'acct_team', name: null, kind: 'team', plan: 'pro_plus' },
            null, 'Automation', 'Arcmira · Team: acct_team · u_fixture · Automation'],
        ['named team without email', { id: 'acct_team', name: 'Research team', kind: 'team', plan: 'pro_plus' },
            null, null, 'Arcmira · Team: Research team · u_fixture'],
        ['unnamed personal', { id: 'acct_personal', name: null, kind: 'personal', plan: 'free' },
            null, null, 'Arcmira · Personal: acct_personal · u_fixture'],
        ['legacy without email', undefined, null, null, 'Arcmira · u_fixture']
    ]) {
        it('labels the ' + name + ' account without confusing it with the caller', async () => {
            const ctx = createMockContext({ apiKey: 'synthetic-key-not-live' });
            ctx.httpRequest.resolves({ status: 200, data: {
                user_id: 'u_fixture', email_masked: email, scopes: ['read'],
                key_label: keyLabel, account, role: 'member'
            } });
            const profile = await auth.definition.requestProfileInfo(ctx);
            assert.deepEqual(profile, { accountName: expected });
            assert.equal(ctx.httpRequest.callCount, 1);
            assert(ctx.httpRequest.firstCall.args[0].url.endsWith('/v1/me'));
        });
    }
    for (const account of [null, { id: 'acct_team', name: 'Research team', kind: 'unknown' }]) {
        it('rejects an invalid paying account instead of displaying the caller as its owner', async () => {
            const ctx = createMockContext({ apiKey: 'synthetic-key-not-live' });
            ctx.httpRequest.resolves({ status: 200, data: {
                user_id: 'u_fixture', email_masked: null, scopes: ['read'], account
            } });
            await assert.rejects(auth.definition.requestProfileInfo(ctx), /invalid paying account/);
        });
    }
    it('does not misreport transient auth failures as invalid keys', async () => {
        const ctx = createMockContext({ apiKey: 'synthetic-key-not-live' });
        ctx.httpRequest.resolves({
            status: 429,
            data: { error: { type: 'rate_limit_error', code: 'rate_limited', request_id: 'req_fixture' } }
        });
        await assert.rejects(
            auth.definition.validate(ctx),
            (error) =>
                error.message.includes('rate_limited') && !error.message.includes('synthetic-key-not-live')
        );
    });
    it('rejects malformed account data', async () => {
        const ctx = createMockContext({ apiKey: 'synthetic-key-not-live' });
        ctx.httpRequest.resolves({ status: 200, data: {} });
        await assert.rejects(auth.definition.validate(ctx), /invalid account/);
    });
});

describe('Published contract schemas', () => {
    it('uses documented select option labels in the Designer', () => {
        for (const [component, field] of [
            ['SearchTranscripts', 'source'],
            ['ResolveEntities', 'type']
        ]) {
            const manifest = require('../../core/' + component + '/component.json');
            const input = manifest.inPorts[0].inspector.inputs[field];
            assert(
                input.options.every(
                    (option) => typeof option.content === 'string' && option.content === option.value
                )
            );
        }
    });
    for (const name of ['SearchTranscripts', 'ResolveEntities']) {
        it('validates ' + name + ' declared output contracts and service identity', () => {
            const manifest = require('../../core/' + name + '/component.json');
            assert(manifest.icon.startsWith('data:image/svg+xml;base64,'));
            assert.equal(manifest.auth.service, 'appmixer:arcmira');
            assert.equal(manifest.inPorts[0].schema.additionalProperties, false);
            const fixture = name === 'SearchTranscripts' ? search() : resolution();
            for (const port of manifest.outPorts.filter((p) => p.name !== 'error')) { assert(ajv.validate(port.schema, fixture), JSON.stringify(ajv.errors)); }
        });
    }
});

describe('Designer output examples', () => {
    for (const [name, component] of [
        ['SearchTranscripts', Search],
        ['ResolveEntities', Resolve]
    ]) {
        const manifest = require('../../core/' + name + '/component.json');
        for (const port of manifest.outPorts) {
            it(name + ' ' + port.name + ' example validates and follows its named branch', async () => {
                const data = port.schema.example;
                assert(ajv.validate(port.schema, data), JSON.stringify(ajv.errors));
                const ctx = context({ query: 'climate research' });
                ctx.httpRequest.resolves(
                    port.name === 'error'
                        ? { status: data.httpStatus, data: data.response }
                        : { status: 200, data }
                );
                await component.receive(ctx);
                output(ctx, port.name, data);
            });
        }
    }
});
