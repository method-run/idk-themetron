import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LOOKS, lookClass, lookFiles, parseLooks, lookInSelector, splitList, withLooks } from '../src/looks.js';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('the files made from looks.css match it. Run npm run looks after a change.', async () => {
  const css = await read('components/looks.css');
  for (const [file, text] of Object.entries(lookFiles(css))) {
    assert.equal(await read(file), text, `${file} is out of date. Run npm run looks.`);
  }
});

test('LOOKS lists every look in looks.css, and nothing else', async () => {
  const { looks } = parseLooks(await read('components/looks.css'));
  assert.deepEqual(Object.keys(looks).sort(), Object.keys(LOOKS).sort());
});

test('each look names components that are in components.css, and has an example that uses it', async () => {
  const [components, looks] = await Promise.all([read('components/components.css'), read('components/looks.css')]);
  const all = withLooks(components, looks);
  for (const [name, look] of Object.entries(LOOKS)) {
    assert.ok(look.example.includes(lookClass(name)), `the example of ${name} uses ${lookClass(name)}`);
    for (const c of look.components) assert.ok(all.includes(`.${c}`), `${c} is in components.css or looks.css`);
  }
});

test('components.css imports looks.css, and withLooks puts it in place', async () => {
  const [components, looks] = await Promise.all([read('components/components.css'), read('components/looks.css')]);
  assert.ok(components.includes('@import "./looks.css";'));
  const one = withLooks(components, looks);
  assert.ok(!one.includes('@import "./looks.css"'));
  assert.ok(one.includes('.tm-look-fill'));
});

test('a selector becomes relative to its look', () => {
  assert.deepEqual(lookInSelector('.tm-look-fill:hover'), { name: 'fill', nested: '&:hover' });
  assert.deepEqual(lookInSelector('.tm-look-gradient-text'), { name: 'gradient-text', nested: '&' });
  assert.deepEqual(lookInSelector('.tm-look-fill.tm-invert'), { name: 'fill', nested: '&.tm-invert' });
  assert.deepEqual(lookInSelector(':is(.tm-look-tint, .tm-button--soft) > :is(span, .tm-icon)'), { name: 'tint', nested: '& > :is(span, .tm-icon)' });
  assert.deepEqual(lookInSelector(':where(.tm-over-media) :is(.tm-look-gradient-text, .tm-link)'), { name: 'gradient-text', nested: ':where(.tm-over-media) &' });
  assert.equal(lookInSelector('.tm-button--soft'), null);
  assert.deepEqual(lookInSelector('.tm-enter-pop:is([hidden], dialog:not([open]))'), { name: 'enter-pop', nested: '&:is([hidden], dialog:not([open]))' });
  assert.equal(lookClass('enter-pop'), 'tm-enter-pop');
  assert.equal(lookClass('fill'), 'tm-look-fill');
  assert.deepEqual(splitList(':is(a, b), c'), [':is(a, b)', 'c']);
});

test('each form has every look, and the shared rules that the looks need', async () => {
  const files = lookFiles(await read('components/looks.css'));
  for (const name of Object.keys(LOOKS)) {
    assert.ok(files['components/_looks.scss'].includes(`@mixin ${lookClass(name).slice(3)} {`), `mixin for ${name}`);
    assert.ok(files['components/looks.tailwind.css'].includes(`@utility ${lookClass(name)} {`), `utility for ${name}`);
  }
  for (const text of Object.values(files)) {
    assert.ok(text.includes('@property --_paint-from'));
    assert.ok(text.includes('.tm-invert { --_halo-fill-on: 0;'));
    assert.ok(!/tm-(button|card|input|badge|pop|toast)\b/.test(text), 'the forms name no components');
  }
});
