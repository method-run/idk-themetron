import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { buildThemes, toCss, toDtcg, normalizeInputs, contrastTest, PRESETS } from '../src/index.js';
import { specFiles, releaseFiles, tokenManifest, inputsSchema, checkCss, PAIRS, CONTRACT_VERSION, SPEC_URL, specUrl, INPUTS_SCHEMA_URL, MANIFEST_URL, breakingPart, stableBaseline, stableTokenChanges } from '../src/manifest.js';

test('the files in spec/ match the code. Run npm run spec after a change.', async () => {
  for (const [file, text] of Object.entries(specFiles())) {
    assert.equal(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'), text, `${file} is out of date. Run npm run spec.`);
  }
});

const stableFixture = async () => JSON.parse(await readFile(new URL('fixtures/stable-tokens.json', import.meta.url), 'utf8'));

test('no stable token goes away unless the contract version takes a breaking bump', async () => {
  const baseline = await stableFixture();
  const { removed, bumped } = stableTokenChanges(baseline);
  assert.ok(bumped || !removed.length, `These stable tokens went away since contract ${baseline.contract}: ${removed.join(', ')}. That is a breaking change. Bump CONTRACT_VERSION in src/manifest.js past ${breakingPart(CONTRACT_VERSION)}, list the change under Unreleased in spec/consumers.md, and run npm run spec to refresh test/fixtures/stable-tokens.json.`);
});

test('the stable-token baseline is current. Run npm run spec after a change.', async () => {
  assert.deepEqual(await stableFixture(), stableBaseline(), 'test/fixtures/stable-tokens.json is out of date. Run npm run spec.');
});

test('the breaking part of a version is the first part that is not 0', () => {
  assert.equal(breakingPart('0.6.0'), '0.6');
  assert.equal(breakingPart('0.6.3'), '0.6');
  assert.equal(breakingPart('1.4.2'), '1');
  assert.equal(breakingPart('0.0.3'), '0.0.3');
  const removed = (contract) => stableTokenChanges({ contract, tokens: [...stableBaseline().tokens, 'gone'] });
  assert.deepEqual(removed(CONTRACT_VERSION), { removed: ['gone'], bumped: false });
  assert.deepEqual(removed('0.0.1'), { removed: ['gone'], bumped: true });
});

test('the manifest lists every token that the CSS defines, and nothing else', () => {
  const { tokens } = tokenManifest();
  const trees = [
    {},
    ...Object.keys(PRESETS).map((preset) => ({ themes: { default: { preset } } })),
    { themes: { danger: { parent: 'default', color: '#d6336c' }, airy: { parent: 'default', feel: { spaciousness: 1 } } } },
  ];
  for (const tree of trees) {
    const css = toCss(buildThemes(tree));
    const defined = new Set([...css.matchAll(/--tm-([a-z0-9-]+):/g)].map((m) => m[1]));
    assert.deepEqual([...defined].filter((n) => !tokens[n]), [], JSON.stringify(tree));
    assert.deepEqual(Object.keys(tokens).filter((n) => !defined.has(n)), [], JSON.stringify(tree));
  }
});

test('every semantic color has a role, and its name ends with it or is a background', () => {
  const { tokens } = tokenManifest();
  for (const [name, t] of Object.entries(tokens)) {
    if (t.tier === 'semantic' && t.type === 'color') assert.ok(t.role, name);
    if (t.role === 'action') assert.match(name, /(^|-)action(-|$)|^border-focus$/);
  }
});

test('every stable semantic color holds both modes, and has a meaning', () => {
  const { tokens } = tokenManifest();
  for (const [name, t] of Object.entries(tokens)) {
    if (t.tier === 'semantic' && t.type === 'color' && t.stability === 'stable') {
      assert.ok(t.modes, name);
      assert.ok(t.meaning, name);
    }
  }
});

test('the pairs in the manifest pass, in every preset, mode, and contrast setting, and in the more-contrast variant', () => {
  const colors = ['#2456e8', '#f2d600', '#d6336c', '#0f9d8a'];
  for (const preset of Object.keys(PRESETS)) {
    for (const contrast of [{ method: 'wcag' }, { method: 'apca' }]) {
      for (const color of colors) {
        {
          const theme = buildThemes({ themes: { default: { color, preset, contrast } } }).themes.default;
          // The theme at its own level, and its more-contrast variant at the enhanced level.
          for (const level of [theme, theme.more].filter(Boolean)) {
            const test = contrastTest(level.settings.contrast);
            for (const mode of ['light', 'dark']) {
              const { tokens } = level.modes[mode];
              const hex = (name) => tokens[Object.keys(tokens).find((k) => k.replace(/\./g, '-') === name)].value;
              for (const { fg, bg, purpose } of PAIRS) {
                for (const f of fg) for (const b of bg) assert.ok(test(hex(f), hex(b), purpose), `${f} on ${b}, ${purpose}: ${color} ${preset} ${level.settings.contrast.method} ${level.settings.contrast.level} ${mode}`);
              }
            }
          }
        }
      }
    }
  }
});

test('the components read no token outside the contract', async () => {
  const css = await readFile(new URL('../components/components.css', import.meta.url), 'utf8');
  assert.deepEqual(checkCss(css).unknown, []);
});

test('check skips token definitions, and finds unknown and experimental reads', () => {
  const css = ':root { --tm-bg-canvas: var(--tm-base-5); } a { color: var(--tm-fg-base); background: var(--tm-nope, red); box-shadow: var(--tm-highlight-action); }';
  assert.deepEqual(checkCss(css), { unknown: ['nope'], experimental: ['highlight-action'], stable: ['fg-base'] });
});

test('the published URLs name the generated files, and the schema has its URL as $id', () => {
  const names = Object.keys(specFiles()).map((file) => file.replace('spec/', ''));
  assert.deepEqual([INPUTS_SCHEMA_URL, MANIFEST_URL].map((url) => url.replace(SPEC_URL, '')).sort(), names.sort());
  assert.equal(inputsSchema().$id, INPUTS_SCHEMA_URL);
});

test('each released version in spec/versions has both files, and each schema has its own URL as $id', async () => {
  const dir = new URL('../spec/versions/', import.meta.url);
  const versions = existsSync(dir) ? await readdir(dir) : [];
  const notNewer = (a, b) => a.localeCompare(b, 'en', { numeric: true }) <= 0;
  for (const version of versions) {
    assert.match(version, /^\d+\.\d+\.\d+$/);
    assert.ok(notNewer(version, CONTRACT_VERSION), `${version} is newer than the contract`);
    assert.deepEqual((await readdir(new URL(`${version}/`, dir))).sort(), ['inputs.schema.json', 'tokens.manifest.json']);
    const schema = JSON.parse(await readFile(new URL(`${version}/inputs.schema.json`, dir), 'utf8'));
    assert.equal(schema.$id, specUrl('inputs.schema.json', version));
    const manifest = JSON.parse(await readFile(new URL(`${version}/tokens.manifest.json`, dir), 'utf8'));
    assert.equal(manifest.contract, version);
  }
});

test('a release copy names its version in the path and in the schema $id', () => {
  const files = releaseFiles();
  assert.deepEqual(Object.keys(files).sort(), [`spec/versions/${CONTRACT_VERSION}/inputs.schema.json`, `spec/versions/${CONTRACT_VERSION}/tokens.manifest.json`]);
  assert.equal(JSON.parse(files[`spec/versions/${CONTRACT_VERSION}/inputs.schema.json`]).$id, specUrl('inputs.schema.json', CONTRACT_VERSION));
});

// A small JSON Schema validator: the keywords that inputs.schema.json uses, and no more.
function validate(schema, value, root = schema) {
  if (schema.$ref) return validate(root.$defs[schema.$ref.replace('#/$defs/', '')], value, root);
  if (schema.anyOf && !schema.anyOf.some((s) => validate(s, value, root))) return false;
  if ('const' in schema && value !== schema.const) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type) {
    const types = [schema.type].flat();
    const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    if (!types.includes(kind)) return false;
  }
  if (typeof value === 'number' && ((schema.minimum ?? -Infinity) > value || (schema.maximum ?? Infinity) < value)) return false;
  if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern).test(value)) return false;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (schema.propertyNames && !validate(schema.propertyNames, k, root)) return false;
      const sub = schema.properties?.[k] ?? (schema.additionalProperties === false ? null : schema.additionalProperties);
      if (sub === null) return false;
      if (sub && !validate(sub, v, root)) return false;
    }
  }
  return true;
}

