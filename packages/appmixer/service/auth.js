'use strict';
const lib = require('./lib');

async function profile(context) {
    const result = await lib.request(context, 'me', {}, true);
    if (result.error) {
        const { httpStatus, error, requestId } = result.error;
        throw new Error(
            'Arcmira account check failed: ' +
                JSON.stringify({
                    httpStatus,
                    type: error.type,
                    code: error.code,
                    gate: error.gate,
                    requestId
                }) +
                '. See https://arcmira.com/docs/errors.'
        );
    }
    const data = result.data;
    if (
        !data ||
        typeof data.user_id !== 'string' ||
        (data.email_masked !== null && typeof data.email_masked !== 'string') ||
        !Array.isArray(data.scopes)
    ) {
        throw new Error('Arcmira returned an invalid account profile.');
    }
    const parts = ['Arcmira'];
    if (data.account !== undefined) {
        const account = data.account;
        if (
            !account ||
            typeof account.id !== 'string' ||
            (account.name !== null && typeof account.name !== 'string') ||
            !['personal', 'team'].includes(account.kind)
        ) {
            throw new Error('Arcmira returned an invalid paying account.');
        }
        parts.push((account.kind === 'team' ? 'Team: ' : 'Personal: ') + (account.name || account.id));
    }
    parts.push(data.email_masked || data.user_id);
    if (typeof data.key_label === 'string' && data.key_label) {
        parts.push(data.key_label);
    }
    return { accountName: parts.join(' · ') };
}

module.exports = {
    type: 'apiKey',
    definition: {
        tokenType: 'apiKey',
        auth: {
            apiKey: {
                type: 'password',
                name: 'Arcmira API key',
                tooltip:
                    'Use your account API key. A paid read uses credits from your plan, then any top-up credits, then your on-demand budget. API docs: https://arcmira.com/docs.'
            }
        },
        accountNameFromProfileInfo: 'accountName',
        requestProfileInfo: profile,
        async validate(context) {
            await profile(context);
            return true;
        }
    }
};
