import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

assert.ok(process.env.DSH_INSTALL_DIR, 'Set DSH_INSTALL_DIR to a project with @deepseek-ai/dsh 0.1.7-rc.2 installed');
const requireDsh = createRequire(join(resolve(process.env.DSH_INSTALL_DIR), 'package.json'));
const installed = requireDsh('@deepseek-ai/dsh/package.json');
assert.equal(installed.version, '0.1.7-rc.2');
const load = async (name) => import(pathToFileURL(requireDsh.resolve(name)).href);
const { default: yaml } = await load('js-yaml');
const { Context } = await load('@deepseek-ai/cordis');
const { default: Loader } = await load('@deepseek-ai/cordis-plugin-loader');
const { default: SystemPrompt } = await load('@deepseek-ai/dsh-system-prompt');
const { default: Tools } = await load('@deepseek-ai/dsh-tools');
const { default: Sessions } = await load('@deepseek-ai/dsh-session');
const { default: Projections } = await load('@deepseek-ai/dsh-session-projection');
const { default: Agents } = await load('@deepseek-ai/dsh-agent');
const { default: AgentLoop } = await load('@deepseek-ai/dsh-agent-loop');
const { default: Llm } = await load('@deepseek-ai/dsh-llm');
const { default: Presets } = await load('@deepseek-ai/dsh-agent-preset-registry');
const { default: Preset } = await load('@deepseek-ai/dsh-agent-preset');
const output = await mkdtemp(join(tmpdir(), 'arcmira-dsh-check-'));
const patch = new URL('./arcmira-docs.patch.yml', import.meta.url);
const network = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  assert.equal(url.href, 'https://arcmira.com/docs/mcp', 'Only the public documentation MCP endpoint is allowed');
  const headers = new Headers(init?.headers ?? input?.headers);
  assert.equal(headers.has('authorization'), false);
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
  const messages = Array.isArray(body) ? body : body ? [body] : [];
  for (const message of messages) {
    if (message.method === 'tools/call') assert.equal(message.params.name, 'search_arcmira_api');
    network.push({ method: message.method, tool: message.params?.name ?? null });
  }
  return originalFetch(input, { ...init, redirect: 'error' });
};
const ctx = new Context();
ctx.baseUrl = pathToFileURL(join(resolve(process.env.DSH_INSTALL_DIR), 'package.json')).href;
const fibers = [];
const handles = [];
async function add(plugin, config) {
  const fiber = ctx.plugin(plugin, config);
  fibers.push(fiber);
  await fiber.await();
}
const docsPreset = yaml.load(await readFile(patch, 'utf8'))[0].insert[0].config;
try {
  await add(Loader, { baseUrl: ctx.baseUrl });
  await add(SystemPrompt);
  await add(Tools);
  await add(Sessions);
  await add(Projections);
  await add(Agents);
  await add(Llm);
  await add(AgentLoop, { agents: [] });
  await add(Presets, { default: 'arcmira-docs' });
  await add(Preset, docsPreset);
  await add(Preset, { id: 'control', name: 'No Arcmira tools', plugins: [] });
  for (const id of ['arcmira-docs', 'control']) {
    const preset = await ctx.agentPresets.resolve(id);
    assert.equal(preset.broken, undefined, JSON.stringify(preset));
    const handle = await ctx.agents.create({
      sessionId: `arcmira-docs-validation-${id}`, agentOptions: {},
      meta: { cwd: process.cwd(), agentPreset: id },
      setup: async (agentCtx) => { await ctx.agentPresets.mount(agentCtx, id); },
    });
    handles.push(handle);
  }
  const [docs, control] = handles.map(handle => handle.agent);
  const names = agent => ctx.tools.schemas(agent).map(schema => schema.name);
  const docsSchemas = ctx.tools.schemas(docs);
  const docsNames = names(docs);
  assert.equal(docsNames.length, 3);
  assert.deepEqual(names(control), []);
  assert.deepEqual(ctx.tools.schemas().map(schema => schema.name), []);
  assert.equal(ctx.agentPresets.composedPreset(docs.ctx), 'arcmira-docs');
  assert.equal(ctx.sessionProjections.stateOf(docs.session, 'agentPreset'), 'arcmira-docs');
  await writeFile(`${output}/tool-schemas.json`, JSON.stringify(docsSchemas, null, 2));
  const search = docsSchemas.find(schema => schema.name.endsWith('__search_arcmira_api'));
  const searchResult = await ctx.tools.execute({
    callId: 'arcmira-docs-read-1', name: search.name,
    arguments: { query: 'API authentication bearer API key' }, agent: docs,
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(searchResult.isError, false, JSON.stringify(searchResult));
  assert.ok(JSON.stringify(searchResult).includes('arcmira.com/docs'));
  await writeFile(`${output}/search-result.json`, JSON.stringify(searchResult, null, 2));
  const controlResult = await ctx.tools.execute({
    callId: 'arcmira-docs-control-1', name: search.name,
    arguments: { query: 'API authentication' }, agent: control,
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(controlResult.isError, true);
  assert.equal(controlResult.error?.info?.code, 'UNKNOWN_TOOL');
  await writeFile(`${output}/control-result.json`, JSON.stringify(controlResult, null, 2));
  const restricted = await ctx.agents.create({
    sessionId: 'arcmira-docs-restricted', agentOptions: {},
    meta: { cwd: process.cwd(), agentPreset: 'arcmira-docs' },
    setup: async (agentCtx) => {
      await ctx.agentPresets.mount(agentCtx, 'arcmira-docs');
      agentCtx.tools.restrict({ allow: [
        'mcp__arcmiraDocs__search_arcmira_api',
        'mcp__arcmiraDocs__query_docs_filesystem_arcmira_api',
      ] });
    },
  });
  handles.push(restricted);
  const restrictedNames = names(restricted.agent);
  assert.deepEqual(restrictedNames, docsNames.filter(name => !name.endsWith('__submit_feedback')));
  assert.equal(names(docs).length, 3);
  assert.equal(network.filter(item => item.method === 'tools/call').length, 1);
  console.log(JSON.stringify({ docsNames, controlNames: names(control), restrictedNames, searchPassed: true, controlDenied: true, output }));
  const result = { checked_at: new Date().toISOString(), version: '0.1.7-rc.2',
    stage: 'native-session-composition', passed: true, docsNames, controlNames: names(control), rootNames: [],
    sessionProjection: ctx.sessionProjections.stateOf(docs.session, 'agentPreset'), searchPassed: true, controlDenied: true, restrictedNames, network,
    scope: 'Installed AgentLoop creates real native sessions, with the resolve/mount sequence used by the Web API session controller. No Web server or browser, model inference, research credentials, or feedback calls.' };
  await writeFile(`${output}/result.json`, JSON.stringify(result, null, 2));
} finally {
  for (const handle of handles.reverse()) await handle.dispose();
  for (const fiber of fibers.reverse()) await fiber.dispose();
  globalThis.fetch = originalFetch;
}
