// Color conversion and contrast math. Colors are [r, g, b] arrays in sRGB, 0 to 1.
import { hslLightnessForLuminance } from './hsl.js';

export function parseHex(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) throw new Error(`Not a hex color: ${hex}`);
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

export function isHex(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value).trim());
}

export function toHex(rgb) {
  return '#' + rgb.map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0')).join('');
}

const clamp01 = (c) => Math.min(1, Math.max(0, c));
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

// OKLab and OKLCH, from Björn Ottosson's reference matrices.
export function srgbToOklch(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const C = Math.hypot(A, B);
  const h = C < 1e-6 ? 0 : (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
  return [L, C, h];
}

// Returns sRGB that can be out of gamut. Use inGamut to test it.
export function oklchToSrgb([L, C, h]) {
  const A = C * Math.cos(h * Math.PI / 180);
  const B = C * Math.sin(h * Math.PI / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map((c) => Math.sign(c) * toGamma(Math.abs(c)));
}

// Two sRGB colors mixed in OKLCH, t of the way from a to b, as CSS color-mix(in oklch) does.
// Lightness and chroma move evenly, and hue takes the shorter way round, so a gray to a color
// keeps that color's hue all the way, with no muddy middle. Chroma is reduced to fit sRGB.
export function mixOklch(a, b, t) {
  const [x, y] = [srgbToOklch(a), srgbToOklch(b)];
  // A gray has no hue: it takes the other color's.
  const hx = x[1] < 1e-4 ? y[2] : x[2];
  const hy = y[1] < 1e-4 ? x[2] : y[2];
  const dh = ((hy - hx + 540) % 360) - 180;
  const L = x[0] + (y[0] - x[0]) * t;
  let C = x[1] + (y[1] - x[1]) * t;
  const h = (hx + dh * t + 360) % 360;
  let rgb = oklchToSrgb([L, C, h]);
  while (!inGamut(rgb) && C > 1e-4) { C *= 0.95; rgb = oklchToSrgb([L, C, h]); }
  return rgb.map((c) => Math.min(1, Math.max(0, c)));
}

export function inGamut(rgb, eps = 1e-5) {
  return rgb.every((c) => c >= -eps && c <= 1 + eps);
}

// WCAG 2 relative luminance and contrast ratio.
export function luminance(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function wcagContrast(a, b) {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// APCA (APCA-W3 0.0.98G-4g). Returns Lc: positive for dark text on a light
// background, negative for light text on a dark background.
export function apcaContrast(text, bg) {
  const screenY = ([r, g, b]) => {
    const y = 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.0721750 * b ** 2.4;
    return y < 0.022 ? y + (0.022 - y) ** 1.414 : y;
  };
  const yt = screenY(text.map(clamp01));
  const yb = screenY(bg.map(clamp01));
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) {
    const sapc = (yb ** 0.56 - yt ** 0.57) * 1.14;
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
  }
  const sapc = (yb ** 0.65 - yt ** 0.62) * 1.14;
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100;
}

// The highest chroma, up to cap, that stays in the sRGB gamut at this lightness and hue.
export function maxChroma(L, h, cap = 0.4) {
  if (inGamut(oklchToSrgb([L, cap, h]))) return cap;
  let lo = 0;
  let hi = cap;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToSrgb([L, mid, h]))) lo = mid;
    else hi = mid;
  }
  return lo;
}

// How much each OKLab cone (l, m, s, after cubing) adds to WCAG luminance:
// the WCAG weights times the cone-to-linear-sRGB matrix. They sum to 1.
const CONE_Y = [-0.0407745410, 1.1124921850, -0.0717176440];

// The OKLab lightness L at which a color with this hue and chroma has WCAG
// luminance Y. In OKLab each cone is (L + k)³, where k depends only on hue
// and chroma, so Y = Σ wᵢ (L + kᵢ)³ is a cubic in L. Cardano solves it.
// For grays every k is 0, and this is L = ∛Y.
// The result is exact while the color is in the sRGB gamut.
export function lightnessForLuminance(h, C, Y) {
  const a = C * Math.cos(h * Math.PI / 180);
  const b = C * Math.sin(h * Math.PI / 180);
  const k = [
    0.3963377774 * a + 0.2158037573 * b,
    -0.1055613458 * a - 0.0638541728 * b,
    -0.0894841775 * a - 1.2914855480 * b,
  ];
  const sum = (f) => CONE_Y.reduce((acc, w, i) => acc + w * f(k[i]), 0);
  // L³ + 3P L² + 3Q L + R = Y. Put L = t − P to get t³ + p t + q = 0.
  const P = sum((x) => x);
  const Q = sum((x) => x * x);
  const R = sum((x) => x * x * x);
  const p = 3 * (Q - P * P);
  const q = R - 3 * P * Q + 2 * P ** 3 - Y;
  const disc = (q / 2) ** 2 + (p / 3) ** 3;
  if (disc >= 0) {
    const s = Math.sqrt(disc);
    return Math.cbrt(-q / 2 + s) + Math.cbrt(-q / 2 - s) - P;
  }
  // Three real roots. Take the one nearest the gray answer.
  const r = 2 * Math.sqrt(-p / 3);
  const phi = Math.acos((3 * q) / (p * r));
  const roots = [0, 1, 2].map((j) => r * Math.cos(phi / 3 - (2 * Math.PI * j) / 3) - P);
  const gray = Math.cbrt(Y);
  return roots.reduce((best, x) => (Math.abs(x - gray) < Math.abs(best - gray) ? x : best));
}

// The color with this hue, and as much of this chroma as the gamut allows,
// whose WCAG luminance is targetY. Lightness has a closed form. Only the
// gamut limit on chroma needs a short search.
export function colorAtLuminance(h, chroma, targetY) {
  if (targetY >= 1) return [1, 1, 1];
  if (targetY <= 0) return [0, 0, 0];
  const at = (C) => oklchToSrgb([lightnessForLuminance(h, C, targetY), C, h]);
  let rgb = at(chroma);
  if (inGamut(rgb)) return rgb.map(clamp01);
  let lo = 0;
  let hi = chroma;
  rgb = at(0);
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const test = at(mid);
    if (inGamut(test)) [lo, rgb] = [mid, test];
    else hi = mid;
  }
  return rgb.map(clamp01);
}

// ---- Other color models for ramps. Each one keeps its hue, and finds the color
// with a target WCAG luminance at as much of the given chroma as the gamut allows.

// HSL, as in CSS. Hue in degrees, saturation and lightness from 0 to 1.
export function srgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-9) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, Math.min(1, s), l];
}

export function hslToSrgb([h, s, l]) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)));
}

// HSL has no closed form for the lightness at a target luminance (the proof is in
// docs/research/hsl-lightness.md). src/hsl.js finds it exactly, with one or two Halley
// steps. HSL colors are always in the sRGB gamut.
export function hslAtLuminance(h, s, targetY) {
  if (targetY >= 1) return [1, 1, 1];
  if (targetY <= 0) return [0, 0, 0];
  return hslToSrgb([h, s, hslLightnessForLuminance(h, s, targetY)]);
}
