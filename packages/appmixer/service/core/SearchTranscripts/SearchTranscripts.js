'use strict';
const lib = require('../../lib');
const manifest = require('./component.json');
const schema = manifest.outPorts.find((port) => port.name === 'out').schema;
const parameters = {
    query: 'q',
    channelIds: 'channel_ids',
    entityIds: 'entity_ids',
    about: 'about',
    by: 'by',
    kind: 'kind',
    after: 'after',
    before: 'before',
    source: 'source',
    limit: 'limit'
};

module.exports = {
    async receive(context) {
        const query = context.messages.in.content?.query;
        if (typeof query !== 'string' || !query.trim()) {
            throw new context.CancelError('Query is required.');
        }
        const input = lib.requireInput(context, manifest);
        const params = Object.fromEntries(
            Object.entries(parameters)
                .filter(([key]) => input[key] !== undefined)
                .map(([key, wire]) => [wire, input[key]])
        );
        const result = await lib.request(context, 'search', params);
        if (result.error) return context.sendJson(result.error, 'error');
        const data = result.data;
        const invalid = lib.contractError(data, schema);
        if (invalid) return context.sendJson(invalid, 'error');
        if (data.returned !== data.chunks.length || data.returned > data.limit) {
            return context.sendJson(
                {
                    httpStatus: 200,
                    requestId: null,
                    retryAfterSeconds: null,
                    error: {
                        type: 'invalid_response',
                        code: 'inconsistent_result_count',
                        message: 'Arcmira returned inconsistent result counts.'
                    },
                    response: data
                },
                'error'
            );
        }
        const limited =
            data.partial ||
            data.failed_batches > 0 ||
            data.access ||
            data.unlock ||
            data.preview ||
            data.complete === false ||
            data.coverage ||
            data.search_index.state !== 'live';
        return context.sendJson(data, limited ? 'limited' : data.chunks.length ? 'out' : 'notFound');
    }
};
