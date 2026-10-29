import { test } from 'node:test';
import assert from 'node:assert/strict';
import { luminance, parseHex, wcagContrast } from '../src/color.js';
import { COLOR_MODELS, GRADES, contrastTest, gradeGaps, gradeLuminance, makePalette } from '../src/palette.js';

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

test('the key grade places the key color on the scale', () => {
  assert.equal(makePalette('#ffffff').keyGrade, 0);
  assert.equal(makePalette('#000000').keyGrade, 100);
  const p = makePalette('#767676');
  assert.ok(p.keyGrade > 45 && p.keyGrade < 55, String(p.keyGrade));
});
