// Write the generated contracts to spec/: the token manifest and the inputs schema.
// Usage: npm run spec
import { mkdir, writeFile } from 'node:fs/promises';
import { specFiles } from '../src/manifest.js';

for (const [file, text] of Object.entries(specFiles())) {
  const url = new URL(`../${file}`, import.meta.url);
  await mkdir(new URL('.', url), { recursive: true });
  await writeFile(url, text);
  console.log(`Wrote ${file}`);
}
