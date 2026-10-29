import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apcaContrast, colorAtLuminance, hslAtLuminance, hslToSrgb, inGamut, lightnessForLuminance, luminance, oklchToSrgb, parseHex, srgbToOklch, toHex, wcagContrast } from '../src/color.js';

const near = (actual, expected, tolerance, msg) => assert.ok(Math.abs(actual - expected) <= tolerance, `${msg}: ${actual} is not near ${expected}`);

test('hex colors round-trip', () => {
  assert.equal(toHex(parseHex('#1E66F5')), '#1e66f5');
  assert.equal(toHex(parseHex('#abc')), '#aabbcc');
  assert.throws(() => parseHex('blue'), /Not a hex color/);
});

test('OKLCH round-trips through sRGB', () => {
  for (const hex of ['#1e66f5', '#ff6b4a', '#2f9e44', '#777777', '#ffff00']) {
    assert.equal(toHex(oklchToSrgb(srgbToOklch(parseHex(hex)))), hex);
  }
});

test('WCAG contrast matches known values', () => {
  near(wcagContrast(parseHex('#000'), parseHex('#fff')), 21, 0.001, 'black and white');
  near(wcagContrast(parseHex('#767676'), parseHex('#fff')), 4.54, 0.01, '#767676 on white');
});

test('APCA contrast matches the reference values', () => {
  // Values from the APCA-W3 0.0.98G-4g test suite.
  near(apcaContrast(parseHex('#888888'), parseHex('#ffffff')), 63.056, 0.1, '#888 on #fff');
  near(apcaContrast(parseHex('#ffffff'), parseHex('#888888')), -68.541, 0.1, '#fff on #888');
  near(apcaContrast(parseHex('#000000'), parseHex('#aaaaaa')), 58.146, 0.1, '#000 on #aaa');
  near(apcaContrast(parseHex('#aaaaaa'), parseHex('#000000')), -56.241, 0.1, '#aaa on #000');
});

test('the lightness formula gives the target luminance', () => {
  for (const h of [0, 45, 110, 150, 200, 265, 320]) {
    for (const C of [0, 0.03, 0.08]) {
      for (const Y of [0.01, 0.05, 0.18, 0.5, 0.9]) {
        const rgb = oklchToSrgb([lightnessForLuminance(h, C, Y), C, h]);
        if (!inGamut(rgb)) continue;
        assert.ok(Math.abs(luminance(rgb) - Y) < 1e-6, `h ${h} C ${C} Y ${Y}`);
      }
    }
  }
  assert.ok(Math.abs(lightnessForLuminance(0, 0, 0.125) - 0.5) < 1e-9);
});

test('colorAtLuminance reduces chroma to stay in gamut', () => {
  const rgb = colorAtLuminance(265, 0.4, 0.05);
  assert.ok(inGamut(rgb));
  assert.ok(Math.abs(luminance(rgb) - 0.05) < 0.002);
});

test('the HSL solver matches a bisection to float precision', () => {
  const bisect = (h, sat, Y) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (luminance(hslToSrgb([h, sat, mid])) < Y) lo = mid;
      else hi = mid;
    }
    return luminance(hslToSrgb([h, sat, (lo + hi) / 2]));
  };
  for (const h of [0, 30, 60, 120, 200, 240, 300, 359]) {
    for (const sat of [0, 0.3, 0.7, 1]) {
      for (const Y of [0.001, 0.003, 0.02, 0.18, 0.5, 0.92, 0.999]) {
        const y = luminance(hslAtLuminance(h, sat, Y));
        assert.ok(Math.abs(y - Y) < 1e-12, `h ${h} s ${sat} Y ${Y}: ${y}`);
        assert.ok(Math.abs(y - bisect(h, sat, Y)) < 1e-12);
      }
    }
  }
});
