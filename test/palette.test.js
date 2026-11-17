import { test } from 'node:test';
import assert from 'node:assert/strict';
import { luminance, parseHex, srgbToOkhsl, wcagContrast } from '../src/color.js';
import { COLOR_MODELS, GRADES, apcaMinLc, contrastTest, gradeGaps, gradeLuminance, makePalette, measure, minContrast, purposeName } from '../src/palette.js';

const KEYS = ['#1e66f5', '#ff6b4a', '#2f9e44', '#ffd43b', '#00e5ff', '#7048e8', '#6b6b80', '#f8f9fa', '#111111'];

const MODELS = Object.keys(COLOR_MODELS);

test('each grade has the same luminance in every palette, in every color model', () => {
  for (const model of MODELS) {
    for (const key of KEYS) {
      const p = makePalette(key, model);
      for (const g of GRADES) {
        const y = luminance(parseHex(p.steps[g]));
        assert.ok(Math.abs(y - gradeLuminance(g)) < 0.006, `${model} ${key} grade ${g}: ${y} is not ${gradeLuminance(g)}`);
      }
    }
  }
});

test('grades 50 apart pass 4.5:1, across palettes and color models', () => {
  const palettes = MODELS.flatMap((model) => KEYS.map((key) => makePalette(key, model)));
  for (const p of palettes) for (const q of palettes) {
    for (const a of GRADES) for (const b of GRADES) {
      if (b - a >= 50) assert.ok(wcagContrast(parseHex(p.steps[a]), parseHex(q.steps[b])) >= 4.5, `${p.key} ${a} / ${q.key} ${b}`);
    }
  }
});

test('the WCAG grade gaps are 50 for text and 40 for large text and controls', () => {
  for (const model of MODELS) {
    const gaps = gradeGaps(KEYS.map((key) => makePalette(key, model)), contrastTest({ method: 'wcag', level: 'standard' }));
    assert.deepEqual(gaps, { text: 50, large: 40, ui: 40 }, model);
  }
});

test('the APCA font table gives the minimum Lc for a size and weight', () => {
  // Rows of fontLookupAPCA in apca-w3 0.1.9.
  assert.equal(apcaMinLc(18, 700), 55);
  assert.equal(apcaMinLc(24, 700), 45);
  assert.equal(apcaMinLc(24, 400), 60);
  assert.equal(apcaMinLc(16, 400), 90);
  assert.equal(apcaMinLc(15, 400), 100);
  // A weight between columns uses the lighter one; a size between rows uses the larger Lc.
  assert.equal(apcaMinLc(18, 650), apcaMinLc(18, 600));
  assert.equal(apcaMinLc(31, 700), 45);
  // Too small or too thin for text at any contrast.
  assert.equal(apcaMinLc(8, 400), Infinity);
  assert.equal(apcaMinLc(30, 100), Infinity);
});

test('text purposes use the font table with APCA, capped at the body-text minimum, and the large-text rule with WCAG 2', () => {
  assert.equal(minContrast('apca', 'standard', { size: 18, weight: 700 }), 55);
  assert.equal(minContrast('apca', 'enhanced', { size: 18, weight: 700 }), 70);
  assert.equal(minContrast('apca', 'standard', { size: 15, weight: 400 }), 75);
  assert.equal(minContrast('apca', 'enhanced', { size: 15, weight: 400 }), 90);
  assert.equal(minContrast('apca', 'standard', 'large'), 60);
  assert.equal(minContrast('wcag', 'standard', { size: 18, weight: 700 }), 4.5);
  assert.equal(minContrast('wcag', 'standard', { size: 24, weight: 400 }), 3);
  assert.equal(purposeName({ size: 18, weight: 700 }), 'text 18px/700');
  assert.equal(purposeName('ui'), 'ui');
});

test('with APCA, a large heading passes where body text fails, and the WCAG 2 floor still holds', () => {
  const test = contrastTest({ method: 'apca', level: 'standard' });
  // Grade 50 on grade 5 is about Lc 62 and 3.9:1: enough for 26 px bold, not for body text.
  const p = makePalette('#6b6b80');
  assert.ok(test(p.steps[50], p.steps[5], { size: 26, weight: 700 }));
  assert.ok(!test(p.steps[50], p.steps[5], 'text'));
  // Grade 40 on grade 5 is about Lc 51, more than the table asks for 96 px bold, but under 3:1.
  assert.ok(Math.abs(measure(p.steps[40], p.steps[5]).apca) >= minContrast('apca', 'standard', { size: 96, weight: 700 }));
  assert.ok(!test(p.steps[40], p.steps[5], { size: 96, weight: 700 }));
});

test('the key grade places the key color on the scale', () => {
  assert.equal(makePalette('#ffffff').keyGrade, 0);
  assert.equal(makePalette('#000000').keyGrade, 100);
  const p = makePalette('#767676');
  assert.ok(p.keyGrade > 45 && p.keyGrade < 55, String(p.keyGrade));
});

test('an OKHSL ramp keeps the key color\'s hue and share of the gamut at every grade', () => {
  for (const key of ['#5d8cbb', '#22aa44', '#e0115f', '#7a5cff']) {
    const p = makePalette(key, 'okhsl');
    const [hue, share] = srgbToOkhsl(parseHex(key));
    for (const g of GRADES.filter((g) => g >= 10 && g <= 90)) {
      const [h, s] = srgbToOkhsl(parseHex(p.steps[g]));
      const dh = Math.abs(((h - hue + 540) % 360) - 180);
      assert.ok(dh < 4, `${key} grade ${g}: hue ${h} is not ${hue}`);
      assert.ok(Math.abs(s - share) < 0.05, `${key} grade ${g}: share ${s} is not ${share}`);
    }
  }
});
