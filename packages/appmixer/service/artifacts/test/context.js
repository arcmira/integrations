'use strict';

// Only the context surface exercised by this package's synthetic behavior tests.
function stub(defaultResult) {
    const calls = [];
    let behavior = () => Promise.resolve(defaultResult);
    const fn = (...args) => {
        calls.push({ args });
        return behavior();
    };
    Object.defineProperties(fn, {
        callCount: { get: () => calls.length },
        firstCall: { get: () => calls[0] }
    });
    fn.getCalls = () => calls.slice();
    fn.resolves = (value) => { behavior = () => Promise.resolve(value); return fn; };
    fn.rejects = (error) => { behavior = () => Promise.reject(error); return fn; };
    return fn;
}

class CancelError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CancelError';
    }
}

function createMockContext(values) {
    const httpRequest = stub();
    httpRequest.rejects(new Error('No synthetic HTTP response configured'));
    return { ...values, CancelError, httpRequest, sendJson: stub(), sendArray: stub() };
}

module.exports = { createMockContext };
