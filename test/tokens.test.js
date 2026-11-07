import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRESETS, buildThemes, toCss, toDtcg, toShadcn, toTailwind, tokenManifest } from '../src/index.js';

// A root color and a child color theme. Hard cases: yellow, near white, near black, neon.
const TRICKY = [
  ['#2456e8', '#ff6b4a'],
  ['#ffd43b', '#3ddc97'],
  ['#f1f3f5', '#111111'],
  ['#00e5ff', '#ff00ff'],
];
const tree = ([main, other], root = {}) => ({ themes: { default: { color: main, ...root }, other: { parent: 'default', color: other } } });
// Required pairs that fail, at the standard level and in the more-contrast variant.
const failures = (built) => built.order.flatMap((n) => [built.themes[n], built.themes[n].more].flatMap((level) => ['light', 'dark'].flatMap((m) => level.modes[m].audit.filter((a) => a.required && !a.pass).map((a) => `${n} ${level.settings.contrast.level} ${m} ${a.fg} on ${a.bg}`))));

test('every required pair passes WCAG, for every preset and tricky colors', () => {
  for (const colors of TRICKY) {
    for (const preset of Object.keys(PRESETS)) {
      assert.deepEqual(failures(buildThemes(tree(colors, { preset, contrast: { method: 'wcag' } }))), [], `${colors} ${preset}`);
    }
  }
});

test('every required pair passes in the HSL color model too', () => {
  for (const colors of TRICKY) {
    for (const model of ['hsl']) {
      for (const method of ['wcag', 'apca']) {
        assert.deepEqual(failures(buildThemes(tree(colors, { preset: 'balanced', contrast: { method, model } }))), [], `${colors} ${model} ${method}`);
      }
    }
  }
});

test('APCA keeps the WCAG 2 minimums as a floor', () => {
  const built = buildThemes(tree(['#2456e8', '#d6336c'], { contrast: { method: 'apca' } }));
  for (const n of built.order) for (const m of ['light', 'dark']) {
    for (const a of built.themes[n].modes[m].audit.filter((x) => x.required)) assert.ok(a.wcag >= 3, `${n} ${m} ${a.fg} on ${a.bg}: ${a.wcag}`);
  }
});

test('every required pair passes APCA, at both levels', () => {
  for (const colors of TRICKY) {
    for (const preset of Object.keys(PRESETS)) {
      assert.deepEqual(failures(buildThemes(tree(colors, { preset, contrast: { method: 'apca' } }))), [], `${colors} ${preset}`);
    }
  }
});

