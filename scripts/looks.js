// Write the Sass and Tailwind forms of the looks, from components/looks.css.
// Usage: npm run looks
import { readFile, writeFile } from 'node:fs/promises';
import { lookFiles } from '../src/looks.js';

const css = await readFile(new URL('../components/looks.css', import.meta.url), 'utf8');
for (const [file, text] of Object.entries(lookFiles(css))) {
  await writeFile(new URL(`../${file}`, import.meta.url), text);
  console.log(`Wrote ${file}`);
}
