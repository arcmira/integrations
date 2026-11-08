const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),nock=require('nock');
const fs=require('node:fs'),os=require('node:os');
const engineHome=fs.mkdtempSync(path.join(os.tmpdir(),'arcmira-n8n-trigger-'));
process.env.N8N_USER_FOLDER=engineHome;
test.after(()=>fs.rmSync(engineHome,{recursive:true,force:true}));
process.env.N8N_DIAGNOSTICS_ENABLED='false';
const {Workflow}=require('n8n-workflow');
const {PollContext,LoadOptionsContext}=require('n8n-core');
const {ArcmiraTrigger}=require('../dist/nodes/ArcmiraTrigger/ArcmiraTrigger.node');
const {ArcmiraApi}=require('../dist/credentials/ArcmiraApi.credentials');
const credential=new ArcmiraApi(),fakeKey='arcmira-synthetic-trigger-test';
const fixture=require('./fixtures/responses.json').AlertListResponse.example.alerts[0];
nock.disableNetConnect();

function alert(n,extra={}){return {...structuredClone(fixture),id:'dlv_fixture'+String(n).padStart(4,'0'),mention_id:'men_'+n,created_at:`2026-11-06T17:${String(n).padStart(2,'0')}:00.000Z`,...extra}}
function list(...alerts){return {alerts,has_more:false,next_cursor:null}}

function setup(monitorId='mon_fixture'){
 const type=new ArcmiraTrigger(),node={id:'trigger',name:'Arcmira Trigger',type:'n8n-nodes-arcmira.arcmiraTrigger',typeVersion:1,position:[0,0],parameters:{monitorId},credentials:{arcmiraApi:{id:'synthetic',name:'Synthetic test'}}};
 const workflow=new Workflow({id:'arcmira-trigger-test',nodes:[node],connections:{},active:true,nodeTypes:{getByNameAndVersion:()=>type,getKnownTypes:()=>({})},settings:{timezone:'UTC'}});
 const additional={executionId:'test',variables:{},credentialsHelper:{
  getParentTypes:()=>[],isCredentialUsableByNode:()=>true,preAuthentication:async()=>undefined,
  getDecrypted:async(_data,_details,name)=>{assert.equal(name,'arcmiraApi');return {apiKey:fakeKey}},
  authenticate:async(data,name,options)=>{
   assert.equal(name,'arcmiraApi');
   const Authorization=workflow.expression.getParameterValue(credential.authenticate.properties.headers.Authorization,null,0,0,node.name,[],'trigger',{$credentials:data},undefined,false);
   return {...options,headers:{...options.headers,Authorization}};
  }}};
 return {
  workflow,node,
  poll:(mode='trigger')=>type.poll.call(new PollContext(workflow,node,additional,mode,'activate')),
  monitors:()=>type.methods.loadOptions.getMonitors.call(new LoadOptionsContext(workflow,node,additional,'parameters.monitorId')),
  state:()=>JSON.parse(JSON.stringify(workflow.getStaticData('node',node))),
 };
}
function api(){return nock('https://api.arcmira.com',{reqheaders:{authorization:'Bearer '+fakeKey}})}
function alerts(monitor,body,status=200,times=1){return api().get(`/v1/monitors/${monitor}/alerts`).query({limit:100}).times(times).reply(status,body)}
const emitted=out=>out===null?null:out[0].map(item=>item.json.id);
test.afterEach(()=>{const pending=nock.pendingMocks();nock.cleanAll();assert.deepEqual(pending,[])});

test('first poll records the current alerts and emits nothing',async()=>{
 const t=setup();
 alerts('mon_fixture',list(alert(3),alert(2),alert(1)));
 assert.equal(await t.poll(),null);
 assert.deepEqual(t.state().seen,['trk_fixture/men_3','trk_fixture/men_2','trk_fixture/men_1']);
});

test('later poll emits only new alerts, oldest first, with every field',async()=>{
 const t=setup();
 alerts('mon_fixture',list(alert(1)));
 await t.poll();
 const fourth=alert(4),fifth=alert(5);
 alerts('mon_fixture',list(fifth,fourth,alert(1)));
 const out=await t.poll();
 assert.deepEqual(emitted(out),['dlv_fixture0004','dlv_fixture0005']);
 assert.deepEqual(out[0][1].json,fifth);
});

