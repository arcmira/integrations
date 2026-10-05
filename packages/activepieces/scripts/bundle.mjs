import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const output = path.join(root, 'bundle');
await mkdir(output, { recursive: true });
const result = await build({ entryPoints: ['src/index.ts'], bundle: true, platform: 'node', target: 'node20', format: 'cjs', outfile: 'bundle/index.js', metafile: true, legalComments: 'eof' });
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const { scripts, devDependencies, dependencies, types, private: isPrivate, ...published } = manifest;
await writeFile('bundle/package.json', JSON.stringify({ ...published, main: 'index.js', files: ['index.js', 'LICENSE', 'README.md', 'THIRD_PARTY_LICENSES.txt'], dependencies: {} }, null, 2) + '\n');
for (const file of ['LICENSE', 'README.md']) await copyFile(file, path.join(output, file));
const packages = new Set(Object.keys(result.metafile.inputs).filter(file => file.includes('node_modules/')).map(file => {
 const relative = file.slice(file.lastIndexOf('node_modules/') + 13).split('/');
 return relative[0].startsWith('@') ? relative.slice(0, 2).join('/') : relative[0];
}));
const notices = [];
for (const name of [...packages].sort()) {
 const directory = path.join('node_modules', name);
 const metadata = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
 let license;
 for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'License.txt', 'license.md', 'LICENSE-MIT']) {
  try { license = await readFile(path.join(directory, filename), 'utf8'); break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
 }
 if (!license && ['@activepieces/pieces-framework', '@activepieces/shared'].includes(name)) license = await readFile('licenses/activepieces-f094366e-LICENSE.txt', 'utf8');
 if (!license) throw new Error(`Missing license text for bundled dependency ${name}`);
 notices.push(`${name}@${metadata.version}\n${license}`);
}
await writeFile('bundle/THIRD_PARTY_LICENSES.txt', notices.join('\n\n--------------------\n\n'));
await writeFile('bundle-evidence.json', JSON.stringify({ dependencies: [...packages].sort(), outputs: result.metafile.outputs }, null, 2) + '\n');
console.log(`Bundled ${packages.size} dependencies with their license notices.`);
