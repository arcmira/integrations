import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdtemp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const require = createRequire(import.meta.url);
const RED = require('node-red');
const flowBytes = await readFile(new URL('./arcmira-source-shortlist.json', import.meta.url));
const root = await mkdtemp(join(tmpdir(), 'arcmira-node-red-test-'));
const output = join(root, 'output');
await mkdir(output);
await writeFile(join(root, 'flows.json'), flowBytes);
const fakeKey = 'synthetic-fixture-key-not-a-credential';
const oldKey = process.env.ARCMIRA_API_KEY;
const oldDir = process.env.ARCMIRA_OUTPUT_DIR;
process.env.ARCMIRA_API_KEY = fakeKey;
process.env.ARCMIRA_OUTPUT_DIR = output;
let mode, summaries = [], sent = 0, fixtureRequests = 0, fixtureError;
const base = {window:{after:'2026-08-01T00:00:00.000Z',before:'2026-09-01T00:00:00.000Z'},partial:true,failed_batches:1,as_of:'2026-09-01T00:00:00Z',search_index:{status:'catching_up',missing_before:'2015-06-23'},note:'Fixture coverage note',chunks:[{video_id:'fixture-one',video_title:'=HYPERLINK("https://example.invalid")',channel_name:'+unsafe',text:'  \t=1+1,"quoted"\nnext line',start_seconds:12.5,watch_url:'/watch/fixture-one?t=12.5',source:'creator_captions',source_label:'Creator captions',published_at:'2026-08-02T00:00:00Z'},{video_id:'fixture-two',video_title:'@SUM(1,2)',text:'-1+1',start_seconds:null,watch_url:'/watch/fixture-two',source:'third_party_quick',source_label:'Quick',published_at:'2026-08-03T00:00:00Z'}]};
const fixture = createServer((req,res) => {
  fixtureRequests++;
  try {
    const url = new URL(req.url, 'http://localhost');
    assert.equal(req.method, 'GET'); assert.equal(url.pathname, '/v1/search');
    assert.equal(req.headers.authorization, 'Bearer '+fakeKey);
    assert.deepEqual(Object.fromEntries(url.searchParams), {q:'creator economy',after:'2026-08-01',before:'2026-09-01',limit:'3'});
    if (mode === 'transport') return req.socket.destroy();
    if (mode === 'redirect') {res.writeHead(302,{Location:'/must-not-follow'}); return res.end();}
    res.setHeader('Content-Type','application/json');
    if (mode === 'error') {res.statusCode=429; return res.end(JSON.stringify({error:{code:'rate_limit_exceeded',message:'Do not echo raw request details'}}));}
    if (mode === 'malformed') return res.end(JSON.stringify({chunks:[{}]}));
    return res.end(JSON.stringify({...base,chunks:mode === 'empty' ? [] : base.chunks}));
  } catch(error) {fixtureError=error;res.statusCode=500;res.end('{}');}
});
await new Promise(resolve => fixture.listen(0,'127.0.0.1',resolve));
const fixtureOrigin = 'http://127.0.0.1:'+fixture.address().port;
RED.init(createServer(), {userDir:root,flowFile:'flows.json',httpAdminRoot:false,httpNodeRoot:false,credentialSecret:false,functionExternalModules:false,logging:{console:{level:'off',metrics:false,audit:false}},editorTheme:{projects:{enabled:false}}});
RED.hooks.add('onReceive', event => {
  if (event.destination.id === 'arcmira-http') {
    const url = new URL(event.msg.url);
    assert.equal(url.origin,'https://api.arcmira.com'); assert.equal(url.pathname,'/v1/search');
    assert.equal(event.msg.followRedirects,false); sent++;
    if (mode !== 'live') event.msg.url = fixtureOrigin+url.pathname+url.search;
  }
  if (event.destination.id === 'arcmira-status') {
    assert.ok(!JSON.stringify(event.msg).includes(process.env.ARCMIRA_API_KEY || fakeKey));
    summaries.push(event.msg.payload);
  }
});
function parseCSV(text) {
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) {
    const ch=text[i];
    if(ch==='"') {if(quoted && text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(ch===',' && !quoted){row.push(cell);cell='';}
    else if(ch==='\r' && text[i+1]==='\n' && !quoted){row.push(cell);rows.push(row);row=[];cell='';i++;}
    else cell+=ch;
  }
  assert.equal(quoted,false);assert.equal(cell,'');assert.equal(row.length,0);return rows;
}
async function runCase(name) {
  mode=name;summaries=[];fixtureError=undefined;
  // Leave prior files in place: this proves overwrite rather than appending stale candidates.
  const beforeSent=sent,beforeFixture=fixtureRequests;
  RED.nodes.getNode('arcmira-input').receive();
  const deadline=Date.now()+20000;let packet,csv;
  while(Date.now()<deadline) {
    await new Promise(resolve=>setTimeout(resolve,25));
    if(!summaries.length)continue;
    try {
      const json=await readFile(join(output,'arcmira-source-shortlist.json'),'utf8');
      csv=await readFile(join(output,'arcmira-source-shortlist.csv'),'utf8');
      packet=JSON.parse(json);
      if(!json.endsWith('\n')||!csv.endsWith('\r\n'))continue;
      if(packet.status!==summaries.at(-1).status||packet.returned!==summaries.at(-1).returned||packet.error?.code!==summaries.at(-1).error?.code)continue;
      assert.ok(!json.includes(process.env.ARCMIRA_API_KEY||fakeKey));
      assert.ok(!csv.includes(process.env.ARCMIRA_API_KEY||fakeKey));
      break;
    }catch(error){if(error.code!=='ENOENT' && !(error instanceof SyntaxError))throw error;}
  }
  assert.ok(packet && csv && summaries.length, 'native flow did not produce completed output');
  if(fixtureError)throw fixtureError;
  assert.equal(sent-beforeSent,name==='missing-key'?0:1);
  if(name!=='live')assert.equal(fixtureRequests-beforeFixture,name==='missing-key'?0:1,'must not retry or follow redirects');
  return {packet,csv,rows:parseCSV(csv)};
}
const proof={node_red:require('node-red/package.json').version,node:process.version,flow_sha256:createHash('sha256').update(flowBytes).digest('hex'),transport:'Exact flow; native onReceive hook replaces only the destination URL for synthetic cases. Live case has no URL replacement.',cases:[]};
try {
  await RED.start();
  for(let i=0;i<200&&!RED.nodes.getNode('arcmira-input');i++)await new Promise(r=>setTimeout(r,25));
  let result=await runCase('success');
  assert.equal(result.packet.status,'ok');assert.equal(result.packet.returned,2);
  assert.equal(result.packet.partial,true);assert.equal(result.packet.failed_batches,1);
  assert.deepEqual(result.packet.search_index,base.search_index);assert.deepEqual(result.packet.applied_window,base.window);
  assert.equal(result.packet.candidates[0].passage,base.chunks[0].text);
  assert.equal(result.packet.candidates[0].passage_start_seconds,12.5);
  assert.equal(result.packet.candidates[0].arcmira_url,'https://arcmira.com/watch/fixture-one?t=12.5');
  assert.equal(result.packet.candidates[1].passage_start_seconds,null);
  assert.equal(result.packet.candidates[0].transcript_source,'creator_captions');
  assert.equal(result.packet.candidates[0].reuse_permission,'not established');
  assert.equal(result.rows.length,3);
  const first=Object.fromEntries(result.rows[0].map((k,i)=>[k,result.rows[1][i]]));
  assert.equal(first.passage,"'"+base.chunks[0].text);assert.equal(first.title,"'"+base.chunks[0].video_title);assert.equal(first.channel,"'+unsafe");
  const second=Object.fromEntries(result.rows[0].map((k,i)=>[k,result.rows[2][i]]));
  assert.equal(second.title,"'@SUM(1,2)");assert.equal(second.passage,"'-1+1");
  proof.cases.push({name:'success',status:'passed',candidates:2,csv_formula_escaping:true,coverage_preserved:true});
  if(process.env.ARCMIRA_TEST_REPORT){const baseURL=new URL('./', 'file://'+process.env.ARCMIRA_TEST_REPORT);await writeFile(new URL('fixture-success.csv',baseURL),result.csv);await writeFile(new URL('fixture-success.json',baseURL),JSON.stringify(result.packet,null,2)+'\n');}
  result=await runCase('empty');assert.equal(result.packet.status,'empty');assert.equal(result.rows.length,1);assert.deepEqual(result.packet.search_index,base.search_index);proof.cases.push({name:'empty',status:'passed',stale_candidates_removed:true});
  for(const [name,code] of [['error','rate_limit_exceeded'],['redirect','http_error'],['malformed','invalid_passage'],['transport','transport_error']]) {
    result=await runCase(name);assert.equal(result.packet.status,'error');assert.equal(result.packet.error.code,code);assert.equal(result.rows.length,1);proof.cases.push({name,status:'passed',requests:1});
  }
  delete process.env.ARCMIRA_API_KEY;
  result=await runCase('missing-key');assert.equal(result.packet.error.code,'missing_api_key');assert.equal(result.rows.length,1);proof.cases.push({name:'missing-key',status:'passed',requests:0});
  const liveKey=process.env.ARCMIRA_LIVE_TEST_KEY;
  if(liveKey){
    async function account(){const response=await fetch('https://api.arcmira.com/v1/me',{headers:{Authorization:'Bearer '+liveKey},redirect:'error'});assert.equal(response.status,200);const body=await response.json();assert.equal(body.tier,'free');assert.equal(body.usage.credits.on_demand.enabled,false);return body;}
    const before=await account();process.env.ARCMIRA_API_KEY=liveKey;
    result=await runCase('live');const after=await account();
    assert.equal(result.packet.status,'ok');assert.ok(result.packet.returned>0&&result.packet.returned<=3);assert.equal(result.rows.length,result.packet.returned+1);
    assert.equal(after.usage.credits.available,before.usage.credits.available);assert.equal(after.usage.credits.on_demand.used,before.usage.credits.on_demand.used);
    proof.live={status:'passed',at:new Date().toISOString(),tier:before.tier,on_demand_enabled:false,search_requests:1,account_requests:2,returned:result.packet.returned,credits_delta:0,on_demand_delta:0,requested_window:result.packet.requested_window,partial:result.packet.partial,search_index:result.packet.search_index};
  }
  proof.result='passed';
} finally {
  await RED.stop();await new Promise(resolve=>fixture.close(resolve));
  if(oldKey===undefined)delete process.env.ARCMIRA_API_KEY;else process.env.ARCMIRA_API_KEY=oldKey;
  if(oldDir===undefined)delete process.env.ARCMIRA_OUTPUT_DIR;else process.env.ARCMIRA_OUTPUT_DIR=oldDir;
  await rm(root,{recursive:true,force:true});
}
if(process.env.ARCMIRA_TEST_REPORT)await writeFile(process.env.ARCMIRA_TEST_REPORT,JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof,null,2));
