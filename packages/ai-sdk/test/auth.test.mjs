import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

function run(script, key) {
  const env = { ...process.env };
  delete env.ARCMIRA_API_KEY;
  if (key !== undefined) env.ARCMIRA_API_KEY = key;
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { createArcmiraTools } from './dist/index.js';
    ${script}
  `], { cwd: new URL('../', import.meta.url), env, stdio: 'pipe' });
}

test('no-argument setup authenticates search and resolution with the environment key', () => {
  run(`
    const paths = [];
    globalThis.fetch = async (url, init) => {
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer environment-key');
      paths.push(new URL(url).pathname);
      return Response.json({ fixture: true });
    };
    const tools = createArcmiraTools();
    await tools.arcmiraSearch.execute({ q: 'GPU demand' }, {});
    await tools.arcmiraResolve.execute({ q: 'NVIDIA' }, {});
    assert.deepEqual(paths, ['/v1/search', '/v1/entities/resolve']);
  `, ' environment-key ');
});

test('an explicit key overrides the environment key', () => {
  run(`
    let calls = 0;
    const tools = createArcmiraTools({ apiKey: 'explicit-key', fetch: async (url, init) => {
      calls++;
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer explicit-key');
      return Response.json({ fixture: true });
    }});
    await tools.arcmiraSearch.execute({ q: 'GPU demand' }, {});
    assert.equal(calls, 1);
    assert.throws(() => createArcmiraTools({ apiKey: ' ' }));
  `, 'environment-key');
});

for (const key of [undefined, '', ' ']) {
  test(`missing or blank environment key fails before network: ${JSON.stringify(key)}`, () => {
    run(`
      let calls = 0;
      globalThis.fetch = async () => { calls++; throw Error('Unexpected network request'); };
      assert.throws(() => createArcmiraTools());
      assert.equal(calls, 0);
    `, key);
  });
}