test('a poll with no new alerts emits nothing and forgets nothing',async()=>{
 const t=setup();
 alerts('mon_fixture',list(alert(2),alert(1)));
 await t.poll();
 alerts('mon_fixture',list(alert(2),alert(1)));
 assert.equal(await t.poll(),null);
 alerts('mon_fixture',list());
 assert.equal(await t.poll(),null);
 alerts('mon_fixture',list(alert(3),alert(2),alert(1)));
 assert.deepEqual(emitted(await t.poll()),['dlv_fixture0003']);
});

test('deliveries of one alert to several channels emit once',async()=>{
 const t=setup();
 alerts('mon_fixture',list(alert(1)));
 await t.poll();
 alerts('mon_fixture',list(alert(2,{id:'dlv_fixture0202',channel:'slack'}),alert(2),alert(1)));
 assert.deepEqual(emitted(await t.poll()),['dlv_fixture0002']);
 alerts('mon_fixture',list(alert(2,{id:'dlv_fixture0302',channel:'webhook'}),alert(2,{id:'dlv_fixture0202',channel:'slack'}),alert(2),alert(1)));
 assert.equal(await t.poll(),null);
});

test('an alert still sending waits, then fires once when delivered',async()=>{
 const t=setup();
 alerts('mon_fixture',list(alert(1)));
 await t.poll();
 const sending={status:'pending',final_status:null,sent_at:null};
 alerts('mon_fixture',list(alert(2,sending),alert(1)));
 assert.equal(await t.poll(),null);
 assert.deepEqual(t.state().seen,['trk_fixture/men_1']);
 alerts('mon_fixture',list(alert(2),alert(1)));
 assert.deepEqual(emitted(await t.poll()),['dlv_fixture0002']);
});

test('alerts held back, skipped or failed never fire',async()=>{
 const t=setup();
 alerts('mon_fixture',list());
 await t.poll();
 const held=alert(3,{status:'cancelled',final_status:'skipped',sent_at:null,error_message:'Held: not enough credits'});
 const skipped=alert(4,{status:'skipped',final_status:'skipped',sent_at:null});
 const failed=alert(5,{status:'failed',final_status:'failed',sent_at:null});
 alerts('mon_fixture',list(failed,skipped,held));
 assert.equal(await t.poll(),null);
 assert.deepEqual(t.state().seen,[]);
});

test('a delivery on one channel fires even when another channel was held',async()=>{
 const t=setup();
 alerts('mon_fixture',list());
 await t.poll();
 alerts('mon_fixture',list(alert(6,{id:'dlv_fixture0606',channel:'slack'}),alert(6,{status:'cancelled',final_status:'skipped',sent_at:null})));
 assert.deepEqual(emitted(await t.poll()),['dlv_fixture0606']);
});

test('alerts without a mention dedupe by alert id',async()=>{
 const t=setup();
 alerts('mon_fixture',list());
 await t.poll();
 const bare=alert(7,{tracker_id:null,mention_id:null});
 alerts('mon_fixture',list(bare));
 assert.deepEqual(emitted(await t.poll()),['dlv_fixture0007']);
 alerts('mon_fixture',list(bare));
 assert.equal(await t.poll(),null);
});

test('the record stays bounded',async()=>{
 const t=setup();
 alerts('mon_fixture',list());
 await t.poll();
 for(let page=0;page<12;page++){
  const batch=Array.from({length:100},(_,i)=>alert(page*100+i+1)).reverse();
  alerts('mon_fixture',list(...batch));
  assert.equal((await t.poll())[0].length,100);
 }
 const seen=t.state().seen;
 assert.equal(seen.length,1000);
 assert.equal(seen[0],'trk_fixture/men_1200');
});

test('choosing another monitor records again instead of flooding',async()=>{
 const t=setup();
 alerts('mon_fixture',list(alert(1)));
 await t.poll();
 t.node.parameters.monitorId='mon_other';
 alerts('mon_other',list(alert(9),alert(8)));
 assert.equal(await t.poll(),null);
 assert.equal(t.state().monitorId,'mon_other');
});

