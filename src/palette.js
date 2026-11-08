// Palettes with fixed-luminance grades, and the contrast checks that use them.
import { apcaContrast, colorAtLuminance, hslAtLuminance, luminance, parseHex, srgbToHsl, srgbToOklch, toHex, wcagContrast } from './color.js';

export const GRADES = Array.from({ length: 21 }, (_, i) => i * 5);

// Each grade has the same WCAG luminance in every palette. The scale is
// exponential in (Y + 0.05), so the contrast ratio between two grades
// depends only on their difference: 21 ** (difference / 100).
export function gradeLuminance(grade) {
  return 1.05 * 21 ** (-grade / 100) - 0.05;
}

export function gradeOfLuminance(y) {
  return -100 * Math.log((y + 0.05) / 1.05) / Math.log(21);
}

// Grades far from the key color get less chroma, so that tints and shades
// look calm, and near-gray key colors make near-gray palettes.
function chromaTaper(grade, keyGrade) {
  const reach = Math.max(keyGrade, 100 - keyGrade, 1);
  return 1 - 0.6 * (Math.abs(grade - keyGrade) / reach) ** 2;
}

// The color models that a ramp can keep its hue in. For each: the key color's hue
// and chroma (saturation for HSL), and the color at a target luminance.
export const COLOR_MODELS = {
  oklch: { label: 'OKLCH', keyOf: (rgb) => { const [, c, h] = srgbToOklch(rgb); return [h, c]; }, at: colorAtLuminance },
  hsl: { label: 'HSL', keyOf: (rgb) => { const [h, s] = srgbToHsl(rgb); return [h, s]; }, at: hslAtLuminance },
};

const paletteCache = new Map();

// A palette: one hex color for each grade, with the hue and chroma of the key color,
// kept in one color model. The grades have the same luminance in every model.
export function makePalette(keyHex, model = 'oklch') {
  const key = toHex(parseHex(keyHex));
  const cacheKey = `${key} ${model}`;
  if (paletteCache.has(cacheKey)) return paletteCache.get(cacheKey);
  const { keyOf, at } = COLOR_MODELS[model];
  const rgb = parseHex(key);
  const [hue, chroma] = keyOf(rgb);
  const steps = {};
  const keyGrade = gradeOfLuminance(luminance(rgb));
  for (const grade of GRADES) {
    steps[grade] = toHex(at(hue, chroma * chromaTaper(grade, keyGrade), gradeLuminance(grade)));
  }
  const palette = { key, model, keyGrade: round1(keyGrade), hue: round1(hue), chroma: round3(chroma), steps };
  paletteCache.set(cacheKey, palette);
  return palette;
}

// The minimum contrast for each purpose. "text" is body text, "large" is
// large or bold text, and "ui" is borders, icons, and other parts of controls.
export const THRESHOLDS = {
  wcag: {
    standard: { text: 4.5, large: 3, ui: 3 },
    enhanced: { text: 7, large: 4.5, ui: 3 },
  },
  apca: {
    standard: { text: 75, large: 60, ui: 45 },
    enhanced: { text: 90, large: 75, ui: 60 },
  },
};

export function measure(fgHex, bgHex) {
  const fg = parseHex(fgHex);
  const bg = parseHex(bgHex);
  return { wcag: round2(wcagContrast(fg, bg)), apca: round1(apcaContrast(fg, bg)) };
}

// Makes a test function for one contrast setting: (fg, bg, purpose) => boolean.
// APCA keeps the WCAG 2 minimums as a floor. For text, APCA is always the stricter
// one, but for some light pairs its control threshold (Lc 45) passes below 3:1.
export function contrastTest({ method = 'wcag', level = 'standard' } = {}) {
  const methods = method === 'apca' ? ['wcag', 'apca'] : [method];
  for (const m of methods) if (!THRESHOLDS[m]?.[level]) throw new Error(`Unknown contrast setting: ${method} ${level}`);
  return (fgHex, bgHex, purpose) => {
    const { wcag, apca } = measure(fgHex, bgHex);
    return methods.every((m) => (m === 'wcag' ? wcag >= THRESHOLDS.wcag[level][purpose] : Math.abs(apca) >= THRESHOLDS.apca[level][purpose]));
  };
}

// The "magic numbers": for each purpose, the smallest grade difference that
// passes for every pair of grades, in any two palettes, in both directions.
export function gradeGaps(palettes, test) {
  const gaps = {};
  const diffs = [...new Set(GRADES.flatMap((a) => GRADES.map((b) => b - a)).filter((d) => d > 0))].sort((x, y) => x - y);
  for (const purpose of ['text', 'large', 'ui']) {
    let worstFail = 0;
    for (const p of palettes) {
      for (const q of palettes) {
        for (const a of GRADES) {
          for (const b of GRADES) {
            const d = b - a;
            if (d <= worstFail) continue;
            if (!test(p.steps[a], q.steps[b], purpose) || !test(q.steps[b], p.steps[a], purpose)) worstFail = d;
          }
        }
      }
    }
    gaps[purpose] = diffs.find((d) => d > worstFail) ?? null;
  }
  return gaps;
}

const round1 = (n) => Math.round(n * 10) / 10 + 0; // + 0 turns -0 into 0
const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;
