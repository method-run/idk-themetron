import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildThemes, toCss, toDtcg, toTailwind, toShadcn, toBootstrapSass, toDaisyui, toBootstrapCss, CONTRACT_VERSION, specUrl } from '../src/index.js';

const built = buildThemes({});
const manifest = specUrl('tokens.manifest.json', CONTRACT_VERSION);
const TEXT_EXPORTS = { toCss, toTailwind, toShadcn, toBootstrapSass, toDaisyui, toBootstrapCss };

test('every text export starts by naming the token contract that made it', () => {
  for (const [name, make] of Object.entries(TEXT_EXPORTS)) {
    const first = make(built).split('\n')[0];
    assert.ok(first.includes(`token contract ${CONTRACT_VERSION}: ${manifest}`), `${name}: ${first}`);
  }
  const ext = toDtcg(built).$extensions.themetron;
  assert.equal(ext.contract, CONTRACT_VERSION);
  assert.equal(ext.manifest, manifest);
  assert.equal(ext.set, undefined);
});

test('the theme set name goes in as a name for code, so it cannot end the comment', () => {
  for (const [name, make] of Object.entries(TEXT_EXPORTS)) {
    const first = make(built, { set: 'Admin app */ body { color: red }' }).split('\n')[0];
    assert.ok(first.includes('Made by themetron for admin-app-body-color-red,'), `${name}: ${first}`);
  }
  assert.equal(toDtcg(built, { set: 'Admin app' }).$extensions.themetron.set, 'admin-app');
  // The daisyUI theme takes the set's name, unless it has a name of its own.
  assert.match(toDaisyui(built, { set: 'Admin app' }), /name: "admin-app"/);
  assert.match(toDaisyui(built, { set: 'Admin app', name: 'brand' }), /name: "brand"/);
});

test('icons: false leaves out the icon font import, and keeps the icon tokens', () => {
  const css = toCss(built, { icons: false });
  assert.ok(!css.includes('Material+Symbols'));
  assert.match(css, /--tm-font-icon:/);
  assert.ok(toCss(built).includes('Material+Symbols'));
});

test('build takes --set and --no-icons', () => {
  const dir = mkdtempSync(join(tmpdir(), 'themetron-'));
  const file = join(dir, 'inputs.json');
  writeFileSync(file, JSON.stringify({ themes: { default: {} } }));
  const run = (...args) => execFileSync('node', ['bin/themetron.js', 'build', file, ...args], { cwd: new URL('../', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const css = run('--set', 'Admin app', '--no-icons');
  assert.ok(css.startsWith(`/* Made by themetron for admin-app, token contract ${CONTRACT_VERSION}`));
  assert.ok(!css.includes('Material+Symbols'));
  assert.match(run('--format', 'dtcg', '--set', 'Admin app'), /"set": "admin-app"/);
});
