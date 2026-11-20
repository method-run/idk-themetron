import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motionFor, spring } from '../src/motion.js';

test('no animation has no motion at all, however playful', () => {
  const m = motionFor({ playfulness: 1, energy: 0.5 }, 'none');
  for (const v of Object.values(m.duration)) assert.equal(v, 0);
  for (const kind of ['pop', 'arrive']) for (const v of Object.values(m.spring[kind].duration)) assert.equal(v, 0);
  assert.equal(m.distance, 0);
  assert.equal(m.scale, 1);
  assert.equal(m.press, 1);
  assert.equal(m.shake, 0);
  assert.equal(m.stagger, 0);
  assert.equal(spring(0, 0).css, 'linear(0, 1)');
});

test('fade keeps the timing, but parts do not travel or grow', () => {
  const move = motionFor({ playfulness: 0.75, energy: 0.5 });
  const fade = motionFor({ playfulness: 0.75, energy: 0.5 }, 'fade');
  assert.deepEqual(fade.duration, move.duration);
  assert.equal(move.travel, 1);
  assert.equal(fade.travel, 0);
  assert.equal(fade.distance, 0);
  assert.equal(fade.scale, 1);
  assert.equal(fade.press, move.press);
});

test('more playful themes bounce more, and more energetic ones are quicker', () => {
  const bounce = [0, 0.25, 0.5, 0.75, 1].map((p) => motionFor({ playfulness: p, energy: 0.5 }).spring.bounce);
  assert.deepEqual([...bounce].sort((a, b) => a - b), bounce);
  assert.equal(bounce[0], 0, 'sober does not bounce');
  const md = [0, 0.5, 1].map((e) => motionFor({ playfulness: 0.5, energy: e }).duration.md);
  assert.ok(md[0] > md[1] && md[1] > md[2]);
});

test('bigger parts take longer, but much less than in proportion', () => {
  const { duration } = motionFor({ playfulness: 0.5, energy: 0.5 });
  assert.ok(duration.xs < duration.sm && duration.sm < duration.md && duration.md < duration.lg);
  assert.ok(duration.lg / duration.md < 2);
});
