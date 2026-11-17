// Palettes with fixed-luminance grades, and the contrast checks that use them.
import { apcaContrast, colorAtLuminance, hslAtLuminance, okhslAtLuminance, srgbToOkhsl, luminance, parseHex, srgbToHsl, srgbToOklch, toHex, wcagContrast } from './color.js';

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
// and chroma (saturation for HSL and OKHSL), and the color at a target luminance.
// OKHSL has no taper: every grade keeps the key color's share of the gamut, which already
// shrinks toward white and black.
export const COLOR_MODELS = {
  oklch: { label: 'OKLCH', keyOf: (rgb) => { const [, c, h] = srgbToOklch(rgb); return [h, c]; }, at: colorAtLuminance },
  hsl: { label: 'HSL', keyOf: (rgb) => { const [h, s] = srgbToHsl(rgb); return [h, s]; }, at: hslAtLuminance },
  okhsl: { label: 'OKHSL', taper: false, keyOf: srgbToOkhsl, at: okhslAtLuminance },
};

const paletteCache = new Map();

// A palette: one hex color for each grade, with the hue and chroma of the key color,
// kept in one color model. The grades have the same luminance in every model.
export function makePalette(keyHex, model = 'oklch') {
  const key = toHex(parseHex(keyHex));
  const cacheKey = `${key} ${model}`;
  if (paletteCache.has(cacheKey)) return paletteCache.get(cacheKey);
  const { keyOf, at, taper = true } = COLOR_MODELS[model];
  const rgb = parseHex(key);
  const [hue, chroma] = keyOf(rgb);
  const steps = {};
  const keyGrade = gradeOfLuminance(luminance(rgb));
  for (const grade of GRADES) {
    steps[grade] = toHex(at(hue, chroma * (taper ? chromaTaper(grade, keyGrade) : 1), gradeLuminance(grade)));
  }
  const palette = { key, model, keyGrade: round1(keyGrade), hue: round1(hue), chroma: round3(chroma), steps };
  paletteCache.set(cacheKey, palette);
  return palette;
}

// The minimum contrast for each purpose. "text" is body text, "large" is
// large or bold text, and "ui" is borders, icons, and other parts of controls.
// A purpose can also be the text itself, { size, weight }, in px and CSS weight.
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

// APCA's font lookup table: for each Lc, the smallest font size in px for each weight from
// 100 to 900. From fontLookupAPCA in apca-w3 0.1.9 (table "Public Beta 0.1.7 (G)", May 28
// 2022). Rows below Lc 30 are for non-text only, so they are left out. Infinity is the
// table's 777: no text at this weight.
const APCA_FONTS = [
  [30, Infinity, Infinity, 120, 108, 108, 96, 72, 72, 72],
  [35, Infinity, 120, 108, 96, 72, 60, 48, 48, 48],
  [40, 120, 108, 96, 60, 48, 42, 32, 32, 32],
  [45, 108, 96, 72, 42, 32, 28, 24, 24, 24],
  [50, 96, 72, 60, 32, 28, 24, 21, 21, 21],
  [55, 80, 60, 48, 28, 24, 21, 18, 18, 18],
  [60, 72, 48, 42, 24, 21, 18, 16, 16, 18],
  [65, 68, 46, 32, 21.75, 19, 17, 15, 16, 18],
  [70, 64, 44, 28, 19.5, 18, 16, 14.5, 16, 18],
  [75, 60, 42, 24, 18, 16, 15, 14, 16, 18],
  [80, 56, 38.25, 23, 17.25, 15.81, 14.81, 14, 16, 18],
  [85, 52, 34.5, 22, 16.5, 15.625, 14.625, 14, 16, 18],
  [90, 48, 32, 21, 16, 15.5, 14.5, 14, 16, 18],
  [95, 45, 28, 19.5, 15.5, 15, 14, 13.5, 16, 18],
  [100, 42, 26.5, 18.5, 15, 14.5, 13.5, 13, 16, 18],
  [105, 39, 25, 18, 14.5, 14, 13, 12, 16, 18],
  [110, 36, 24, 18, 14, 13, 12, 11, 16, 18],
  [115, 34.5, 22.5, 17.25, 12.5, 11.875, 11.25, 10.625, 14.5, 16.5],
  [120, 33, 21, 16.5, 11, 10.75, 10.5, 10.25, 13, 15],
  [125, 32, 20, 16, 10, 10, 10, 10, 12, 14],
];

// The smallest Lc in the table for text of this size and weight: the first row where the
// size is large enough. A weight between two columns uses the lighter one, and the rows are
// 5 Lc apart, so the result is never less than APCA's interpolated value. Infinity where no
// row fits.
export function apcaMinLc(size, weight) {
  const col = Math.min(9, Math.max(1, Math.floor(weight / 100)));
  return APCA_FONTS.find((row) => size >= row[col])?.[0] ?? Infinity;
}

// The minimum contrast for one method, level, and purpose. For text { size, weight }:
// WCAG 2 uses its large-text rule (24 px or more; the bold rule is not used). APCA uses the
// font table, plus the step from standard to enhanced for the enhanced level. It is never more
// than the fixed body-text minimum: the table asks Lc 90 to 100 for 15 to 16 px body text,
// which no grade reaches on most canvases.
export function minContrast(method, level, purpose) {
  const t = THRESHOLDS[method][level];
  if (typeof purpose === 'string') return t[purpose];
  if (method === 'wcag') return t[purpose.size >= 24 ? 'large' : 'text'];
  const step = t.text - THRESHOLDS.apca.standard.text;
  return Math.min(t.text, apcaMinLc(purpose.size, purpose.weight) + step);
}

// A short name for a purpose, for the audit: "text", or "text 18px/700".
export const purposeName = (purpose) => (typeof purpose === 'string' ? purpose : `text ${purpose.size}px/${purpose.weight}`);

export function measure(fgHex, bgHex) {
  const fg = parseHex(fgHex);
  const bg = parseHex(bgHex);
  return { wcag: round2(wcagContrast(fg, bg)), apca: round1(apcaContrast(fg, bg)) };
}

// Makes a test function for one contrast setting: (fg, bg, purpose) => boolean.
// APCA keeps the WCAG 2 minimums as a floor. For text, APCA is always the stricter
// one, but for some light pairs its control threshold (Lc 45) passes below 3:1, and so can
// the font table's lower Lc for large text.
export function contrastTest({ method = 'wcag', level = 'standard' } = {}) {
  const methods = method === 'apca' ? ['wcag', 'apca'] : [method];
  for (const m of methods) if (!THRESHOLDS[m]?.[level]) throw new Error(`Unknown contrast setting: ${method} ${level}`);
  return (fgHex, bgHex, purpose) => {
    const { wcag, apca } = measure(fgHex, bgHex);
    return methods.every((m) => (m === 'wcag' ? wcag : Math.abs(apca)) >= minContrast(m, level, purpose));
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
