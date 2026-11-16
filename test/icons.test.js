import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICONS, ICON_DEFAULTS, iconStyle, iconImport } from '../src/icons.js';
import { buildThemes, toCss, normalizeInputs, InputError } from '../src/index.js';

test('the icons input sets the icon tokens, and each field inherits on its own', () => {
  const built = buildThemes({ themes: {
    default: { icons: { style: 'rounded', weight: 300 } },
    child: { parent: 'default', icons: { fill: true } },
    feels: { parent: 'default', feel: { thinness: 0, roundness: 0 } },
  } });
  assert.deepEqual(built.themes.default.primitives.icon, { family: 'Material Symbols Rounded', fill: 0, weight: 300 });
  assert.deepEqual(built.themes.child.primitives.icon, { family: 'Material Symbols Rounded', fill: 1, weight: 300 });
  // The feels do not touch icons.
  assert.deepEqual(built.themes.feels.primitives.icon, built.themes.default.primitives.icon);
  assert.deepEqual(buildThemes({}).themes.default.primitives.icon, iconStyle(ICON_DEFAULTS));
  assert.deepEqual(iconStyle(ICON_DEFAULTS), { family: 'Material Symbols Outlined', fill: 0, weight: 400 });
});

test('a wrong icons input says what to use', () => {
  assert.throws(() => normalizeInputs({ themes: { default: { icons: { style: 'bold', fill: 'yes', weight: 900, size: 2 } } } }), (e) => {
    assert.ok(e instanceof InputError);
    for (const field of ['style', 'fill', 'weight', 'size']) assert.match(e.message, new RegExp(`icons\\.${field}:`));
    return true;
  });
  assert.throws(() => normalizeInputs({ themes: { default: { icons: 'sharp' } } }), /icons: use/);
});

test('the CSS loads each icon style once, with only the listed icons, and sets the icon tokens', () => {
  const built = buildThemes({ themes: { default: {}, round: { parent: 'default', icons: { style: 'rounded' } }, also: { parent: 'default', icons: { style: 'rounded', fill: true } } } });
  const url = iconImport(built);
  assert.equal(url.match(/family=Material\+Symbols\+Outlined:/g).length, 1);
  assert.equal(url.match(/family=Material\+Symbols\+Rounded:/g).length, 1);
  assert.ok(!url.includes('Sharp'));
  assert.ok(url.endsWith(`&icon_names=${ICONS.join(',')}&display=block`));
  const css = toCss(built);
  assert.ok(css.includes(`@import url("${url}");`));
  // Every @import comes before the first rule.
  assert.ok(css.lastIndexOf('@import') < css.indexOf('{'));
  assert.match(css, /--tm-font-icon: "Material Symbols Outlined";/);
  assert.match(css, /--tm-icon-fill: 0;/);
  assert.match(css, /--tm-icon-weight: 400;/);
});

test('icon names are unique, sorted, and in the font\'s word form', () => {
  assert.deepEqual(ICONS, [...new Set(ICONS)].sort());
  for (const name of ICONS) assert.match(name, /^[a-z][a-z0-9_]*$/);
});
