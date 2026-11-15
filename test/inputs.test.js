import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEELS, PRESETS, ROOT_DEFAULTS, InputError, feelWord, normalizeInputs, themeName, defaultLabel } from '../src/inputs.js';

test('no inputs give one root theme with every default', () => {
  const { order, resolved } = normalizeInputs({});
  assert.deepEqual(order, ['default']);
  const root = resolved.default;
  assert.equal(root.kind, 'full');
  assert.equal(root.action, ROOT_DEFAULTS.action);
  assert.equal(root.base, '#808080');
  assert.equal(root.preset, 'balanced');
  for (const name of Object.keys(FEELS)) assert.equal(typeof root.feel[name], 'number');
  assert.deepEqual(root.contrast, { method: 'wcag', level: 'standard', model: 'oklch' });
});

test('color sets both roles, base and action override it, and a role comes from the parent', () => {
  const { resolved } = normalizeInputs({ themes: {
    default: { base: '#6b7280', action: '#2456e8' },
    danger: { parent: 'default', color: '#d6336c' },
    brand: { parent: 'default', action: '#8a4fff' },
    mixed: { parent: 'default', color: '#d6336c', base: '#111111' },
  } });
  assert.deepEqual([resolved.danger.base, resolved.danger.action], ['#d6336c', '#d6336c']);
  assert.deepEqual([resolved.brand.base, resolved.brand.action], ['#6b7280', '#8a4fff']);
  assert.deepEqual([resolved.mixed.base, resolved.mixed.action], ['#111111', '#d6336c']);
  assert.equal(resolved.brand.kind, 'color');
});

test('version 1 inputs still load: neutral is base, and color is action only', () => {
  const { resolved } = normalizeInputs({ version: 1, themes: { default: { neutral: '#6b7280', color: '#2456e8' }, danger: { parent: 'default', color: '#d6336c' } } });
  assert.deepEqual([resolved.default.base, resolved.default.action], ['#6b7280', '#2456e8']);
  assert.deepEqual([resolved.danger.base, resolved.danger.action], ['#6b7280', '#d6336c']);
  assert.throws(() => normalizeInputs({ themes: { default: { neutral: '#6b7280' } } }), /renamed to "base"/);
  // fillLabel is gone. Old inputs still load: the engine skips it.
  for (const version of [1, 2]) {
    const { themes } = normalizeInputs({ version, themes: { default: { action: '#ffff00', fillLabel: 'dark' } } });
    assert.ok(!('fillLabel' in themes.default));
  }
});

test('a theme can have a label for people, and its name stays the ID', () => {
  const { resolved } = normalizeInputs({ themes: { 'big-sale': { parent: 'default', label: 'Big Sale', action: '#e8590c' }, child: { parent: 'big-sale' } } });
  assert.equal(resolved['big-sale'].label, 'Big Sale');
  assert.equal(resolved['big-sale'].kind, 'color', 'a label does not make a full theme');
  assert.equal(resolved.child.label, 'Child', 'labels are not inherited, and come from the name');
  assert.equal(resolved.default.label, 'Default', 'the root is "Default" for people, and "default" in code');
  assert.throws(() => normalizeInputs({ themes: { 'Big Sale': { parent: 'default' } } }), /Use "big-sale", with "label": "Big Sale"/);
  assert.equal(themeName('  Big Sale! '), 'big-sale');
  assert.equal(themeName('Café Noir'), 'cafe-noir');
  assert.equal(themeName('2024 Promo'), 'promo');
  assert.equal(themeName('USA'), 'usa');
  assert.equal(defaultLabel('big-sale'), 'Big sale');
});

test('themetron adds no colors of its own', () => {
  const { order } = normalizeInputs({ themes: { default: { color: '#2456e8' } } });
  assert.deepEqual(order, ['default']);
});

test('a child takes what it does not set from its parent', () => {
  const { resolved, order } = normalizeInputs({
    themes: {
      sale: { parent: 'playful', color: '#e8590c' },
      default: { color: '#2456e8', font: 'Figtree', feel: { spaciousness: 0.9 }, contrast: { method: 'apca' } },
      playful: { parent: 'default', feel: { roundness: 'pill' }, headingFont: 'Fraunces' },
      danger: { parent: 'default', color: '#d6336c' },
    },
  });
  assert.deepEqual(order, ['default', 'playful', 'sale', 'danger']);
  const { playful, sale, danger } = resolved;
  assert.equal(danger.kind, 'color');
  assert.equal(sale.kind, 'color');
  assert.equal(playful.kind, 'full');
  assert.equal(playful.action, '#2456e8');
  assert.equal(playful.base, '#2456e8', 'color sets both roles');
  assert.equal(playful.feel.roundness, 1);
  assert.equal(playful.feel.spaciousness, 0.9, 'feels merge with the parent');
  assert.equal(playful.font.family, 'Figtree');
  assert.equal(playful.headingFont.family, 'Fraunces');
  assert.equal(sale.headingFont.family, 'Fraunces');
  assert.deepEqual(sale.contrast, { method: 'apca', level: 'standard', model: 'oklch' });
});

