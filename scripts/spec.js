// Write the generated contracts to spec/: the token manifest and the inputs schema. Then
// refresh the baseline of stable tokens in test/fixtures/, unless a stable token went away
// and the contract version did not take a breaking bump.
// Usage: npm run spec
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { specFiles, stableBaseline, stableTokenChanges, breakingPart, CONTRACT_VERSION } from '../src/manifest.js';

for (const [file, text] of Object.entries(specFiles())) {
  const url = new URL(`../${file}`, import.meta.url);
  await mkdir(new URL('.', url), { recursive: true });
  await writeFile(url, text);
  console.log(`Wrote ${file}`);
}

const BASELINE = 'test/fixtures/stable-tokens.json';
const baselineUrl = new URL(`../${BASELINE}`, import.meta.url);
const old = await readFile(baselineUrl, 'utf8').then(JSON.parse, () => null);
const { removed, bumped } = old ? stableTokenChanges(old) : { removed: [], bumped: true };
if (removed.length && !bumped) {
  console.error(`Did not write ${BASELINE}. These stable tokens went away: ${removed.join(', ')}.`);
  console.error(`Bump CONTRACT_VERSION in src/manifest.js past ${breakingPart(CONTRACT_VERSION)} (a breaking change), list the change under Unreleased in spec/consumers.md, and run npm run spec again.`);
  process.exitCode = 1;
} else {
  await writeFile(baselineUrl, `${JSON.stringify(stableBaseline(), null, 2)}\n`);
  console.log(`Wrote ${BASELINE}`);
}
