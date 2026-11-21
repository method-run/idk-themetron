import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRESETS, buildThemes, toCss, toDtcg, toShadcn, toTailwind, toBootstrapSass, toMui, toDaisyui, toBootstrapCss, tokenManifest } from '../src/index.js';

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

test('every required pair passes in the OKHSL and HSL color models too', () => {
  for (const colors of TRICKY) {
    for (const model of ['okhsl', 'hsl']) {
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

test('headings are checked at their size at regular weight, and with APCA the larger ones can fade further', () => {
  const theme = (method) => buildThemes({ themes: { default: { contrast: { method }, feel: { softness: 1 } } } }).themes.default;
  const apca = theme('apca');
  const size = apca.primitives.font.size;
  const purposes = apca.modes.light.audit.filter((a) => /heading/.test(a.fg)).map((a) => a.purpose);
  assert.deepEqual([...new Set(purposes)], ['lg', '2xl', '3xl'].map((s) => `text ${size[s]}px/400`));
  // At softness 1, a heading is at the min-contrast grade for its size: h1 is lighter than h3, and
  // no heading is darker than muted text, which is at the min-contrast grade for body text.
  const grade = (t, name) => t.modes.light.tokens[name].grade;
  assert.ok(grade(apca, 'fg.base-heading-3xl') < grade(apca, 'fg.base-heading-lg'));
  assert.ok(grade(apca, 'fg.base-heading-lg') <= grade(apca, 'fg.base-muted'));
  // WCAG 2 is the floor, so APCA headings are never lighter than WCAG 2 headings.
  const wcag = theme('wcag');
  for (const s of ['lg', '2xl', '3xl']) assert.ok(grade(apca, `fg.base-heading-${s}`) >= grade(wcag, `fg.base-heading-${s}`), s);
});

test('the components and the looks use only tokens that the CSS defines', async () => {
  const css = toCss(buildThemes({}));
  const defined = new Set([...css.matchAll(/--(tm-[a-z0-9-]+):/g)].map((m) => m[1]));
  const components = (await Promise.all(['components.css', 'looks.css'].map((f) => readFile(new URL(`../components/${f}`, import.meta.url), 'utf8')))).join('\n');
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
    // Global tokens, such as the shared shine, are set once for every element, not per theme.
    assert.deepEqual(set.sort(), Object.keys(tokens).filter((n) => !tokens[n].global).sort(), `theme-${name}`);
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

test('the exact button pairs the key color with white or black from the action ramp', () => {
  const tokensOf = (action, contrast) => buildThemes({ themes: { default: { action, ...(contrast && { contrast }) } } }).themes.default;
  // Navy pairs with white, and a pale yellow with black. Like every fill, light mode has the
  // lighter color as the label: a navy fill, and a yellow label on black. Dark mode mirrors it.
  const cases = [['#1b2a6b', { light: ['action.key', 'action.0'], dark: ['action.0', 'action.key'] }], ['#f7e37a', { light: ['action.100', 'action.key'], dark: ['action.key', 'action.100'] }]];
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
  assert.equal(p({ shininess: 0.4 }).shininess, 0.4);
  // Type variance: small text stays at 11 px or more, body text at 16 or 17, and every larger
  // size only grows. The default keeps the classic 1.2 scale.
  let last = null;
  for (let i = 0; i <= 20; i++) {
    const v = i / 20;
    const size = buildThemes({ themes: { default: { typeVariance: v } } }).themes.default.primitives.font.size;
    assert.ok(size.sm >= 11 && size.sm <= 13 && size.xs >= 11, `small text at ${v}`);
    assert.ok(size.md === 16 || size.md === 17, `body text at ${v}`);
    if (last) for (const k of ['md', 'lg', 'xl', '2xl', '3xl']) assert.ok(size[k] >= last[k], `${k} grows at ${v}`);
    last = size;
  }
  assert.deepEqual(p({}).font.size, { xs: 11, sm: 12, md: 16, lg: 19, xl: 23, '2xl': 28, '3xl': 33 });
  // Removed feels still load, and change nothing.
  assert.deepEqual(p({ bounciness: 1, snappiness: 1 }), p({}));
  // Thinness: 4 px edges at 0, a hairline at the default, none at 1.
  assert.deepEqual([0, 0.8, 1].map((thinness) => p({ thinness }).border.width), [4, 1, 0]);
  assert.equal(p({}).border.width, 1);
  // Softness: the default keeps the shadows as they were; softer is blurrier; the light shadow
  // (a first layer with a negative offset) only appears at the top of the range.
  const shadow = (softness) => buildThemes({ themes: { default: { feel: { depth: 0.5, softness } } } }).themes.default.modes.light.computed['elevation.2'];
  const blur = (css) => parseFloat(css.split(', ').find((l) => !l.startsWith('-')).split(' ')[2]);
  assert.ok(blur(shadow(1)) > blur(shadow(0.5)) && blur(shadow(0.5)) > blur(shadow(0)));
  assert.ok(!shadow(0.85).startsWith('-') && shadow(0.95).startsWith('-'));
  // Clarity: opaque at 0, and each kind of part at its clearest at 1.
  const clear = p({ clarity: 1 }).effect;
  for (const k of ['panelAlpha', 'panelAlphaInverted', 'fillAlpha', 'fillAlphaInverted', 'tintAlpha', 'tintAlphaInverted', 'fieldAlpha']) assert.equal(p({ clarity: 0 }).effect[k], 1, k);
  assert.deepEqual([clear.panelAlpha, clear.fillAlpha, clear.fillAlphaInverted, clear.tintAlpha, clear.fieldAlpha], [0.1, 0.5, 0.3, 0.1, 0.3]);
  // Depth: flat at 0, and every elevation floats further as depth grows.
  const shadows = (depth) => buildThemes({ themes: { default: { feel: { depth } } } }).themes.default.modes.light.computed;
  assert.equal(shadows(0)['elevation.2'], '0 0 #0000');
  assert.equal(p({ depth: 0 }).effect.lift, 0);
  const offset = (depth, level) => parseFloat(shadows(depth)[`elevation.${level}`].split(' ')[1]);
  for (const level of [1, 2, 3]) assert.ok(offset(1, level) > offset(0.3, level), `elevation ${level}`);
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

test('the Bootstrap export sets its Sass variables, with light values and dark twins', () => {
  const built = buildThemes({ themes: { default: { color: '#2456e8' }, danger: { parent: 'default', color: '#d6336c' }, promo: { parent: 'default', action: '#7c3aed' } } });
  const scss = toBootstrapSass(built);
  const value = (name) => new RegExp(`^\\$${name}: (.+);$`, 'm').exec(scss)?.[1];
  const { light, dark } = built.themes.default.modes;
  assert.equal(value('primary'), light.tokens['fill.action'].value);
  assert.equal(value('danger'), built.themes.danger.modes.light.tokens['fill.action'].value);
  assert.equal(value('body-bg'), light.tokens['bg.canvas'].value);
  assert.equal(value('body-bg-dark'), dark.tokens['bg.canvas'].value);
  assert.equal(value('link-color-dark'), dark.tokens['fg.action'].value);
  assert.equal(value('danger-bg-subtle-dark'), built.themes.danger.modes.dark.tokens['tint.action'].value);
  assert.equal(value('box-shadow'), light.computed['elevation.2']);
  for (const name of ['border-color', 'border-width', 'border-radius', 'border-radius-sm', 'border-radius-lg', 'box-shadow-sm', 'box-shadow-lg', 'font-family-sans-serif', 'font-size-base', 'spacer', 'spacers']) assert.ok(value(name), name);
  // Bootstrap has no variable for a theme it does not name, and no dark twin for theme colors.
  assert.equal(value('success'), undefined);
  assert.equal(value('primary-dark'), undefined);
  assert.doesNotMatch(scss, /promo/);
});

const STATUS_TREE = { themes: { default: { color: '#2456e8' }, danger: { parent: 'default', color: '#d6336c' }, promo: { parent: 'default', action: '#8a4fff' } } };

test('the MUI theme has a palette for each mode, with the status colors of the status themes', () => {
  const built = buildThemes(STATUS_TREE);
  const mui = toMui(built);
  for (const mode of ['light', 'dark']) {
    const { palette } = mui.colorSchemes[mode];
    const t = built.themes.default.modes[mode].tokens;
    assert.equal(palette.mode, mode);
    assert.deepEqual(palette.primary, { main: t['fill.action'].value, contrastText: t['on-fill.action'].value });
    assert.equal(palette.background.default, t['bg.canvas'].value);
    assert.equal(palette.text.primary, t['fg.base'].value);
    assert.equal(palette.divider, t['border.base'].value);
    assert.equal(palette.error.main, built.themes.danger.modes[mode].tokens['fill.action'].value);
    assert.equal(palette.success, undefined, 'no success theme, so MUI keeps its own');
  }
  assert.equal(mui.shape.borderRadius, built.themes.default.primitives.radius.md);
  assert.match(mui.typography.fontFamily, /sans-serif/);
  assert.equal(toMui(built, { theme: 'promo' }).colorSchemes.light.palette.primary.main, built.themes.promo.modes.light.tokens['fill.action'].value);
  assert.throws(() => toMui(built, { theme: 'nope' }), /no theme named nope/);
  const e = (level) => built.themes.default.modes.light.computed[`elevation.${level}`];
  assert.equal(mui.shadows.length, 25);
  assert.equal(mui.shadows[0], 'none');
  assert.deepEqual([mui.shadows[1], mui.shadows[2], mui.shadows[4], mui.shadows[8], mui.shadows[24]], [e(1), e(1), e(2), e(2), e(3)]);
});

test('the daisyUI export has a light and a dark theme that point at the CSS variables', () => {
  const css = toDaisyui(buildThemes(STATUS_TREE));
  assert.equal(css.match(/@plugin "daisyui\/theme" \{/g).length, 2);
  assert.match(css, /name: "themetron";\n  default: true;\n  prefersdark: false;\n  color-scheme: light;/);
  assert.match(css, /name: "themetron-dark";\n  default: false;\n  prefersdark: true;\n  color-scheme: dark;/);
  for (const name of ['base-100', 'base-content', 'primary', 'primary-content', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error-content']) {
    assert.match(css, new RegExp(`--color-${name}: `), name);
  }
  assert.match(css, /--color-primary: var\(--tm-fill-action\);/);
  assert.match(css, /--color-error: light-dark\(#[0-9a-f]{6}, #[0-9a-f]{6}\);/);
  assert.match(css, /--radius-field: var\(--tm-radius-control\);/);
  assert.match(css, /^\.theme-danger, \.theme-promo \{\n  --color-base-100: /m);
});

test('the Bootstrap CSS export has its variables, with -rgb twins, for each mode and child theme', () => {
  const built = buildThemes(STATUS_TREE);
  const css = toBootstrapCss(built);
  for (const name of ['primary', 'primary-rgb', 'primary-bg-subtle', 'danger', 'body-bg', 'body-color-rgb', 'border-color', 'border-radius', 'link-color', 'focus-ring-color', 'box-shadow']) {
    assert.match(css, new RegExp(`--bs-${name}: `), name);
  }
  const fill = built.themes.default.modes.light.tokens['fill.action'].value;
  const rgb = [1, 3, 5].map((i) => parseInt(fill.slice(i, i + 2), 16)).join(', ');
  assert.ok(css.includes(`--bs-primary: ${fill};\n  --bs-primary-rgb: ${rgb};`));
  assert.match(css, /^:root, \[data-bs-theme=light\] \{/m);
  assert.match(css, /^\[data-bs-theme=dark\] \{/m);
  assert.match(css, /^\.theme-promo \{/m);
  assert.match(css, /^\[data-bs-theme=dark\] \.theme-promo, \.theme-promo\[data-bs-theme=dark\] \{/m);
  assert.doesNotMatch(css, /--bs-success:/, 'no success theme, so Bootstrap keeps its own');
  // Buttons: one rule for each, reading helper variables that each theme and mode sets.
  for (const k of ['primary', 'secondary', 'danger']) {
    assert.match(css, new RegExp(`^\\.btn-${k} \\{\\n  --bs-btn-color: var\\(--tm-bs-${k}-on\\);`, 'm'), k);
    assert.match(css, new RegExp(`^\\.btn-outline-${k} \\{`, 'm'), k);
  }
  assert.doesNotMatch(css, /\.btn-success/, 'no success theme, so Bootstrap keeps its own button');
  const t = (name, mode, token) => built.themes[name].modes[mode].tokens[token].value;
  assert.ok(css.includes(`--tm-bs-primary-hover: ${t('default', 'light', 'fill.action-hover')};`));
  assert.ok(css.includes(`--tm-bs-secondary: ${t('default', 'light', 'fill.quiet')};`));
  assert.ok(css.includes(`--tm-bs-primary: ${t('promo', 'dark', 'fill.action')};`), 'child themes set the helpers in dark mode too');
});

test('the Bootstrap CSS export with looks adds the tokens, and the looks on Bootstrap\'s classes', async () => {
  const built = buildThemes(STATUS_TREE);
  const looksCss = await readFile(new URL('../components/looks.css', import.meta.url), 'utf8');
  const plain = toBootstrapCss(built);
  const css = toBootstrapCss(built, { looksCss });
  assert.ok(css.startsWith(plain), 'the variables come first, as without looks');
  const looks = css.slice(plain.length);
  assert.match(looks, /^:root, \[data-bs-theme=light\] \{ color-scheme: light; \}$/m, 'the mode follows data-bs-theme');
  assert.match(looks, /--tm-fill-action: /, 'the tokens');
  assert.doesNotMatch(looks, /^@import/m, 'an @import must start a file');
  assert.doesNotMatch(looks, /^:root \{ color-scheme: light dark; \}$/m, 'not the system setting');
  // The danger theme's rules also name its buttons, so they wear its tokens.
  assert.match(looks, /^\.theme-danger, \.btn-danger, \.btn-outline-danger \{$/m);
  assert.match(looks, /^:is\(\.btn-primary, \.btn-danger\):hover, /m, 'the fill');
  assert.match(looks, /^\.btn-secondary \{ --_bg: var\(--tm-fill-quiet\)/m, 'the quiet look');
  assert.match(looks, /^\.card \{/m, 'the surface');
  assert.doesNotMatch(looks, /\.tm-(button|card|look-)/, 'no themetron classes but tm-invert');
  assert.doesNotMatch(looks, /\.btn-success/, 'no success theme, so Bootstrap keeps its own button');
});

test('the framework exports have more contrast, in the way each tool allows', () => {
  const built = buildThemes(STATUS_TREE);
  const more = (name, mode, token) => built.themes[name].more.modes[mode].tokens[token].value;
  const base = (name, mode, token) => built.themes[name].modes[mode].tokens[token].value;
  assert.notEqual(more('default', 'light', 'fill.action'), base('default', 'light', 'fill.action'), 'the test tree has a more-contrast change');
  // shadcn/ui and Bootstrap CSS: a media block after the base rules, with only the changed values.
  const media = (css) => css.slice(css.indexOf('@media (prefers-contrast: more) {'));
  const shadcn = toShadcn(built);
  assert.match(media(shadcn), new RegExp(`^  :root \\{[^}]*--primary: ${more('default', 'light', 'fill.action')};`, 'm'));
  assert.match(media(shadcn), new RegExp(`^  \\.dark \\{[^}]*--primary: ${more('default', 'dark', 'fill.action')};`, 'm'));
  assert.doesNotMatch(media(shadcn), /--radius:/, 'only changed values');
  const bootstrap = toBootstrapCss(built);
  assert.match(media(bootstrap), new RegExp(`^  \\.theme-promo \\{[^}]*--bs-primary: ${more('promo', 'light', 'fill.action')};`, 'm'));
  assert.match(media(bootstrap), new RegExp(`--tm-bs-primary-hover: ${more('default', 'light', 'fill.action-hover')};`));
  assert.ok(bootstrap.indexOf('@media (prefers-contrast: more)') > bootstrap.indexOf('.theme-promo {'), 'after the base rules');
  // MUI and Bootstrap Sass: a second theme or file, which the app or the page picks.
  assert.equal(toMui(built, { more: true }).colorSchemes.dark.palette.primary.main, more('default', 'dark', 'fill.action'));
  assert.equal(toMui(built, { more: true }).colorSchemes.light.palette.error.main, more('danger', 'light', 'fill.action'));
  const sass = (options) => toBootstrapSass(built, options);
  const value = (scss, name) => new RegExp(`^\\$${name}: (.+);$`, 'm').exec(scss)?.[1];
  assert.equal(value(sass({ more: true }), 'primary'), more('default', 'light', 'fill.action'));
  assert.equal(value(sass({ more: true }), 'body-color-dark'), more('default', 'dark', 'fg.base'));
  assert.equal(value(sass(), 'primary'), base('default', 'light', 'fill.action'));
  assert.match(sass(), /#more-contrast-with-bootstrap-sass/, 'the file says where the steps are');
});

test('every token has a color, even for key colors at the very ends of the scale', () => {
  for (const color of ['#ffffff', '#ffff00', '#fefefe', '#000000', '#0000ee', '#ff00ee']) {
    const { modes } = buildThemes({ themes: { default: { color } } }).themes.default;
    for (const m of ['light', 'dark']) for (const [name, t] of Object.entries(modes[m].tokens)) {
      assert.match(String(t.value), /^#[0-9a-f]{6}$/i, `${color} ${m} ${name}: ${t.ref}`);
      assert.ok(Number.isFinite(t.grade) && t.grade >= 0 && t.grade <= 100, `${color} ${m} ${name}: grade ${t.grade}`);
    }
  }
});

test('every action fill has light labels in light mode and dark labels in dark mode, whatever the key color', () => {
  const colors = { blue: '#2456e8', yellow: '#ffd43b', pure: '#ffff00', magenta: '#ff00ff', mint: '#3ddc97', pale: '#f1f3f5', ink: '#111111' };
  const themes = { default: { color: '#2456e8' } };
  for (const [name, color] of Object.entries(colors)) themes[name] = { parent: 'default', color };
  const built = buildThemes({ themes });
  for (const n of built.order) for (const m of ['light', 'dark']) {
    const { tokens } = built.themes[n].modes[m];
    for (const role of ['action']) {
      const { grade } = tokens[`on-fill.${role}`];
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
    for (const thinness of [0, 0.25, 0.5, 0.75, 1]) {
      const p = buildThemes({ themes: { default: { feel: { spaciousness, thinness } } } }).themes.default.primitives;
      const r = p.rhythm;
      const on = (v, what) => assert.equal(v % r, 0, `s ${spaciousness} t ${thinness}: ${what} ${v} is not a multiple of ${r}`);
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
    assert.equal(now.font.size.md, 16, 'spaciousness does not change the text size');
    const sizes = [...Object.values(now.space), ...Object.values(now.font.leading), ...Object.values(now.font.leadingTight), now.control.heightSm, now.control.height, now.control.heightLg];
    if (prev) sizes.forEach((v, k) => assert.ok(v >= prev[k], `spaciousness ${i / 100}: ${v} < ${prev[k]}`));
    prev = sizes;
    // At full roundness, every control size is a pill.
    assert.equal(now.radius.controlSm, now.control.heightSm / 2);
    assert.equal(now.radius.controlLg, now.control.heightLg / 2);
    assert.ok(now.radius.lg <= now.space.lg, 'a card corner does not cut into its padding');
  }
});

test('see-through labels are checked over white and black backdrops, as warnings only', () => {
  const audit = (clarity) => buildThemes({ themes: { default: { color: '#2456e8', feel: { clarity } } } }).themes.default.modes;
  // Opaque parts have no backdrop rows.
  for (const m of ['light', 'dark']) assert.equal(audit(0)[m].audit.filter((a) => a.backdrop !== undefined).length, 0, m);
  const modes = audit(1);
  const blend = (fg, bg, alpha) => `#${[1, 3, 5].map((i) => Math.round(alpha * parseInt(fg.slice(i, i + 2), 16) + (1 - alpha) * parseInt(bg.slice(i, i + 2), 16)).toString(16).padStart(2, '0')).join('')}`;
  for (const m of ['light', 'dark']) {
    const { audit: rows, tokens } = modes[m];
    const backdrop = rows.filter((a) => a.backdrop !== undefined);
    // Cards (two labels), fields, three fills, and two tints, each over white and black.
    assert.equal(backdrop.length, 16, m);
    for (const a of backdrop) {
      assert.equal(a.required, false);
      assert.equal(a.warn, !a.pass);
      assert.match(a.bg, / over a (white|black) backdrop \(base (0|100)\)$/);
    }
    // The values are the part's color at its opacity over pure white and pure black.
    const panel = backdrop.filter((a) => a.fg === 'fg.base' && a.bg.startsWith('bg.panel at 10%'));
    assert.deepEqual(panel.map((a) => a.bgValue), [blend(tokens['bg.surface'].value, '#ffffff', 0.1), blend(tokens['bg.surface'].value, '#000000', 0.1)]);
    const fill = backdrop.filter((a) => a.fg === 'on-fill.action');
    assert.deepEqual(fill.map((a) => a.bgValue), [blend(tokens['fill.action'].value, '#ffffff', 0.5), blend(tokens['fill.action'].value, '#000000', 0.5)]);
  }
  // A light card over black loses its dark text, and the audit says so.
  assert.ok(modes.light.audit.some((a) => a.fg === 'fg.base' && a.bg.includes('black backdrop') && a.warn));
});