test('a preset starts the feels again, and the heading font follows the nearest font', () => {
  const { resolved } = normalizeInputs({
    themes: {
      default: { font: 'Figtree', headingFont: 'Fraunces', feel: { depth: 0.9 } },
      brut: { parent: 'default', preset: 'brutalist', font: 'Archivo' },
    },
  });
  assert.equal(resolved.brut.feel.depth, PRESETS.brutalist.feel.depth);
  assert.equal(resolved.brut.headingFont.family, 'Archivo');
  assert.equal(resolved.default.headingFont.family, 'Fraunces');
  assert.equal(feelWord('roundness', 0.3), 'slight');
});

test('bad inputs give one message for each problem', () => {
  const bad = {
    themes: {
      default: { parent: 'x', color: 'blue', feel: { spaciousness: 2, roundness: 'curvy' }, preset: 'retro' },
      Big: { parent: 'default' },
      orphan: { color: '#fff' },
      lost: { parent: 'nobody' },
    },
    colors: {},
  };
  assert.throws(() => normalizeInputs(bad), (err) => {
    assert.ok(err instanceof InputError);
    assert.equal(err.message.split('\n').length, 9, err.message);
    assert.match(err.message, /^colors: unknown field/m);
    assert.match(err.message, /themes\.lost\.parent: no theme is named "nobody"/);
    return true;
  });
});

test('parents must not make a loop', () => {
  assert.throws(() => normalizeInputs({ themes: { a: { parent: 'b' }, b: { parent: 'a' } } }), /make a loop/);
});

test('a child can take a preset and still inherit single feels', () => {
  const { resolved } = normalizeInputs({
    themes: {
      default: { feel: { spaciousness: 0.5, roundness: 0.4 } },
      brut: { parent: 'default', preset: 'brutalist', feel: { spaciousness: 'inherit' } },
      plain: { parent: 'default', feel: { depth: 'inherit' } },
    },
  });
  assert.equal(resolved.brut.feel.spaciousness, 0.5, 'inherited from the parent, not the preset');
  assert.equal(resolved.brut.feel.roundness, PRESETS.brutalist.feel.roundness, 'from the preset');
  assert.equal(resolved.plain.feel.depth, resolved.default.feel.depth);
  assert.equal(resolved.plain.kind, 'full');
});

test('solidity still loads, turned over into clarity', () => {
  const { themes } = normalizeInputs({
    themes: {
      default: { feel: { solidity: 0.25 } },
      words: { parent: 'default', feel: { solidity: 'frosted' } },
      both: { parent: 'default', feel: { clarity: 0.1, solidity: 0.2 } },
    },
  });
  assert.equal(themes.default.feel.clarity, 0.75);
  assert.equal(themes.words.feel.clarity, 0.67, "solidity's own words still work");
  assert.equal(themes.both.feel.clarity, 0.1, 'clarity wins');
  assert.equal('solidity' in themes.default.feel, false);
});

test('thickness still loads, turned over into thinness', () => {
  const { themes } = normalizeInputs({ themes: { default: { feel: { thickness: 0.25 } }, words: { parent: 'default', feel: { thickness: 'chunky' } } } });
  assert.equal(themes.default.feel.thinness, 0.75, 'the value turns over');
  assert.equal(themes.words.feel.thinness, 0, "thickness's own words still work");
});

test('a font can name its own files, and each file is checked', () => {
  const src = [{ url: '/fonts/Inter.woff2', weight: '100 900' }, { url: 'https://x.test/Inter-Italic.ttf?v=2', weight: 400, style: 'italic' }];
  const { resolved } = normalizeInputs({ themes: { default: { font: { family: 'Inter', src } } } });
  assert.deepEqual(resolved.default.font, { family: 'Inter', fallback: 'sans-serif', src: [src[0], { ...src[1], weight: '400' }] });
  assert.deepEqual(resolved.default.headingFont, resolved.default.font, 'the heading font follows the font, with its files');
  const fails = (font, pattern) => assert.throws(() => normalizeInputs({ themes: { default: { font } } }), pattern);
  fails({ src: [{ url: '/fonts/Inter.woff2' }] }, /font\.src: font files need a "family"/);
  fails({ family: 'Inter', src: [] }, /font\.src: use a list of files/);
  fails({ family: 'Inter', src: [{ url: '/fonts/Inter.css' }] }, /src\[0\]\.url: use the URL of a \.woff2/);
  fails({ family: 'Inter', src: [{ url: '/fonts/In"ter.woff2' }] }, /src\[0\]\.url/);
  fails({ family: 'Inter', src: [{ url: '/a.woff2' }, { url: '/b.woff2', weight: '100-900' }] }, /src\[1\]\.weight: use a number from 1 to 1000/);
  fails({ family: 'Inter', src: [{ url: '/a.woff2', weight: 1001 }] }, /weight/);
  fails({ family: 'Inter', src: [{ url: '/a.woff2', style: 'oblique' }] }, /style: use one of: normal, italic/);
  fails({ family: 'Inter', src: [{ url: '/a.woff2', format: 'woff2' }] }, /format: unknown field/);
});
