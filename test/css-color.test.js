import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLOR_NAMES, isColor, parseColor } from '../src/css-color.js';
import { toHex } from '../src/color.js';
import { normalizeInputs } from '../src/inputs.js';

const hex = (value) => toHex(parseColor(value));

test('hex colors, with full alpha or none', () => {
  assert.equal(hex('#1E66F5'), '#1e66f5');
  assert.equal(hex(' #abc '), '#aabbcc');
  assert.equal(hex('#abcf'), '#aabbcc');
  assert.equal(hex('#1e66f5ff'), '#1e66f5');
  for (const bad of ['#abcd', '#1e66f580', '#12345', '1e66f5', '#ggg']) assert.equal(isColor(bad), false, bad);
});

test('the 148 CSS color names, in any case', () => {
  assert.equal(Object.keys(COLOR_NAMES).length, 148);
  assert.equal(hex('rebeccapurple'), '#663399');
  assert.equal(hex('Blue'), '#0000ff');
  assert.equal(hex('LIGHTGOLDENRODYELLOW'), '#fafad2');
  assert.equal(hex('grey'), hex('gray'));
});

test('rgb() and rgba(), with spaces or commas', () => {
  for (const v of ['rgb(30 102 245)', 'rgb(30, 102, 245)', 'rgba(30,102,245,1)', 'rgb(30 102 245 / 100%)', 'RGB(30 102 245 / 1)']) assert.equal(hex(v), '#1e66f5', v);
  assert.equal(hex('rgb(100%, 0%, 0%)'), '#ff0000');
  assert.equal(hex('rgb(100% 0 50%)'), '#ff0080', 'the space syntax can mix numbers and percentages');
  assert.equal(hex('rgb(none 255 none)'), '#00ff00');
  assert.equal(hex('rgb(300 -5 0)'), '#ff0000', 'values out of range clamp');
});

test('hsl() and hsla(), with angles', () => {
  for (const v of ['hsl(120 100% 25%)', 'hsl(120, 100%, 25%)', 'hsla(120deg, 100%, 25%, 1)', 'hsl(120 100 25)', 'hsl(0.3333333turn 100% 25%)', 'hsl(-240 100% 25%)']) assert.equal(hex(v), '#008000', v);
  assert.equal(hex('hsl(none 0% 50%)'), '#808080');
});

test('oklch() and oklab()', () => {
  for (const v of ['oklch(62.8% 0.2577 29.23)', 'oklch(0.628 0.2577 29.23deg)', 'oklch(0.628 64.43% 29.23 / 1)', 'oklab(0.628 0.2249 0.1258)', 'oklab(62.8% 56.2% 31.45%)']) assert.equal(hex(v), '#ff0000', v);
  assert.equal(hex('oklch(0.6 0 none)'), hex('oklab(0.6 0 0)'));
  assert.equal(hex('oklch(1.2 0.1 20)'), '#ffffff', 'lightness clamps');
  assert.equal(hex('oklch(-0.1 0.1 20)'), '#000000');
});

test('an oklch() color outside sRGB keeps its lightness and hue, and loses chroma', async () => {
  const { srgbToOklch } = await import('../src/color.js');
  const [L, C, h] = srgbToOklch(parseColor('oklch(0.7 0.5 150)'));
  assert.ok(Math.abs(L - 0.7) < 0.005, `lightness ${L}`);
  assert.ok(Math.abs(h - 150) < 1, `hue ${h}`);
  assert.ok(C < 0.5 && C > 0.15, `chroma ${C}`);
});

test('bad colors give a message that says why', () => {
  const cases = [
    ['bluish', /is not a color\. Use a hex color/],
    ['', /is not a color/],
    [42, /42 is not a color/],
    ['rgb(0 0 0 / 0.5)', /has transparency/],
    ['hsl(120 100% 25% / 50%)', /has transparency/],
    ['rgb(0 0 0 / none)', /has transparency/],
    ['#0008', /has transparency/],
    ['transparent', /has transparency/],
    ['currentColor', /depends on the page/],
    ['oklch(0.5, 0.1, 20)', /uses commas, which oklch\(\) does not allow/],
    ['rgb(1, none, 2)', /uses "none" with commas/],
    ['rgb(1 2)', /needs three values/],
    ['rgb(1%, 2, 3)', /wrong kind for rgb\(\)/],
    ['hsl(120, 100, 25)', /wrong kind for hsl\(\)/],
    ['hsl(10% 50% 50%)', /wrong kind for hsl\(\)/],
    ['oklch(50% 10deg 20)', /wrong kind for oklch\(\)/],
    ['lab(50 20 20)', /is not a color/],
    ['rgb(1 2 3 / 1 / 1)', /is not a color/],
    ['rgb(1 2 3', /is not a color/],
  ];
  for (const [value, message] of cases) assert.throws(() => parseColor(value), message, String(value));
});

test('the inputs take any of these formats and keep hex', () => {
  const { resolved } = normalizeInputs({
    themes: {
      default: { base: 'slategray', action: { color: 'oklch(62.8% 0.2577 29.23)' } },
      calm: { parent: 'default', color: 'hsl(120 100% 25%)' },
    },
  });
  assert.equal(resolved.default.base, '#708090');
  assert.equal(resolved.default.action, '#ff0000');
  assert.equal(resolved.calm.base, '#008000');
  assert.throws(() => normalizeInputs({ themes: { default: { color: 'rgb(0 0 0 / 50%)' } } }), /themes\.default\.color: "rgb\(0 0 0 \/ 50%\)" has transparency/);
  assert.throws(() => normalizeInputs({ themes: { default: { action: 7 } } }), /themes\.default\.action: use a hex color/);
});
