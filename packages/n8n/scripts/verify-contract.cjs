const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const candidate = path.join(__dirname,'..');
const {Arcmira} = require(path.join(candidate,'dist/nodes/Arcmira/Arcmira.node.js'));
const {ArcmiraApi} = require(path.join(candidate,'dist/credentials/ArcmiraApi.credentials.js'));
const spec = JSON.parse(fs.readFileSync(path.join(candidate,'../openapi.json'),'utf8'));
const node = new Arcmira().description;
const credentials = new ArcmiraApi();
const results = [];
for (const [resource,operation,url] of [['transcript','search','/search'],['entity','resolve','/entities/resolve']]) {
 const api = (spec.paths[url] || spec.paths['/v1'+url]).get;
 const fields = node.properties.filter(p=>p.displayOptions?.show?.resource?.includes(resource));
 const op = fields.find(p=>p.name==='operation').options.find(p=>p.value===operation);
 assert.deepEqual(op.routing.request,{method:'GET',url});
 const leaf = fields.flatMap(p=>p.type==='collection'?p.options:[p]).filter(p=>p.routing?.send);
 const expected = api.parameters.filter(p=>!['src','channel'].includes(p.name));
 assert.deepEqual(leaf.map(p=>p.routing.send.property).sort(),expected.map(p=>p.name).sort());
 for (const a of expected) {
  const f=leaf.find(p=>p.routing.send.property===a.name);
  assert.equal(f.routing.send.type,'query');
  assert.equal(Boolean(f.required),Boolean(a.required));
  if(a.schema.enum) assert.deepEqual(f.options.map(o=>o.value),a.schema.enum);
  if(a.schema.type==='integer') {
   assert.equal(f.typeOptions.minValue,a.schema.minimum);
   assert.equal(f.typeOptions.maxValue,a.schema.maximum);
   assert.equal(f.default,a.schema.default);
  }
 }
 results.push({resource,operation,parameters:expected.length,contract:'pass'});
}
assert.equal(node.requestDefaults.baseURL,'https://api.arcmira.com/v1');
assert.equal(node.requestDefaults.disableFollowRedirect,true);
assert.equal(credentials.test.request.url,'/me');
assert.equal(credentials.test.request.baseURL,'https://api.arcmira.com/v1');
assert.equal(credentials.properties.find(p=>p.name==='apiKey').typeOptions.password,true);
assert.equal(credentials.documentationUrl,'https://arcmira.com/docs');
assert.equal(credentials.authenticate.properties.headers.Authorization,'=Bearer {{$credentials.apiKey}}');
assert.equal(node.usableAsTool,true);
const pkg=JSON.parse(fs.readFileSync(path.join(candidate,'package.json'),'utf8'));
assert.equal(pkg.private,true);assert.equal(pkg.dependencies,undefined);
const result={checked_at:new Date().toISOString(),scope:'Compiled n8n node and credential classes load. Request declarations compared with saved deployed OpenAPI; not a host execution test.',results,credentials:'pass',runtime_dependencies:0,host_execution_tested:false};
console.log(JSON.stringify(result,null,2));
