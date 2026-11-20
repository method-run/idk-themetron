import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import * as api from '../src/index.js';

const root = new URL('../', import.meta.url);
const read = (file) => readFile(new URL(file, root), 'utf8');

test('index.d.ts declares every export of index.js', async () => {
  const dts = await read('src/index.d.ts');
  const declared = new Set([...dts.matchAll(/^export (?:const|function|class) (\w+)/gm)].map((m) => m[1]));
  assert.deepEqual(Object.keys(api).filter((name) => !declared.has(name)), []);
  assert.deepEqual([...declared].filter((name) => !(name in api)), [], 'index.d.ts declares a name that index.js does not export.');
});

test('the package holds the engine, its types, the components, the spec, the CLI, and the changelog, and nothing else', async () => {
  const [{ files }] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  const paths = files.map((f) => f.path);
  for (const file of ['package.json', 'README.md', 'CHANGELOG.md', 'LICENSE', 'src/index.js', 'src/index.d.ts', 'bin/themetron.js', 'components/components.css', 'components/looks.css', 'components/_looks.scss', 'components/looks.tailwind.css', 'spec/tokens.manifest.json', 'spec/inputs.schema.json']) {
    assert.ok(paths.includes(file), `${file} is not in the package.`);
  }
  const allowed = /^(package\.json|README\.md|CHANGELOG\.md|LICENSE|src\/[^/]+|bin\/[^/]+|components\/(components\.css|looks\.css|_looks\.scss|looks\.tailwind\.css)|spec\/[^/]+)$/;
  assert.deepEqual(paths.filter((p) => !allowed.test(p)), []);

  // Every path that package.json points at is in the package.
  const pkg = JSON.parse(await read('package.json'));
  const targets = [pkg.types, ...Object.values(pkg.bin), ...Object.values(pkg.exports).flatMap((t) => (typeof t === 'string' ? [t] : Object.values(t)))];
  for (const target of targets.filter((t) => !t.includes('*'))) assert.ok(paths.includes(target.replace(/^\.\//, '')), `${target} is not in the package.`);
});
