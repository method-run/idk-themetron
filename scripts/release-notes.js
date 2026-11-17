// Print the notes of one version from CHANGELOG.md: the lines under its "## <version>" heading,
// up to the next heading. For the GitHub release of that version.
// Usage: npm run -s release:notes [version]. Without a version, the one in package.json.
// It stops when the changelog has no section for the version: move the Unreleased notes first.
// Links in the changelog are relative, such as ./spec/inputs.md, and a GitHub release cannot
// follow those, so they become links to the files on main.
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const version = process.argv[2] ?? JSON.parse(await readFile(new URL('package.json', root), 'utf8')).version;
const lines = (await readFile(new URL('CHANGELOG.md', root), 'utf8')).split('\n');
const start = lines.indexOf(`## ${version}`);
if (start < 0) {
  console.error(`CHANGELOG.md has no "## ${version}" section. Move the Unreleased notes under it first.`);
  process.exit(1);
}
const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
const REPO = 'https://github.com/method-run/idk-themetron/blob/main/';
const notes = lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
console.log(notes.replace(/\]\(\.\//g, `](${REPO}`));
