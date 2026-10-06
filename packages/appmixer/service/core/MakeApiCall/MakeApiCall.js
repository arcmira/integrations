'use strict';
const lib = require('../../lib');
const API_BASE = 'https://api.arcmira.com/v1/';
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const allowedHeaders = new Set([
    'accept',
    'content-type',
    'if-match',
    'if-none-match',
    'idempotency-key',
    'x-request-id'
]);

function endpoint(context, value) {
    if (typeof value !== 'string' || !value.trim()) { throw new context.CancelError('API Endpoint Path is required.'); }
    if (value !== value.trim() || /[\\?#\s]/.test(value)) { throw new context.CancelError('Use a relative API path; put query parameters in Parameters.'); }
    const relative = value.startsWith('/v1/') ? value.slice(4) : value;
    if (!relative || relative.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(relative)) {
        throw new context.CancelError('Use a path relative to https://api.arcmira.com/v1/.');
    }
    for (const segment of relative.split('/')) {
        let decoded;
        try {
            decoded = decodeURIComponent(segment);
        } catch {
            throw new context.CancelError('API Endpoint Path has invalid encoding.');
        }
        if (decoded === '.' || decoded === '..' || /[\\/%?#\u0000-\u0020\u007f]/.test(decoded)) {
            throw new context.CancelError('API Endpoint Path contains an unsafe segment.');
        }
    }
    const target = new URL(relative, API_BASE);
    if (
        target.origin !== new URL(API_BASE).origin ||
        !target.pathname.startsWith('/v1/') ||
        target.username ||
        target.password
    ) {
        throw new context.CancelError('API Endpoint Path must remain inside Arcmira v1.');
    }
    return target.href;
}

function pairs(context, value, field) {
    if (value === undefined || value === '') return {};
    let rows = value;
    if (typeof rows === 'string') {
        try {
            rows = JSON.parse(rows);
        } catch {
            throw new context.CancelError(field + ' must contain key-value rows.');
        }
        if (rows && typeof rows === 'object' && !Array.isArray(rows)) {
            rows = Object.entries(rows).map(([key, value]) => ({ key, value }));
        }
    }
    if (!Array.isArray(rows)) throw new context.CancelError(field + ' must contain key-value rows.');
    const result = {};
    const seen = new Set();
    for (const row of rows) {
        if (
            !row ||
            typeof row.key !== 'string' ||
            !row.key ||
            /[\r\n\u0000]/.test(row.key) ||
            ['__proto__', 'constructor', 'prototype'].includes(row.key)
        ) {
            throw new context.CancelError(field + ' contains an invalid key.');
        }
        if (typeof row.value !== 'string' || /[\r\n\u0000]/.test(row.value)) { throw new context.CancelError(field + ' values must be text without line breaks.'); }
        const name = field === 'Headers' ? row.key.toLowerCase() : row.key;
        if (seen.has(name)) throw new context.CancelError(field + ' contains a duplicate key.');
        if (field === 'Headers' && !allowedHeaders.has(name)) {
            throw new context.CancelError(
                'Header is not allowed. Use Accept, Content-Type, If-Match, If-None-Match, Idempotency-Key or X-Request-ID. Authentication is managed by the account.'
            );
        }
        seen.add(name);
        result[name] = row.value;
    }
    return result;
}

module.exports = {
    async receive(context) {
        const input = context.messages.in.content || {};
        const url = endpoint(context, input.url);
        if (!methods.has(input.method)) {
            throw new context.CancelError(
                'HTTP Method is required and must be GET, POST, PUT, PATCH or DELETE.'
            );
        }
        if (
            Object.keys(input).some(
                (key) => !['url', 'method', 'parameters', 'body', 'headers'].includes(key)
            )
        ) {
            throw new context.CancelError('Use only the declared API call fields.');
        }
        const params = pairs(context, input.parameters, 'Parameters');
        const headers = { ...pairs(context, input.headers, 'Headers'), ...lib.authHeaders(context) };
        const request = {
            method: input.method,
            url,
            params,
            headers,
            timeout: 30000,
            maxRedirects: 0,
            validateStatus: () => true
        };
        if (input.body !== undefined && input.body !== '') {
            if (input.method === 'GET') throw new context.CancelError('GET requests cannot include a body.');
            if (typeof input.body !== 'string') throw new context.CancelError('Body must be JSON text.');
            try {
                request.data = JSON.parse(input.body);
            } catch {
                throw new context.CancelError('Body must be valid JSON.');
            }
        }
        let response;
        try {
            response = await context.httpRequest(request);
        } catch (error) {
            if (error.response) response = error.response;
            else {
                const diagnostic = lib.errorEnvelope(null, true);
                if (input.method !== 'GET') {
                    diagnostic.error.message =
                        'No response was received. The write may have completed; check its outcome before retrying.';
                }
                return context.sendJson(
                    {
                        statusCode: null,
                        headers: {},
                        body: null,
                        error: diagnostic.error,
                        requestId: null,
                        retryAfterSeconds: null
                    },
                    'error'
                );
            }
        }
        const result = {
            statusCode: response.status,
            headers: response.headers || {},
            body: response.data ?? null
        };
        if (response.status >= 200 && response.status < 300) return context.sendJson(result, 'out');
        const diagnostic = lib.errorEnvelope(response);
        return context.sendJson(
            {
                ...result,
                error: diagnostic.error,
                requestId: diagnostic.requestId,
                retryAfterSeconds: diagnostic.retryAfterSeconds
            },
            'error'
        );
    }
};
