// Write the files of each example in examples/, from its inputs.json. Usage: npm run examples
// A test fails when the files and the code differ.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { exampleFiles } from './example-files.js';

const root = new URL('../examples/', import.meta.url);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = new URL(`${entry.name}/`, root);
  const inputs = JSON.parse(await readFile(new URL('inputs.json', dir), 'utf8'));
  const pageCss = await readFile(new URL('page.css', dir), 'utf8');
  for (const [file, text] of Object.entries(exampleFiles(inputs, pageCss))) {
    await writeFile(new URL(file, dir), text);
    console.log(`Wrote examples/${entry.name}/${file}`);
  }
}
