// Write the generated contracts to spec/: the token manifest and the inputs schema.
// Usage: npm run spec
import { writeFile } from 'node:fs/promises';
import { specFiles } from '../src/manifest.js';

for (const [file, text] of Object.entries(specFiles())) {
  await writeFile(new URL(`../${file}`, import.meta.url), text);
  console.log(`Wrote ${file}`);
}
