import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { AIMessage } from '@langchain/core/messages';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { StateGraph, MessagesAnnotation, START, END } from '@langchain/langgraph';
import { createArcmiraTools } from '../dist/index.js';
import { searchInput, resolveInput } from '../dist/inputs.js';

const input = {q:'AI agents',channel_ids:'UCfixture',entity_ids:'ent_1',about:'ent_2',by:'ent_3',kind:'organic',after:'2026-09-01',before:'2026-10-01',source:'arcmira_premium',limit:8};
const result = {chunks:[{published_at:'2026-09-15T00:00:00Z',text:'Synthetic passage.',watch_url:'https://arcmira.com/watch?v=fixture&t=90',speakers_by:[{id:'ent_3',name:'Fixture speaker'}]}],window:{after:'2026-09-01',before:'2026-10-01'},search_index:{state:'live',missing_before:null},note:'Synthetic coverage note'};
function graph(fetch) {
 const tools=createArcmiraTools({apiKey:'fixture-key',fetch});
 return new StateGraph(MessagesAnnotation).addNode('tools',new ToolNode(tools,{handleToolErrors:false})).addEdge(START,'tools').addEdge('tools',END).compile();
}
async function run(name,args,fetch,config={}) {
 const output=await graph(fetch).invoke({messages:[new AIMessage({content:'',tool_calls:[{name,args,id:'fixture-call',type:'tool_call'}]})]},config);
 return output.messages.at(-1);
}

test('compiled LangGraph executes native search with exact filters and citation evidence',async()=>{
 let calls=0;
 const message=await run('arcmira_search',input,async(u,init)=>{
  calls++;const url=new URL(u);assert.equal(url.origin,'https://api.arcmira.com');assert.equal(url.pathname,'/v1/search');
  for(const [k,v] of Object.entries(input))assert.equal(url.searchParams.get(k),String(v));
  assert.equal(url.searchParams.has('spending'),false);assert.equal(url.searchParams.has('src'),false);
  assert.equal(new Headers(init.headers).get('authorization'),'Bearer fixture-key');
  return Response.json(result);
 });
 assert.equal(calls,1);assert.equal(message.tool_call_id,'fixture-call');assert.deepEqual(JSON.parse(message.content),result);
 assert.equal(message.name,'arcmira_search');
});

test('entity tool preserves ambiguity, source evidence and channel IDs',async()=>{
 const resolved={status:'ambiguous',candidates:[{id:'ent_2',name:'Fixture A',youtube_channel_id:'UCfixture'},{id:'ent_3',name:'Fixture B'}]};
 const message=await run('arcmira_resolve',{q:'Fixture',type:'channel',context:'the interview show',limit:2},async(u)=>{
  const url=new URL(u);assert.equal(url.pathname,'/v1/entities/resolve');assert.equal(url.searchParams.get('type'),'channel');assert.equal(url.searchParams.get('context'),'the interview show');return Response.json(resolved);
 });
 assert.deepEqual(JSON.parse(message.content),resolved);
});

for(const [status,code] of [[401,'unauthorized'],[402,'quota_exceeded'],[403,'filter_requires_paid'],[429,'rate_limited'],[503,'search_unavailable']]){
 test(`graph preserves ${status} ${code}; no retry or fallback`,async()=>{
  let calls=0;const body={error:{code,message:'Synthetic API refusal',request_id:'fixture-request',details:{source:'arcmira_premium'}}};
  await assert.rejects(()=>run('arcmira_search',input,async()=>{calls++;return Response.json(body,{status,headers:{'x-request-id':'fixture-request'}})}),e=>{assert.equal(e.statusCode,status);assert.deepEqual(e.body,body);return true;});assert.equal(calls,1);
 });
}
for(const args of [{q:'a'},{q:'valid',limit:21},{q:'valid',source:'invented'},{q:'valid',spending:'existing_credits'}]){
 test(`invalid input rejected before network: ${JSON.stringify(args)}`,async()=>{
  let calls=0;await assert.rejects(()=>run('arcmira_search',args,async()=>{calls++;throw Error('must not fetch')}));assert.equal(calls,0);
 });
}
test('blank API key rejected before tools are constructed',()=>assert.throws(()=>createArcmiraTools({apiKey:' '})));
test('Runnable cancellation reaches SDK network request',async()=>{
 const controller=new AbortController();let signal;
 await assert.rejects(()=>run('arcmira_search',{q:'valid'},async(u,init)=>{signal=init.signal;controller.abort();throw signal.reason},{signal:controller.signal}));assert.equal(signal.aborted,true);
});
test('generated schemas cover every current search and resolve parameter except MCP attribution',async()=>{
 const api=JSON.parse(await readFile(new URL('../../openapi.json',import.meta.url),'utf8'));
 for(const [path,schema] of [['/v1/search',searchInput],['/v1/entities/resolve',resolveInput]]){
  const params=api.paths[path].get.parameters.filter(p=>p.name!=='src');
  assert.deepEqual(Object.keys(schema.shape).sort(),params.map(p=>p.name).sort());
  for(const p of params)assert.equal(schema.shape[p.name].description,p.description);
 }
});