const accepts = (raw) => { try { normalizeInputs(raw); return true; } catch { return false; } };

test('the inputs schema agrees with the engine', () => {
  const schema = inputsSchema();
  const cases = [
    {},
    { version: 1, $schema: './inputs.schema.json', themes: {} },
    { version: 2, themes: {} },
    { version: 3, themes: {} },
    { theme: {} },
    { themes: { default: { color: '#2456e8', base: { color: '#6b7280' }, fillLabel: 'dark' } } },
    { themes: { default: { base: '#6b7280', action: '#2456e8' } } },
    { themes: { default: { action: 'blue' } } },
    { themes: { default: { neutral: '#6b7280' } } },
    { themes: { default: { color: 'blue' } } },
    { themes: { default: { base: '#abc', font: 'Figtree', headingFont: { family: 'Fraunces', fallback: 'serif' }, monoFont: { family: null } } } },
    { themes: { default: { preset: 'glass', feel: { roundness: 'pill', depth: 0.4 } } } },
    { themes: { default: { preset: 'nope' } } },
    { themes: { default: { feel: { roundness: 2 } } } },
    { themes: { default: { feel: { roundness: 'very' } } } },
    { themes: { default: { feel: { wobble: 1 } } } },
    { themes: { default: { contrast: { method: 'apca', level: 'enhanced', model: 'hsl' } } } },
    { themes: { default: { contrast: { method: 'both' } } } },
    { themes: { default: { fillLabel: 'auto' } } },
    { themes: { default: { tint: '#fff' } } },
    { themes: { default: { font: { family: 'Inter', weight: 400 } } } },
    { themes: { danger: { parent: 'default', color: '#d6336c', feel: { spaciousness: 'inherit' } } } },
    { themes: { Danger: { parent: 'default' } } },
    { themes: { danger: { parent: 'default', label: 'Danger zone' } } },
    { themes: { danger: { parent: 'default', label: ' ' } } },
    { themes: { danger: { parent: 'default', label: 3 } } },
    { themes: { 'two--dashes': { parent: 'default' } } },
  ];
  for (const raw of cases) assert.equal(validate(schema, raw), accepts(raw), JSON.stringify(raw));
});

