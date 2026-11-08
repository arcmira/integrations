import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {createElementPayload, StudioProtocolInternals, setStudioDragData} from '@remotion/studio-protocol';
import {elements, sample, sourceLink} from '../src/catalog.ts';

test('source links retain the video and selected second, stripping unrelated parameters', () => {
  assert.equal(sourceLink('https://youtu.be/mD1F-yy_D8E?si=tracking&t=1', 823), 'https://www.youtube.com/watch?v=mD1F-yy_D8E&t=823s');
  assert.equal(sourceLink('https://www.youtube.com/watch?v=mD1F-yy_D8E&t=1&list=other', 5.9), 'https://www.youtube.com/watch?v=mD1F-yy_D8E&t=5s');
  for (const url of ['javascript:alert(1)', 'https://example.com/watch?v=mD1F-yy_D8E', 'https://youtube.com.evil.test/watch?v=mD1F-yy_D8E', 'https://name:password@youtube.com/watch?v=mD1F-yy_D8E', 'https://www.youtube.com/redirect?q=evil', 'broken']) {
    assert.equal(sourceLink(url, 5), null);
  }
  for (const seconds of [-1, NaN, Infinity]) assert.equal(sourceLink(sample.watchUrl, seconds), null);
});

for (const element of elements) {
  test(`${element.exportName} installs with the same editable inputs and source used by the preview`, async () => {
    const sourceCode = await readFile(`elements/${element.slug}.tsx`, 'utf8');
    const initialProps = {...sample, quote: 'An edited quote.', speaker: 'A speaker', startSeconds: 42};
    const payload = createElementPayload({displayName: element.name, slug: element.slug, sourceCode, dependencies: [],
      dimensions: {width: element.width, height: element.height}, durationInFrames: 150, initialProps, installationMode: 'wrapped'});
    const parsed = StudioProtocolInternals.parseStudioElementPayload(JSON.parse(JSON.stringify(payload)));
    assert.ok(parsed);
    assert.deepEqual(parsed, payload);
    const writes = new Map();
    const dataTransfer = {effectAllowed: 'none', setData: (type, value) => writes.set(type, value)};
    setStudioDragData({dataTransfer, payload});
    assert.equal(dataTransfer.effectAllowed, 'copy');
    assert.ok([...writes.values()].some(value => value.includes('An edited quote.')));
    const published = JSON.parse(await readFile(`public/payloads/${element.slug}.json`, 'utf8'));
    assert.ok(StudioProtocolInternals.parseStudioElementPayload(published));
    assert.equal(await readFile(`public/source/${element.slug}.tsx`, 'utf8'), sourceCode);
    assert.equal((sourceCode.match(/^export /gm) ?? []).length, 1);
    assert.ok(sourceCode.includes(`export function ${element.exportName}(`));
    assert.doesNotMatch(sourceCode, /from ['"]\.|fetch\(|https:\/\/.*\.(?:png|jpg|mp4|woff)/);
  });
}
