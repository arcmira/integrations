import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createElementPayload} from '@remotion/studio-protocol';
import {elements, libraryUrl, sample} from '../src/catalog.ts';
import {libraryDescription} from '../src/copy.ts';

await mkdir('public/source', {recursive: true});
await mkdir('public/payloads', {recursive: true});
const index = ['# Arcmira Quotes', '', libraryDescription, '', `Library: ${libraryUrl}`, '', 'Each component is self-contained. React and Remotion are required in the receiving project.', '', '## Inputs', '', 'quote (required): The passage text, trimmed to one or two sentences.', 'channel (required): The channel or show name.', 'watchUrl (required): The watch link at the second the passage starts.', "speaker: The speaker's name.", 'publishedAt: Publication date in YYYY-MM-DD format.', 'startSeconds: Non-negative source timestamp in seconds.', ''];
for (const element of elements) {
  const sourceCode = await readFile(`elements/${element.slug}.tsx`, 'utf8');
  const payload = createElementPayload({displayName: element.name, slug: element.slug, sourceCode, dependencies: [],
    dimensions: {width: element.width, height: element.height}, durationInFrames: element.durationInFrames,
    initialProps: sample, installationMode: 'wrapped'});
  await writeFile(`public/source/${element.slug}.tsx`, sourceCode);
  await writeFile(`public/payloads/${element.slug}.json`, `${JSON.stringify(payload, null, 2)}\n`);
  index.push(`## ${element.exportName}`, '', `Preview: ${libraryUrl}${element.slug}/`, `Source: ${libraryUrl}source/${element.slug}.tsx`, `Studio payload: ${libraryUrl}payloads/${element.slug}.json`, `Dimensions: ${element.width} × ${element.height}. Duration: ${element.durationInFrames} frames at ${element.fps} fps.`, '');
}
await writeFile('public/llms-components.txt', `${index.join('\n')}\n`);
