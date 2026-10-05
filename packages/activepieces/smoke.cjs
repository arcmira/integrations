const { arcmira } = require('./dist/index.js');
const { createMockActionContext } = require('@activepieces/pieces-framework');
const assert = require('node:assert/strict');
(async () => {
 const result = await arcmira.auth.validate({ auth: 'arcmira-activepieces-invalid-fixture' });
 assert.equal(result.valid, false);
 assert.match(result.error, /HTTP 401/);
 const context = { ...createMockActionContext({propsValue:{query:'coding agents',limit:1}}),auth:{secret_text:'arcmira-activepieces-invalid-fixture'}};
 await assert.rejects(arcmira.getAction('search_transcripts').run(context),/HTTP 401/);
 const icon=await fetch(arcmira.logoUrl);assert.equal(icon.status,200);assert.match(icon.headers.get('content-type'),/image/);
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),authValidation:'live invalid key rejected with 401',search:'live invalid key rejected with 401',logo:'HTTP 200 image',validAccountResearch:'not exercised',hostInstallation:'not exercised',spend:0},null,2));
})().catch(error => { console.error(error.message);process.exitCode=1;});
