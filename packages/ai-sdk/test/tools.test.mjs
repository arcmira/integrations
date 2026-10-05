import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { generateText, isStepCount } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { createArcmiraTools } from '../dist/index.js';
import { searchInput, resolveInput } from '../dist/inputs.js';

const usage = {inputTokens:{total:1,noCache:1,cacheRead:0,cacheWrite:0},outputTokens:{total:1,text:1,reasoning:0}};
const response = (content, reason='tool-calls') => ({content,finishReason:{unified:reason,raw:reason},usage,warnings:[]});
const call = (toolName, input) => response([{type:'tool-call',toolCallId:'fixture-call',toolName,input:JSON.stringify(input)}]);
const input = {q:'AI agents',channel_ids:'UCfixture',entity_ids:'ent_1',about:'ent_2',by:'ent_3',kind:'organic',after:'2026-09-01',before:'2026-10-01',source:'arcmira_premium',limit:8};
const result = {chunks:[{published_at:'2026-09-15T00:00:00Z',text:'Synthetic passage.',watch_url:'https://arcmira.com/watch?v=fixture&t=90',speakers_by:[{id:'ent_3',name:'Fixture speaker'}]}],window:{after:'2026-09-01',before:'2026-10-01'},search_index:{state:'live',missing_before:null},note:'Synthetic coverage note'};

async function run(toolName, args, fetch) {
 const model = new MockLanguageModelV4({doGenerate:[call(toolName,args),response([{type:'text',text:'Fixture complete.'}],'stop')]});
 const output = await generateText({model,tools:createArcmiraTools({apiKey:'fixture-key',fetch}),prompt:'Synthetic tool execution check',stopWhen:isStepCount(2)});
 return {output,model};
}

test('AI SDK executes search and carries exact source evidence into the next model step',async()=>{
 let calls=0;
 const {output,model}=await run('arcmiraSearch',input,async(u,init)=>{
  calls++;const url=new URL(u);assert.equal(url.origin,'https://api.arcmira.com');assert.equal(url.pathname,'/v1/search');
  for(const [k,v] of Object.entries(input)) assert.equal(url.searchParams.get(k),String(v));
  assert.equal(url.searchParams.has('spending'),false);assert.equal(url.searchParams.has('src'),false);
  assert.equal(new Headers(init.headers).get('authorization'),'Bearer fixture-key');
  return Response.json(result);
 });
 assert.equal(calls,1);assert.deepEqual(output.steps[0].toolResults[0].output,result);
 assert.ok(JSON.stringify(model.doGenerateCalls[1].prompt).includes(result.chunks[0].watch_url));
 assert.ok(JSON.stringify(model.doGenerateCalls[1].prompt).includes('Synthetic coverage note'));
});

test('entity resolution preserves ambiguity and channel IDs',async()=>{
 const resolved={status:'ambiguous',candidates:[{id:'ent_2',name:'Fixture A',youtube_channel_id:'UCfixture'},{id:'ent_3',name:'Fixture B'}]};let calls=0;
 const {output}=await run('arcmiraResolve',{q:'Fixture',type:'channel',context:'the interview show',limit:2},async(u)=>{
  calls++;const url=new URL(u);assert.equal(url.pathname,'/v1/entities/resolve');assert.equal(url.searchParams.get('type'),'channel');assert.equal(url.searchParams.get('context'),'the interview show');return Response.json(resolved);
 });
 assert.equal(calls,1);assert.deepEqual(output.steps[0].toolResults[0].output,resolved);
});

for(const [status,code] of [[401,'unauthorized'],[402,'quota_exceeded'],[403,'filter_requires_paid'],[429,'rate_limited'],[503,'search_unavailable']]) {
 test(`AI SDK preserves ${status} ${code} without retry or source fallback`,async()=>{
  let calls=0;const body={error:{code,message:'Synthetic API refusal',request_id:'fixture-request',details:{source:'arcmira_premium'}}};
  const {output,model}=await run('arcmiraSearch',input,async()=>{calls++;return Response.json(body,{status,headers:{'x-request-id':'fixture-request'}})});
  assert.equal(calls,1);assert.equal(output.steps[0].toolResults.length,0);
  const error=output.steps[0].content.find(x=>x.type==='tool-error');assert.ok(error);assert.equal(error.error.statusCode,status);assert.deepEqual(error.error.body,body);
  assert.ok(JSON.stringify(model.doGenerateCalls[1].prompt).includes(code));
 });
}

for(const args of [{q:'a'},{q:'valid',limit:21},{q:'valid',source:'invented'},{q:'valid',spending:'existing_credits'}]) {
 test(`invalid tool input never reaches API: ${JSON.stringify(args)}`,async()=>{
  let calls=0;const {output}=await run('arcmiraSearch',args,async()=>{calls++;throw Error('Must not fetch')});
  assert.equal(calls,0);assert.ok(output.steps[0].content.some(x=>x.type==='tool-error'));
 });
}

test('blank API key fails before constructing tools',()=>assert.throws(()=>createArcmiraTools({apiKey:' '})));

test('AI SDK cancellation reaches the API request',async()=>{
 const controller=new AbortController();let signal;
 const tools=createArcmiraTools({apiKey:'fixture-key',fetch:async(u,init)=>{signal=init.signal;controller.abort();throw signal.reason;}});
 await assert.rejects(()=>tools.arcmiraSearch.execute({q:'valid'},{toolCallId:'cancel',messages:[],abortSignal:controller.signal}));
 assert.equal(signal.aborted,true);
});

test('tool schema parameters match captured production API, excluding MCP-only attribution',async()=>{
 const api=JSON.parse(await readFile(new URL('../../openapi.json',import.meta.url),'utf8'));
 for(const [path,schema] of [['/v1/search',searchInput],['/v1/entities/resolve',resolveInput]]){
  const params=api.paths[path].get.parameters.filter(p=>p.name!=='src');
  assert.deepEqual(Object.keys(schema.shape).sort(),params.map(p=>p.name).sort());
  for(const p of params) assert.equal(schema.shape[p.name].description,p.description);
 }
});