test('the components use only tokens that the CSS defines', async () => {
  const css = toCss(buildThemes({}));
  const defined = new Set([...css.matchAll(/--(tm-[a-z0-9-]+):/g)].map((m) => m[1]));
  const components = await readFile(new URL('../components/components.css', import.meta.url), 'utf8');
  const used = new Set([...components.matchAll(/var\(--(tm-[a-z0-9-]+)/g)].map((m) => m[1]));
  const missing = [...used].filter((name) => !defined.has(name));
  assert.deepEqual(missing, []);
});

test('every theme class sets every token once, and themes with the same values share a rule', () => {
  const built = buildThemes({ themes: { danger: { parent: 'default', color: '#d6336c' }, brand: { parent: 'default', action: '#8a4fff' }, airy: { parent: 'default', feel: { spaciousness: 1 } } } });
  const css = toCss(built);
  const { tokens } = tokenManifest();
  // The rules before the more-contrast blocks, as [selectors, body].
  const rules = [...css.split('/* More contrast')[0].matchAll(/^([:.][^{]*) \{\n([^}]*)\}/gm)].map((m) => [m[1].split(', '), m[2]]);
  const names = (body) => [...body.matchAll(/--tm-([a-z0-9-]+):/g)].map((m) => m[1]);
  for (const name of built.order) {
    const set = rules.filter(([sels]) => sels.includes(`.theme-${name}`)).flatMap(([, body]) => names(body));
    assert.deepEqual(set.sort(), Object.keys(tokens).sort(), `theme-${name}`);
  }
  // brand keeps default's base, so they share the rule that sets the backgrounds. danger does not.
  const [sels] = rules.find(([s, body]) => s.includes('.theme-default') && names(body).includes('bg-canvas'));
  assert.ok(sels.includes('.theme-brand'));
  assert.ok(!sels.includes('.theme-danger'));
  assert.match(css, /^:root \{ color-scheme: light dark; \}$/m);
  assert.doesNotMatch(toCss(buildThemes({}), { root: false }), /:root/);
});

test('DTCG aliases point at tokens that exist', () => {
  const dtcg = toDtcg(buildThemes(tree(['#0077b6', '#d6336c'])));
  const resolve = (path) => path.split('.').reduce((o, k) => o?.[k], dtcg);
  let count = 0;
  const walk = (node) => {
    if (node && typeof node === 'object' && '$value' in node) {
      const m = /^\{(.+)\}$/.exec(node.$value);
      if (m) { count++; assert.ok(resolve(m[1])?.$value, `alias ${m[1]}`); }
    } else if (node && typeof node === 'object') Object.values(node).forEach(walk);
  };
  walk(dtcg.themes);
  assert.ok(count > 50);
});

test('the Tailwind theme names grades the Tailwind way, and points at the CSS variables', () => {
  const tw = toTailwind(buildThemes({}));
  assert.match(tw, /@theme inline \{/);
  assert.match(tw, /--color-action-50: var\(--tm-action-5\);/);
  assert.match(tw, /--color-base-950: var\(--tm-base-95\);/);
  assert.match(tw, /--color-fill-action: var\(--tm-fill-action\);/);
  assert.match(tw, /--color-tint-base: var\(--tm-tint-base\);/);
});

test('the exact button pairs the key color with the lightest or darkest base color', () => {
  const tokensOf = (action, contrast) => buildThemes({ themes: { default: { action, ...(contrast && { contrast }) } } }).themes.default;
  // Navy pairs with white, and a pale yellow with black. Like every fill, light mode has the
  // lighter color as the label: a navy fill, and a yellow label on black. Dark mode mirrors it.
  const cases = [['#1b2a6b', { light: ['action.key', 'base.0'], dark: ['base.0', 'action.key'] }], ['#f7e37a', { light: ['base.100', 'action.key'], dark: ['action.key', 'base.100'] }]];
  for (const [action, want] of cases) {
    const { modes } = tokensOf(action);
    for (const mode of ['light', 'dark']) assert.deepEqual([modes[mode].tokens['fill.action-exact'].ref, modes[mode].tokens['on-fill.action-exact'].ref], want[mode], `${action} ${mode}`);
  }
  // With pure white and black, WCAG 2 at the standard level always passes.
  for (const action of ['#ff00ff', '#00ff88', '#777777', '#ff4400']) {
    assert.ok(tokensOf(action).modes.light.audit.find((a) => a.fg === 'on-fill.action-exact').pass, action);
  }
  // Mid gray fails under APCA: the audit warns, and the more-contrast variant uses the normal button.
  const gray = tokensOf('#777777', { method: 'apca' });
  assert.ok(gray.modes.light.audit.find((a) => a.fg === 'on-fill.action-exact').warn);
  assert.equal(gray.more.modes.light.tokens['fill.action-exact'].ref, gray.more.modes.light.tokens['fill.action'].ref);
});

test('backgrounds are base grades in every preset, and dark mode mirrors them', () => {
  for (const preset of ['balanced', 'neumorphic', 'glass']) {
    const { modes } = buildThemes({ themes: { default: { action: '#a01fa0', preset } } }).themes.default;
    assert.deepEqual(['light', 'dark'].map((m) => modes[m].tokens['bg.canvas'].ref), ['base.5', 'base.95'], preset);
  }
  // Old inputs with a tone still load: it is skipped.
  const { modes } = buildThemes({ themes: { default: { feel: { tone: 1 } } } }).themes.default;
  assert.equal(modes.light.tokens['bg.canvas'].ref, 'base.5');
});

test('feels change the primitives', () => {
  const p = (feel) => buildThemes({ themes: { default: { feel } } }).themes.default.primitives;
  assert.ok(p({ spaciousness: 1 }).space.md > p({ spaciousness: 0 }).space.md);
  assert.equal(p({ roundness: 0 }).radius.control, 0);
  assert.equal(p({ roundness: 1 }).radius.control, p({ roundness: 1 }).control.height / 2);
  assert.equal(p({ shininess: 0 }).effect.gloss, 'none');
  // Removed feels still load, and change nothing.
  assert.deepEqual(p({ thickness: 0, depth: 1, softness: 0, solidity: 0, bounciness: 1, snappiness: 1 }), p({}));
});

test('the shadcn/ui export has its variables, for the root and each child theme', () => {
  const css = toShadcn(buildThemes({ themes: { default: { color: '#2456e8' }, danger: { parent: 'default', color: '#d6336c' } } }));
  for (const name of ['background', 'foreground', 'primary', 'primary-foreground', 'muted-foreground', 'destructive', 'ring', 'radius', 'chart-1', 'sidebar-ring']) {
    assert.match(css, new RegExp(`--${name}: `), name);
  }
  assert.match(css, /^:root \{/m);
  assert.match(css, /^\.dark \{/m);
  assert.match(css, /^\.theme-danger \{/m);
});

test('every fill has light labels in light mode and dark labels in dark mode, whatever the key color', () => {
  const colors = { blue: '#2456e8', yellow: '#ffd43b', pure: '#ffff00', magenta: '#ff00ff', mint: '#3ddc97', pale: '#f1f3f5', ink: '#111111' };
  const themes = { default: { color: '#2456e8' } };
  for (const [name, color] of Object.entries(colors)) themes[name] = { parent: 'default', color };
  const built = buildThemes({ themes });
  for (const n of built.order) for (const m of ['light', 'dark']) {
    const { tokens } = built.themes[n].modes[m];
    for (const role of ['base', 'action']) {
      const grade = Number(tokens[`on-fill.${role}`].ref.split('.')[1]);
      assert.ok(m === 'light' ? grade <= 5 : grade >= 95, `${n} ${role} ${m}: label grade ${grade}`);
    }
    // The exact button too: in light mode the label is the lighter color of the pair.
    const [fill, label] = ['fill.action-exact', 'on-fill.action-exact'].map((k) => tokens[k].value);
    const lum = (hex) => parseInt(hex.slice(1, 3), 16) * 0.3 + parseInt(hex.slice(3, 5), 16) * 0.59 + parseInt(hex.slice(5, 7), 16) * 0.11;
    assert.ok(m === 'light' ? lum(label) > lum(fill) : lum(label) < lum(fill), `${n} exact ${m}`);
  }
});

test('tm-invert swaps in the twins of shadows, opacities, and panels, after the theme rules', () => {
  // The removed feels left no shadows and no see-through parts, so the twins hold fixed values.
  // The wiring stays, for when those effects come back.
  const css = toCss(buildThemes({}));
  const invert = css.indexOf('.tm-invert { --tm-elevation-1: var(--tm-elevation-1-flipped);');
  assert.ok(invert > css.indexOf(':root, .theme-default {'));
  assert.match(css, /\.tm-invert \* \{ --tm-elevation-1: var\(--tm-elevation-1-normal\);/);
  assert.doesNotMatch(css, /elevation-inset-flipped/);
  assert.match(css, /\.tm-invert \{[^}]*--tm-fill-alpha: var\(--tm-fill-alpha-inverted\);/);
  assert.match(css, /\.tm-invert \* \{[^}]*--tm-fill-alpha: var\(--tm-fill-alpha-normal\);/);
  assert.match(css, /\.tm-invert \{[^}]*--tm-bg-panel: var\(--tm-bg-panel-inverted\);/);
  assert.match(css, /\.tm-invert \* \{[^}]*--tm-bg-panel: var\(--tm-bg-panel-normal\);/);
});

test('the invert class flips the mode of an element', () => {
  const css = toCss(buildThemes({}));
  assert.match(css, /^\.tm-invert \{ color-scheme: dark; \}$/m);
  assert.match(css, /@scope \(\[data-tm-mode="dark"\]\) \{ \.tm-invert \{ color-scheme: light; \} \}/);
});

test('space, line heights, and control heights sit on the rhythm grid', () => {
  for (const spaciousness of [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1]) {
    for (const thickness of [0, 0.25, 0.5, 0.75, 1]) {
      const p = buildThemes({ themes: { default: { feel: { spaciousness, thickness } } } }).themes.default.primitives;
      const r = p.rhythm;
      const on = (v, what) => assert.equal(v % r, 0, `s ${spaciousness} t ${thickness}: ${what} ${v} is not a multiple of ${r}`);
      for (const [k, v] of Object.entries(p.space)) on(v, `space.${k}`);
      for (const [k, v] of Object.entries(p.font.leading)) { on(v, `leading.${k}`); assert.ok(v >= p.font.size[k]); }
      for (const [k, v] of Object.entries(p.font.leadingTight)) { on(v, `leadingTight.${k}`); assert.ok(v >= p.font.size[k]); }
      on(p.control.height, 'control.height');
      on(p.control.paddingY + p.border.width, 'control padding and border');
      on(p.control.paddingX + p.border.width, 'control padding and border, across');
      // Sizes differ by whole pairs of steps, so centering them in a row stays on the grid.
      on((p.control.height - p.control.heightSm) / 2, 'half the small difference');
      on((p.control.heightLg - p.control.height) / 2, 'half the large difference');
    }
  }
});

test('the grid stays 4 px, and space, line heights, and control heights never shrink as spaciousness grows', () => {
  const p = (s) => buildThemes({ themes: { default: { feel: { spaciousness: s, roundness: 1 } } } }).themes.default.primitives;
  let prev = null;
  for (let i = 0; i <= 100; i++) {
    const now = p(i / 100);
    assert.equal(now.rhythm, 4);
    assert.equal(now.font.size.md, 15, 'spaciousness does not change the text size');
    const sizes = [...Object.values(now.space), ...Object.values(now.font.leading), ...Object.values(now.font.leadingTight), now.control.heightSm, now.control.height, now.control.heightLg];
    if (prev) sizes.forEach((v, k) => assert.ok(v >= prev[k], `spaciousness ${i / 100}: ${v} < ${prev[k]}`));
    prev = sizes;
    // At full roundness, every control size is a pill.
    assert.equal(now.radius.controlSm, now.control.heightSm / 2);
    assert.equal(now.radius.controlLg, now.control.heightLg / 2);
    assert.ok(now.radius.lg <= now.space.lg, 'a card corner does not cut into its padding');
  }
});
