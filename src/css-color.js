// Read a color in a CSS format: hex, a named color, rgb(), hsl(), oklch(), or oklab().
// The engine keeps hex, so each color becomes sRGB here, as [r, g, b] from 0 to 1.
import { hslToSrgb, inGamut, maxChroma, oklchToSrgb, parseHex } from './color.js';

// The 148 CSS named colors (CSS Color 4), as name and hex pairs.
export const COLOR_NAMES = Object.fromEntries(`
  aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc
  bisque ffe4c4 black 000000 blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a
  burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 chocolate d2691e coral ff7f50 cornflowerblue 6495ed
  cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b
  darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b darkolivegreen 556b2f
  darkorange ff8c00 darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f darkslateblue 483d8b
  darkslategray 2f4f4f darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 deepskyblue 00bfff
  dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222 floralwhite fffaf0 forestgreen 228b22
  fuchsia ff00ff gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080
  green 008000 greenyellow adff2f grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c
  indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00
  lemonchiffon fffacd lightblue add8e6 lightcoral f08080 lightcyan e0ffff lightgoldenrodyellow fafad2 lightgray d3d3d3
  lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a lightseagreen 20b2aa lightskyblue 87cefa
  lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0 lime 00ff00 limegreen 32cd32
  linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3
  mediumpurple 9370db mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc mediumvioletred c71585
  midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080
  oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6
  palegoldenrod eee8aa palegreen 98fb98 paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9
  peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6 purple 800080 rebeccapurple 663399
  red ff0000 rosybrown bc8f8f royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460
  seagreen 2e8b57 seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd
  slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c
  teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 violet ee82ee wheat f5deb3
  white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32
`.trim().split(/\s+/).reduce((pairs, word, i, all) => (i % 2 ? pairs : [...pairs, [word, '#' + all[i + 1]]]), []));

export const COLOR_FORMATS = 'a hex color such as #1e66f5, a CSS color name such as rebeccapurple, or rgb(), hsl(), oklch(), or oklab()';

// A number with an optional unit, or "none".
const PART = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|deg|grad|rad|turn)?$/i;
const TURN = { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 };

// sRGB from a CSS color. Throws an Error that says what is wrong and what to use instead.
// A color with transparency is an error: a theme's key colors must be opaque.
// An oklch() or oklab() color outside sRGB keeps its lightness and hue and loses chroma until
// it fits, as in CSS gamut mapping. Other values out of range are clamped, as CSS does.
export function parseColor(value) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const bad = (why = `is not a color. Use ${COLOR_FORMATS}.`) => new Error(`${JSON.stringify(value)} ${why}`);
  const opaque = 'has transparency. Use an opaque color: themes need solid key colors.';
  if (!text) throw bad();
  if (text === 'transparent') throw bad(opaque);
  if (text === 'currentcolor') throw bad(`depends on the page. Use ${COLOR_FORMATS}.`);
  if (COLOR_NAMES[text]) return parseHex(COLOR_NAMES[text]);
  if (text.startsWith('#')) {
    const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text);
    if (!m) throw bad();
    const h = m[1];
    const alpha = h.length === 4 ? h[3] === 'f' : h.length === 8 ? h.slice(6) === 'ff' : true;
    if (!alpha) throw bad(opaque);
    return parseHex(h.length === 4 ? h.slice(0, 3) : h.slice(0, 6));
  }
  const fn = /^([a-z]+)\((.*)\)$/s.exec(text);
  if (!fn || !READ[fn[1]]) throw bad();
  const [name, body] = [fn[1], fn[2].trim()];
  const legacy = body.includes(',');
  let parts;
  let alpha;
  if (legacy) {
    // The comma syntax: only rgb() and hsl() have it, and it has no "none".
    if (!/^(rgba?|hsla?)$/.test(name)) throw bad(`uses commas, which ${name}() does not allow. Separate the values with spaces.`);
    parts = body.split(',').map((p) => p.trim());
    if (parts.length === 4) alpha = parts.pop();
    if (parts.includes('none') || alpha === 'none') throw bad(`uses "none" with commas. Separate the values with spaces to use "none".`);
  } else {
    const [main, extra, ...more] = body.split('/');
    if (more.length) throw bad();
    parts = main.trim().split(/\s+/);
    if (extra !== undefined) alpha = extra.trim();
  }
  if (parts.length !== 3) throw bad(`needs three values in ${name}().`);
  const read = parts.map((p) => readPart(p));
  if (read.some((p) => !p)) throw bad();
  if (alpha !== undefined) {
    const a = readPart(alpha);
    if (!a || (a.unit && a.unit !== '%')) throw bad();
    // "none" as alpha shows as 0, so it is transparent too.
    if ((a.unit === '%' ? a.n / 100 : a.n) < 1) throw bad(opaque);
  }
  const rgb = READ[name](read, legacy);
  if (!rgb) throw bad(`has a value of the wrong kind for ${name}(). See the Inputs spec.`);
  return rgb;
}

export function isColor(value) {
  try { parseColor(value); return true; } catch { return false; }
}

function readPart(text) {
  if (text === 'none') return { n: 0, unit: '', none: true };
  const m = PART.exec(text);
  return m ? { n: Number(m[1]), unit: (m[2] ?? '').toLowerCase() } : null;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const hue = (p) => (p.unit === '%' ? null : ((p.n * (TURN[p.unit] ?? 1)) % 360 + 360) % 360);
// A number, or a percentage of `full`. No angles.
const amount = (p, full) => (p.unit === '%' ? (p.n / 100) * full : p.unit ? null : p.n);

function rgb(parts, legacy) {
  // The comma syntax needs all numbers or all percentages.
  if (legacy && new Set(parts.map((p) => p.unit)).size > 1) return null;
  const c = parts.map((p) => amount(p, 255));
  return c.includes(null) ? null : c.map((x) => clamp(x / 255, 0, 1));
}

function hsl([h, s, l], legacy) {
  // The comma syntax needs percentages for saturation and lightness.
  if (legacy && (s.unit !== '%' || l.unit !== '%')) return null;
  const v = [hue(h), amount(s, 100), amount(l, 100)];
  return v.includes(null) ? null : hslToSrgb([v[0], clamp(v[1] / 100, 0, 1), clamp(v[2] / 100, 0, 1)]);
}

function oklch([l, c, h]) {
  const v = [amount(l, 1), amount(c, 0.4), hue(h)];
  return v.includes(null) ? null : fitOklch(v[0], Math.max(0, v[1]), v[2]);
}

function oklab([l, a, b]) {
  const v = [amount(l, 1), amount(a, 0.4), amount(b, 0.4)];
  if (v.includes(null)) return null;
  return fitOklch(v[0], Math.hypot(v[1], v[2]), (Math.atan2(v[2], v[1]) * 180 / Math.PI + 360) % 360);
}

// Into sRGB: lightness clamps to 0 to 1, and chroma drops until the color fits.
function fitOklch(L, C, h) {
  if (L >= 1) return [1, 1, 1];
  if (L <= 0) return [0, 0, 0];
  let rgb = oklchToSrgb([L, C, h]);
  if (!inGamut(rgb)) rgb = oklchToSrgb([L, maxChroma(L, h, C), h]);
  return rgb.map((x) => clamp(x, 0, 1));
}

const READ = { rgb, rgba: rgb, hsl, hsla: hsl, oklch, oklab };
