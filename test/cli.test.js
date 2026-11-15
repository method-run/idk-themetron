import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const bin = fileURLToPath(new URL('../bin/themetron.js', import.meta.url));
const example = fileURLToPath(new URL('../examples/basic/', import.meta.url));

// Runs the CLI, and returns { code, stdout, stderr } also when it exits with an error.
async function run(...args) {
  try {
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [bin, ...args]);
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
}

test('build writes each format the same as the committed example files', async () => {
  const inputs = join(example, 'inputs.json');
  for (const [format, file] of [['css', 'tokens.css'], ['dtcg', 'tokens.dtcg.json'], ['tailwind', 'tailwind.css'], ['shadcn', 'shadcn.css'], ['bootstrap', '_bootstrap.scss']]) {
    const { code, stdout } = await run('build', inputs, '--format', format);
    assert.equal(code, 0, format);
    assert.equal(stdout, await readFile(join(example, file), 'utf8'), format);
  }
  assert.equal((await run('build', inputs)).stdout, await readFile(join(example, 'tokens.css'), 'utf8'), 'css is the default');
});

test('build --format stylesheet adds the components after the tokens', async () => {
  const { code, stdout } = await run('build', join(example, 'inputs.json'), '--format', 'stylesheet');
  assert.equal(code, 0);
  const components = await readFile(new URL('../components/components.css', import.meta.url), 'utf8');
  assert.ok(stdout.startsWith(await readFile(join(example, 'tokens.css'), 'utf8')));
  assert.ok(stdout.endsWith(components));
});

test('build --out writes a file, and nothing to stdout', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'themetron-'));
  try {
    const out = join(dir, 'tokens.css');
    const { code, stdout } = await run('build', join(example, 'inputs.json'), '--out', out);
    assert.equal(code, 0);
    assert.equal(stdout, '');
    assert.equal(await readFile(out, 'utf8'), await readFile(join(example, 'tokens.css'), 'utf8'));
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('build prints the engine\'s messages for bad inputs, and exits 1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'themetron-'));
  try {
    const file = join(dir, 'inputs.json');
    await writeFile(file, JSON.stringify({ colours: {}, themes: { default: { color: 'not a color' } } }));
    const { code, stdout, stderr } = await run('build', file);
    assert.equal(code, 1);
    assert.equal(stdout, '');
    assert.match(stderr, /colours: unknown field/);
    assert.match(stderr, /default\.color/);
    assert.doesNotMatch(stderr, /at .*\.js/, 'no stack trace');
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('build exits 1 for a missing file, bad JSON, or an unknown format', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'themetron-'));
  try {
    const bad = join(dir, 'bad.json');
    await writeFile(bad, '{ themes');
    for (const [args, message] of [
      [[join(dir, 'missing.json')], /no such file/],
      [[bad], /bad\.json: .*JSON/],
      [[join(example, 'inputs.json'), '--format', 'scss'], /--format: use one of css, stylesheet, dtcg, tailwind, shadcn, bootstrap/],
      [[], /build needs one inputs file/],
      [[join(example, 'inputs.json'), '--nope'], /--nope: unknown flag/],
      [[join(example, 'inputs.json'), '--out'], /--out needs a value/],
      [[join(example, 'inputs.json'), '--unknown-flags', 'warn'], /--unknown-flags: unknown flag/],
    ]) {
      const { code, stderr } = await run('build', ...args);
      assert.equal(code, 1, args.join(' '));
      assert.match(stderr, message, args.join(' '));
    }
  } finally {
    await rm(dir, { recursive: true });
  }
});

test('build passes the CSS flags to the export', async () => {
  const inputs = join(example, 'inputs.json');
  const { buildThemes, toCss, toTailwind, toShadcn } = await import('../src/index.js');
  const built = buildThemes(JSON.parse(await readFile(inputs, 'utf8')));
  const css = await run('build', inputs, '--prefix', 'x', '--class-prefix', 't-', '--no-root', '--no-more');
  assert.equal(css.stdout, toCss(built, { prefix: 'x', classPrefix: 't-', root: false, more: false }));
  assert.equal((await run('build', inputs, '-f', 'tailwind', '--prefix', 'x')).stdout, toTailwind(built, { prefix: 'x' }));
  assert.equal((await run('build', inputs, '-f', 'shadcn', '--class-prefix', 't-')).stdout, toShadcn(built, { classPrefix: 't-' }));
  const sheet = await run('build', inputs, '-f', 'stylesheet', '--no-more');
  assert.ok(sheet.stdout.startsWith(toCss(built, { more: false })));
});

test('a CSS flag that the format does not use gets a warning, and the build goes on', async () => {
  const inputs = join(example, 'inputs.json');
  const plain = await run('build', inputs, '-f', 'dtcg');
  const warned = await run('build', inputs, '-f', 'dtcg', '--prefix', 'x', '--no-more');
  assert.equal(warned.code, 0);
  assert.equal(warned.stdout, plain.stdout);
  assert.match(warned.stderr, /Warning: skipped --prefix: it does nothing with --format dtcg/);
  assert.match(warned.stderr, /Warning: skipped --no-more: it does nothing with --format dtcg/);
  assert.equal((await run('check', join(example, 'page.css'), '--nope')).code, 1, 'check stops at an unknown flag too');
});

test('--help prints the usage of both commands', async () => {
  for (const args of [['--help'], ['build', '--help'], []]) {
    const { code, stdout } = await run(...args);
    assert.equal(code, 0);
    assert.match(stdout, /themetron build <inputs\.json>/);
    assert.match(stdout, /themetron check <file\.css>/);
  }
  assert.equal((await run('make')).code, 1);
});

test('check still lists the tokens that a stylesheet reads', async () => {
  const { code, stdout } = await run('check', join(example, 'page.css'));
  assert.equal(code, 0);
  assert.match(stdout, /page\.css: \d+ stable, \d+ experimental, 0 unknown tokens/);
});
