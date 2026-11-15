// Copy the contracts of the current version to spec/versions/<contract version>/, for a release.
// The site publishes each copy at schema/<version>/. A released copy never changes: if the
// contract changed since its version was released, this stops, and asks for a new version.
// Usage: npm run spec:release. `npm version` runs it, and adds the copy to the version commit.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { releaseFiles, CONTRACT_VERSION } from '../src/manifest.js';

const files = Object.entries(releaseFiles());
const changed = [];
for (const [file] of files) {
  const url = new URL(`../${file}`, import.meta.url);
  if (existsSync(url) && (await readFile(url, 'utf8')) !== releaseFiles()[file]) changed.push(file);
}
if (changed.length) {
  console.error(`The contract changed since ${CONTRACT_VERSION} was released: ${changed.join(', ')}. Raise CONTRACT_VERSION in src/manifest.js, list the changes in the changelog, and run this again.`);
  process.exit(1);
}
for (const [file, text] of files) {
  const url = new URL(`../${file}`, import.meta.url);
  if (existsSync(url)) continue;
  await mkdir(new URL('.', url), { recursive: true });
  await writeFile(url, text);
  console.log(`Wrote ${file}`);
}