// n8n retries a 401 once after refreshing the credential, so the API sees two requests.
for(const [status,type,code,requests] of [[401,'authentication_error','invalid_api_key',2],[403,'permission_error','insufficient_scope',1],[404,'not_found','monitor_not_found',1]])test(`HTTP ${status} fails the poll and keeps the record`,async()=>{
 const t=setup();
 alerts('mon_fixture',list(alert(1)));
 await t.poll();
 const before=t.state();
 alerts('mon_fixture',{error:{type,code,message:'Synthetic refusal'}},status,requests);
 await assert.rejects(t.poll(),error=>{assert.equal(error.name,'NodeApiError');const serialized=JSON.stringify(error);assert.ok(serialized.includes(String(status)));assert.ok(!serialized.includes(fakeKey),'Credential must not appear in serialized error');return true});
 assert.deepEqual(t.state(),before);
});

test('an unexpected body fails instead of recording an empty list',async()=>{
 const t=setup();
 alerts('mon_fixture',list(alert(1)));
 await t.poll();
 alerts('mon_fixture',{alerts:[{channel:'email'}]});
 await assert.rejects(t.poll(),/unexpected alert list/);
 assert.deepEqual(t.state().seen,['trk_fixture/men_1']);
});

test('manual test returns the newest alert without recording',async()=>{
 const t=setup();
 alerts('mon_fixture',list(alert(2),alert(1)));
 assert.deepEqual(emitted(await t.poll('manual')),['dlv_fixture0002']);
 assert.deepEqual(t.state(),{});
 alerts('mon_fixture',list());
 await assert.rejects(t.poll('manual'),/no delivered alerts yet/);
 alerts('mon_fixture',list(alert(3,{status:'pending',final_status:null,sent_at:null})));
 await assert.rejects(t.poll('manual'),/no delivered alerts yet/);
});

test('monitor picker lists the account monitors',async()=>{
 const t=setup();
 api().get('/v1/monitors').reply(200,{monitors:[{id:'mon_fixture',name:'Synthetic monitor',tracker_count:2,alerts_this_month:1},{id:'mon_other',name:null,tracker_count:0,alerts_this_month:0}]});
 assert.deepEqual(await t.monitors(),[{name:'Synthetic monitor',value:'mon_fixture'},{name:'mon_other',value:'mon_other'}]);
});

test('monitor picker marks monitors that would never fire the trigger',async()=>{
 const t=setup();
 api().get('/v1/monitors').reply(200,require('./fixtures/responses.json').MonitorListResponse.example);
 const never='No instant alerts, so this trigger will never fire.',turnOn='Turn on instant email or Slack for this monitor in Arcmira.';
 assert.deepEqual(await t.monitors(),[
  {name:'Instant email',value:'mon_instant',description:'Instant alerts by email.'},
  {name:'Slack with a daily digest',value:'mon_slack_digest',description:'Instant alerts by Slack.'},
  {name:'Daily digest only',value:'mon_daily',description:`${never} Its email digest is daily, and digests create no alerts. ${turnOn}`},
  {name:'Hourly digest, pending recipient',value:'mon_hourly_pending',description:`${never} Its email digest is hourly, and digests create no alerts. ${turnOn}`},
  {name:'Paused',value:'mon_paused',description:'Paused. It sends no alerts, so this trigger will not fire until you resume the monitor.'},
 ]);
});

test('a digest-only monitor still polls without failing',async()=>{
 const t=setup('mon_daily');
 alerts('mon_daily',list());
 assert.equal(await t.poll(),null);
 alerts('mon_daily',list());
 assert.equal(await t.poll(),null);
});

test('redirect is not followed',async()=>{
 const t=setup();
 let redirected=false; nock('https://example.invalid').get('/secret').optionally().reply(()=>{redirected=true;return [200,list()]});
 api().get('/v1/monitors/mon_fixture/alerts').query({limit:100}).reply(302,'',{Location:'https://example.invalid/secret'});
 await assert.rejects(t.poll()); assert.equal(redirected,false);
});
