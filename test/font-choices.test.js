import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickFonts, fallbackOf } from '../scripts/font-choices.js';

const family = (name, popularity, more = {}) => ({ family: name, popularity, category: 'Sans Serif', stroke: 'Sans Serif', subsets: ['latin'], isNoto: false, isBrandFont: false, isOpenSource: true, primaryScript: '', ...more });

test('the font menu takes the most popular family for a filter, and no family twice', () => {
  const families = [family('Common', 1), family('Second', 2), family('Third', 3)];
  const tags = [['Common', '', '/Sans/Humanist', '100'], ['Common', '', '/Sans/Grotesque', '100'], ['Second', '', '/Sans/Grotesque', '90']];
  const sans = pickFonts(families, tags).find((g) => g.label === 'Sans serif');
  assert.deepEqual(sans.fonts.map((f) => [f.family, f.note]), [['Common', 'Humanist'], ['Second', 'Grotesque']]);
});

test('feelings take the highest scores first, and popularity breaks ties', () => {
  const families = [family('Popular', 1), family('Fitting', 50), family('Also', 40), family('Last', 60)];
  const tags = [['Popular', '', '/Expressive/Calm', '60'], ['Fitting', '', '/Expressive/Calm', '100'], ['Also', '', '/Expressive/Calm', '100'], ['Last', '', '/Expressive/Calm', '70']];
  const calm = pickFonts(families, tags).find((g) => g.label === 'Calm');
  assert.deepEqual(calm.fonts.map((f) => f.family), ['Also', 'Fitting', 'Last']);
});

test('the font menu leaves out families for other scripts, Noto, and low scores', () => {
  const families = [family('Thai Too', 1, { primaryScript: 'Thai' }), family('Noto Sans', 2, { isNoto: true }), family('Weak', 3), family('Kept', 4)];
  const tags = ['Thai Too', 'Noto Sans', 'Kept'].map((f) => [f, '', '/Sans/Humanist', '100']).concat([['Weak', '', '/Sans/Humanist', '20']]);
  assert.deepEqual(pickFonts(families, tags).flatMap((g) => g.fonts.map((f) => f.family)), ['Kept']);
});

test('each font gets a fallback from its category', () => {
  assert.equal(fallbackOf(family('A', 1, { category: 'Monospace' })), 'monospace');
  assert.equal(fallbackOf(family('B', 1, { category: 'Handwriting' })), 'cursive');
  assert.equal(fallbackOf(family('C', 1, { category: 'Display', stroke: 'Slab Serif' })), 'serif');
  assert.equal(fallbackOf(family('D', 1, { category: 'Display', stroke: null })), 'sans-serif');
});

test('the committed font list has every group, and each font once', () => {
  const { groups } = JSON.parse(readFileSync(new URL('../demo/font-choices.json', import.meta.url)));
  const names = groups.flatMap((g) => g.fonts.map((f) => f.family));
  assert.equal(new Set(names).size, names.length);
  for (const label of ['Sans serif', 'Serif', 'Calligraphy', 'Monospace', 'Blackletter and pixel']) assert.ok(groups.some((g) => g.label === label), label);
});
