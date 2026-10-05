const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),nock=require('nock');
const fs=require('node:fs'),os=require('node:os');
const engineHome=fs.mkdtempSync(path.join(os.tmpdir(),'arcmira-n8n-engine-'));
process.env.N8N_USER_FOLDER=engineHome;
test.after(()=>fs.rmSync(engineHome,{recursive:true,force:true}));
process.env.N8N_DIAGNOSTICS_ENABLED='false';
const {Workflow}=require('n8n-workflow');
const {RoutingNode,ExecuteContext}=require('n8n-core');
const {Arcmira}=require('../dist/nodes/Arcmira/Arcmira.node');
const {ArcmiraApi}=require('../dist/credentials/ArcmiraApi.credentials');
const credential=new ArcmiraApi(),fakeKey='arcmira-synthetic-engine-test';
const schema=require('./fixtures/responses.json');
nock.disableNetConnect();
async function run(parameters){
 const type=new Arcmira(),node={id:'test',name:'Arcmira',type:'n8n-nodes-arcmira.arcmira',typeVersion:1,position:[0,0],parameters,credentials:{arcmiraApi:{id:'synthetic',name:'Synthetic test'}}};
 const workflow=new Workflow({id:'arcmira-engine-test',nodes:[node],connections:{},active:false,nodeTypes:{getByNameAndVersion:()=>type,getKnownTypes:()=>({})},settings:{timezone:'UTC'}});
 const input=[{json:{}}],execution={data:{main:[input]},node,source:null},runData={resultData:{runData:{}},executionData:{contextData:{},nodeExecutionStack:[],waitingExecution:{}}};
 const additional={executionId:'test',variables:{},webhookWaitingBaseUrl:'http://localhost',formWaitingBaseUrl:'http://localhost',credentialsHelper:{getParentTypes:()=>[],preAuthentication:async()=>undefined,authenticate:async(data,name,options)=>{
  assert.equal(name,'arcmiraApi');
  const Authorization=workflow.expression.getParameterValue(credential.authenticate.properties.headers.Authorization,runData,0,0,node.name,input,'manual',{$credentials:data},execution,false);
  return {...options,headers:{...options.headers,Authorization}};
 }}};
 const context=new ExecuteContext(workflow,node,additional,'manual',runData,0,input,{main:[input]},execution,[]);
 return new RoutingNode(context,type,{id:'synthetic',name:'Synthetic test',data:{apiKey:fakeKey}}).runNode();
}
function api(){return nock('https://api.arcmira.com',{reqheaders:{authorization:'Bearer '+fakeKey}})}
test.afterEach(()=>{const pending=nock.pendingMocks();nock.cleanAll();assert.deepEqual(pending,[])});
test('all search filters preserve timestamps and coverage',async()=>{
 const response=structuredClone(schema.TranscriptSearchResponse.example); response.chunks[0].source='arcmira_premium'; response.chunks[0].source_label='Arcmira Premium'; response.partial=true; response.failed_batches=1;
 api().get('/v1/search').query({q:'battery technology',limit:5,channel_ids:'UCfixture',entity_ids:'ent_1',about:'ent_2',by:'ent_1',kind:'sponsored,organic',after:'2026-01-01',before:'2026-02-01',source:'arcmira_premium'}).reply(200,response);
 const out=await run({resource:'transcript',operation:'search',q:'battery technology',limit:5,options:{channelIds:'UCfixture',entityIds:'ent_1',about:'ent_2',by:'ent_1',kind:'sponsored,organic',after:'2026-01-01',before:'2026-02-01',source:'arcmira_premium'}});assert.deepEqual(out[0][0].json,response);
});
test('unselected filters omitted; empty results retain coverage',async()=>{
 const response={...structuredClone(schema.TranscriptSearchResponse.example),chunks:[],returned:0,as_of:null,note:'Speaker labels unavailable'};api().get('/v1/search').query({q:'battery technology',limit:5}).reply(200,response);
 const out=await run({resource:'transcript',operation:'search',q:'battery technology',limit:5,options:{}});assert.deepEqual(out[0][0].json,response);
});
test('entity resolution retains ambiguity',async()=>{
 const response={...structuredClone(schema.EntityResolveResponse.example),suggested:null,ask:{question:'Which Acme?',options:[{id:'ent_1',name:'Acme A',type:'organization',label:'Acme A'},{id:'ent_2',name:'Acme B',type:'organization',label:'Acme B'}]}};api().get('/v1/entities/resolve').query({q:'Acme',limit:8,type:'organization',context:'the startup bank'}).reply(200,response);
 const out=await run({resource:'entity',operation:'resolve',q:'Acme',limit:8,options:{type:'organization',context:'the startup bank'}});assert.deepEqual(out[0][0].json,response);
});
for(const [status,code] of [[403,'filter_requires_paid'],[402,'quota_exceeded'],[429,'rate_limited']])test(`HTTP ${status} stays an error; no caption fallback`,async()=>{
 api().get('/v1/search').query({q:'battery technology',limit:5,source:'arcmira_premium'}).reply(status,{error:{code,message:'Synthetic refusal',unlock:{url:'https://arcmira.com/pricing'}}});
 await assert.rejects(run({resource:'transcript',operation:'search',q:'battery technology',limit:5,options:{source:'arcmira_premium'}}),error=>{assert.equal(error.name,'NodeApiError');const serialized=JSON.stringify(error);assert.ok(serialized.includes(code));assert.ok(!serialized.includes(fakeKey),'Credential must not appear in serialized error');return true});
});
test('redirect is not followed',async()=>{
 let redirected=false; nock('https://example.invalid').get('/secret').optionally().reply(()=>{redirected=true;return [200,{unexpected:true}]});
 api().get('/v1/search').query({q:'battery technology',limit:5}).reply(302,'',{Location:'https://example.invalid/secret'});
 await assert.rejects(run({resource:'transcript',operation:'search',q:'battery technology',limit:5,options:{}})); assert.equal(redirected,false);
});
