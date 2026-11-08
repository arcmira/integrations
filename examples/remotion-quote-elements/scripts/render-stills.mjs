import {mkdir} from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {getCompositions, renderStill} from '@remotion/renderer';

await mkdir('out', {recursive: true});
const serveUrl = await bundle({entryPoint: 'remotion/index.tsx'});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
const compositions = await getCompositions(serveUrl, {browserExecutable});
for (const composition of compositions) {
  await renderStill({serveUrl, composition, frame: 30, output: `out/${composition.id}.png`, browserExecutable});
}
