import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildThemes, toCss, normalizeInputs, InputError } from '../src/index.js';

const GRADIENT = { color: '#7b2ff7', to: '#f107a3', solid: 0.5 };

test('a gradient\'s ends take each solid token\'s grade from their own ramps', () => {
  const t = buildThemes({ themes: { default: { action: GRADIENT } } }).themes.default;
  for (const mode of ['light', 'dark']) {
    const tokens = t.modes[mode].tokens;
    for (const kind of ['fill', 'tint']) {
      for (const state of ['', '-hover', '-active']) {
        const name = `${kind}.action${state}`;
        assert.equal(tokens[`${name}-from`].ref, `action-from.${tokens[name].grade}`);
        assert.equal(tokens[`${name}-to`].ref, `action-to.${tokens[name].grade}`);
      }
    }
    // In light mode the exact button shows the two colors themselves. In dark mode they are its
    // label, on a white fill, so both ends are the fill.
    if (mode === 'light') {
      assert.equal(tokens['fill.action-exact-from'].value, t.stops.from.key);
      assert.equal(tokens['fill.action-exact-to'].value, t.stops.to.key);
    } else {
      assert.deepEqual(tokens['fill.action-exact-from'], tokens['fill.action-exact']);
    }
    // Every required pair passes, the ends and the middle of the gradient too.
    assert.deepEqual(t.modes[mode].audit.filter((a) => a.required && !a.pass).map((a) => `${a.fg} on ${a.bg}`), []);
    assert.ok(t.modes[mode].audit.some((a) => a.bg === "fill.action (the gradient's middle)"));
  }
  // The solid color is the mix at `solid`, and makes the action ramp.
  assert.equal(t.settings.action, t.palettes.action.key);
  assert.notEqual(t.settings.action, GRADIENT.color);
});

test('without a gradient, both ends are the solid token, and there are no extra ramps', () => {
  const t = buildThemes({}).themes.default;
  const tokens = t.modes.light.tokens;
  assert.deepEqual(tokens['fill.action-from'], tokens['fill.action']);
  assert.deepEqual(tokens['tint.action-hover-to'], tokens['tint.action-hover']);
  assert.deepEqual(tokens['fill.action-exact-from'], tokens['fill.action-exact']);
  assert.deepEqual(Object.keys(t.primitives.color), ['base', 'action']);
  assert.equal(t.primitives.gradientAngle, 180);
});

test('solid 0 keeps the start color, and a child that sets its action color drops the gradient', () => {
  const built = buildThemes({ themes: {
    default: { action: { color: '#7b2ff7', to: '#f107a3', angle: 450 } },
    plain: { parent: 'default', action: { color: '#7b2ff7', to: '#f107a3' } },
    keeps: { parent: 'default', font: 'Inter' },
    drops: { parent: 'default', action: '#cc0000' },
  } });
  assert.equal(built.themes.default.settings.action, '#7b2ff7');
  assert.equal(built.themes.default.settings.gradient.angle, 90);
  assert.equal(built.themes.plain.settings.gradient.angle, 180);
  assert.deepEqual(built.themes.keeps.settings.gradient, built.themes.default.settings.gradient);
  assert.equal(built.themes.drops.settings.gradient, null);
  // A color theme with its own gradient is still a color theme.
  assert.equal(buildThemes({ themes: { default: {}, c: { parent: 'default', action: GRADIENT } } }).themes.c.kind, 'color');
});

test('the CSS has the angle, the ends, and the images', () => {
  const css = toCss(buildThemes({ themes: { default: { action: { ...GRADIENT, angle: 135 } } } }));
  assert.match(css, /--tm-action-angle: 135deg;/);
  assert.match(css, /--tm-fill-action-hover-from: /);
  assert.match(css, /--tm-action-from-50: #/);
  assert.match(css, /--tm-tint-action-image: linear-gradient\(var\(--tm-action-angle\) in oklch, var\(--tm-tint-action-from\), var\(--tm-tint-action-to\)\);/);
});

test('a wrong gradient says what to use', () => {
  const problems = (action) => { try { normalizeInputs({ themes: { default: { action } } }); return ''; } catch (e) { assert.ok(e instanceof InputError); return e.message; } };
  assert.match(problems({ color: '#000', to: 'pink' }), /action\.to: "pink" is not a hex color/);
  assert.match(problems({ color: '#000', to: '#fff', solid: 2 }), /action\.solid: use a number from 0/);
  assert.match(problems({ color: '#000', to: '#fff', angle: 'left' }), /action\.angle: use a number of degrees/);
  assert.match(problems({ to: '#fff' }), /a gradient needs "color"/);
  assert.match(problems({ color: '#000', solid: 0.5 }), /action\.solid: only a gradient has a solid position. Add "to"/);
  assert.match(problems({ color: '#000', to: '#fff', stops: [] }), /action\.stops: unknown field/);
});
