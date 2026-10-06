'use strict';
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const ajv = new Ajv({ strict: false, allErrors: false });
addFormats(ajv);
const schemas = new Map();
const base = 'https://api.arcmira.com/v1/';

function validator(schema) {
    if (!schemas.has(schema)) schemas.set(schema, ajv.compile(schema));
    return schemas.get(schema);
}

function requireInput(context, manifest) {
    const input = context.messages.in.content;
    const check = validator(manifest.inPorts[0].schema);
    if (!check(input)) {
        throw new context.CancelError(
            'Invalid input at ' +
                (check.errors[0].instancePath || 'input') +
                '. Check the component field requirements.'
        );
    }
    const idFields = {
        channelIds: /^UC[A-Za-z0-9_-]{22}$/,
        entityIds: /^ent_[A-Za-z0-9_-]+$/,
        about: /^ent_[A-Za-z0-9_-]+$/,
        by: /^ent_[A-Za-z0-9_-]+$/,
        kind: /^(sponsored|organic|mention)$/
    };
    for (const [name, pattern] of Object.entries(idFields)) {
        if (input[name] !== undefined) {
            const values = input[name].split(',').map((v) => v.trim());
            const maximum = name === 'kind' ? 3 : 8;
            if (values.length > maximum || values.some((v) => !pattern.test(v))) {
                throw new context.CancelError(
                    name +
                        ' requires at most ' +
                        maximum +
                        ' comma-separated IDs or supported values. Resolve names first.'
                );
            }
        }
    }
    if (input.after && input.before && Date.parse(input.after) >= Date.parse(input.before)) {
        throw new context.CancelError('After must be earlier than Before.');
    }
    return input;
}

function key(context, authContext = false) {
    const value = authContext ? context.apiKey : context.auth?.apiKey;
    if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) {
        const InputError = authContext ? Error : context.CancelError;
        throw new InputError('Connect an Arcmira API-key account first.');
    }
    return value;
}

function authHeaders(context, authContext = false) {
    return { Authorization: 'Bearer ' + key(context, authContext) };
}

function errorEnvelope(response, transport = false) {
    const status = Number.isInteger(response?.status) ? response.status : null;
    const data = response?.data ?? null;
    const apiError = data && typeof data === 'object' && !Array.isArray(data) && data.error;
    const error =
        apiError && typeof apiError === 'object' && !Array.isArray(apiError)
            ? apiError
            : {
                type: transport ? 'transport_error' : 'invalid_response',
                code: transport ? 'transport_unavailable' : 'unexpected_response',
                message: transport
                    ? 'Arcmira could not be reached. No fallback was attempted.'
                    : 'Arcmira returned an unexpected response.'
            };
    const rawDelay = response?.headers?.['retry-after'] ?? error.retry_after_seconds;
    const delay = rawDelay === undefined || rawDelay === null || rawDelay === '' ? null : Number(rawDelay);
    return {
        httpStatus: status,
        requestId: error.request_id ?? response?.headers?.['x-request-id'] ?? null,
        retryAfterSeconds: Number.isFinite(delay) && delay >= 0 ? delay : null,
        error,
        response: data
    };
}

async function request(context, endpoint, params, authContext = false) {
    const headers = authHeaders(context, authContext);
    try {
        const response = await context.httpRequest({
            method: 'GET',
            url: base + endpoint,
            headers,
            params,
            timeout: 30000,
            maxRedirects: 0,
            validateStatus: () => true
        });
        if (response.status !== 200) return { error: errorEnvelope(response) };
        return { data: response.data };
    } catch (error) {
        return { error: errorEnvelope(error.response, !error.response) };
    }
}

function contractError(data, schema) {
    const check = validator(schema);
    if (check(data)) return null;
    return {
        httpStatus: 200,
        requestId: null,
        retryAfterSeconds: null,
        error: {
            type: 'invalid_response',
            code: 'response_contract_mismatch',
            message:
                'Arcmira response does not match the released contract at ' +
                (check.errors[0].instancePath || 'response') +
                '.'
        },
        response: data ?? null
    };
}

module.exports = { requireInput, request, contractError, errorEnvelope, authHeaders };
