// Build the docs and the playground into one static site.
// The docs come from idk-plans. Vite builds the playground into play/. Then this adds links between the two.
// Usage: node scripts/build-site.js [out]   (default: _site)
// SOURCE_URL, if set, is the base URL for links to files in the repository, such as the URL of
// one commit's files on GitHub. CI sets it, so code links on the site match the commit it shows.
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { specFiles, SPEC_URL } from '../src/manifest.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.argv[2] ?? '_site');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });

run('npx', ['idk-plans', 'site', '--out', OUT, ...(process.env.SOURCE_URL ? ['--source-url', process.env.SOURCE_URL] : [])]);
run('npx', ['vite', 'build', '--outDir', path.join(OUT, 'play')]);

// Each docs page gets a "Playground" link in its top bar. The Playground page also gets a button.
async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'play' && entry.name !== 'assets') yield* htmlFiles(file);
    else if (entry.name.endsWith('.html')) yield file;
  }
}
for await (const file of htmlFiles(OUT)) {
  const prefix = path.relative(path.dirname(file), OUT).split(path.sep).filter(Boolean).map(() => '../').join('');
  let html = await readFile(file, 'utf8');
  html = html.replace('<nav class="top-links">', `<nav class="top-links"><a href="${prefix}play/">Playground</a>`);
  if (path.relative(OUT, file) === path.join('playground', 'index.html')) {
    html = html.replace(/(<h1>[^<]*<\/h1>)/, `$1<p><a href="${prefix}play/"><strong>Open the playground →</strong></a></p>`);
  }
  await writeFile(file, html);
}

// The playground gets a link back to the docs.
const play = path.join(OUT, 'play', 'index.html');
await writeFile(play, (await readFile(play, 'utf8')).replace('<span>playground</span>', '<span>playground · <a href="../">docs</a></span>'));

// The generated contracts go in schema/, at the URLs in SPEC_URL, so $schema links work in editors.
const schemaDir = path.join(OUT, new URL(SPEC_URL).pathname.split('/').filter(Boolean).slice(1).join('/'));
await mkdir(schemaDir, { recursive: true });
for (const [file, text] of Object.entries(specFiles())) await writeFile(path.join(schemaDir, path.basename(file)), text);

console.log(`Built the site in ${path.relative(ROOT, OUT)}/. Open play/ for the playground.`);