test('every theme ships the standard level, and the enhanced level as its more-contrast variant', () => {
  const tree = { themes: { danger: { parent: 'default', color: '#d6336c' }, brand: { parent: 'default', action: '#8a4fff' } } };
  const built = buildThemes(tree);
  assert.equal(built.themes.default.more.settings.contrast.level, 'enhanced');
  assert.equal(built.themes.default.more.gaps.text, 65);
  const css = toCss(built);
  for (const head of ['@media (prefers-contrast: more)', '@scope ([data-tm-contrast="more"])', '@scope ([data-tm-contrast="base"])']) assert.ok(css.includes(`${head} {`), head);
  // Semantic tokens point at grades with var(), and each element reads its own ramp. So the
  // themes share their more-contrast rules, and the scoping root matches each of them.
  assert.match(css, /:scope:is\(:root, \.theme-default, \.theme-danger, \.theme-brand\), :root, \.theme-default, \.theme-danger, \.theme-brand \{\n/);
  assert.match(css.slice(css.indexOf("@media (prefers-contrast")), /--tm-fg-base-muted: light-dark\(var\(--tm-base-/);
  assert.doesNotMatch(toCss(built, { more: false }), /prefers-contrast/);
  // A level in old inputs is skipped: the theme still has both.
  const old = buildThemes({ themes: { default: { contrast: { level: 'enhanced' } } } });
  assert.equal(old.themes.default.settings.contrast.level, 'standard');
  assert.equal(old.themes.default.more.settings.contrast.level, 'enhanced');
  const dtcg = toDtcg(built);
  assert.equal(dtcg.themes.default.moreContrast.gap.text.$value, 65);
  assert.ok(dtcg.themes.default.moreContrast.mode.dark.fg['base-muted']);
});

test('the files in examples/ match the code. Run npm run examples after a change.', async () => {
  const { exampleFiles } = await import('../scripts/example-files.js');
  const dir = new URL('../examples/basic/', import.meta.url);
  const inputs = JSON.parse(await readFile(new URL('inputs.json', dir), 'utf8'));
  const pageCss = await readFile(new URL('page.css', dir), 'utf8');
  for (const [file, text] of Object.entries(exampleFiles(inputs, pageCss))) {
    assert.equal(await readFile(new URL(file, dir), 'utf8'), text, `examples/basic/${file} is out of date. Run npm run examples.`);
  }
  // The page reads only contract tokens, and gives each experimental token a fallback.
  assert.deepEqual(checkCss(pageCss).unknown, []);
  for (const name of checkCss(pageCss).experimental) assert.match(pageCss, new RegExp(`var\\(--tm-${name}, `), name);
});
