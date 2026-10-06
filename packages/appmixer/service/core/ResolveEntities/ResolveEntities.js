'use strict';
const lib = require('../../lib');
const manifest = require('./component.json');
const schema = manifest.outPorts.find((port) => port.name === 'resolved').schema;

module.exports = {
    async receive(context) {
        const query = context.messages.in.content?.query;
        if (typeof query !== 'string' || !query.trim()) {
            throw new context.CancelError('Query is required.');
        }
        const input = lib.requireInput(context, manifest);
        const params = { q: input.query };
        for (const name of ['type', 'context', 'limit']) {
            if (input[name] !== undefined) params[name] = input[name];
        }
        const result = await lib.request(context, 'entities/resolve', params);
        if (result.error) return context.sendJson(result.error, 'error');
        const data = result.data;
        const invalid = lib.contractError(data, schema);
        if (invalid) return context.sendJson(invalid, 'error');
        const exact = data.confidence === 'exact' && data.best && !data.suggested && !data.ask;
        const empty =
            data.confidence === 'none' &&
            !data.best &&
            !data.suggested &&
            !data.ask &&
            data.candidates.length === 0;
        return context.sendJson(data, exact ? 'resolved' : empty ? 'notFound' : 'review');
    }
};
