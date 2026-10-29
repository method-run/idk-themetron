// Self-check: compare hslLightnessForLuminance against a 60-step bisection on L in [0, 1]
// (bisection uses the literal CSS Color 4 hsl() -> sRGB algorithm and the sRGB decode).
// Usage: node selfcheck.mjs [randomCount=400000] [seed=1]
import {
  hslLightnessForLuminance,
  hslLightnessForLuminanceDetailed,
  hslRelativeLuminance,
  hslToSrgb,
  srgbToLinear,
} from '../../../src/hsl.js';

const N = Number(process.argv[2] || 400000);
let seed = Number(process.argv[3] || 1) >>> 0;
const rand = () => {
  // xorshift32
  seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
  return seed / 4294967296;
};

// Independent reference (does not share code with the solver). Hue normalisation follows the
// CSS Color 4 sample code exactly (hue % 360, then += 360 if negative).
const W = [0.2126, 0.7152, 0.0722];
function refLum(h, s, l) {
  h %= 360;
  if (h < 0) h += 360;
  const a = s * Math.min(l, 1 - l);
  let y = 0;
  for (const [n, w] of [[0, W[0]], [8, W[1]], [4, W[2]]]) {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    y += w * (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  }
  return y;
}
function bisect(h, s, Y, steps = 60) {
  let lo = 0, hi = 1;
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2;
    if (refLum(h, s, mid) < Y) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------------- case generation ----------------
const cases = [];
const gradeY = (g) => 1.05 * Math.pow(21, -g / 100) - 0.05;
function pickH() {
  const r = rand();
  if (r < 0.08) return 60 * Math.floor(rand() * 6);                 // exact sector boundaries
  if (r < 0.12) return 60 * Math.floor(rand() * 6) + (rand() - 0.5) * 1e-9;
  if (r < 0.14) return rand() * 3600 - 1800;                         // out-of-range hues
  return rand() * 360;
}
function pickS() {
  const r = rand();
  if (r < 0.10) return 1;
  if (r < 0.12) return [1e-12, 1e-6, 1 - 1e-9, 0.9191, 0.919][Math.floor(rand() * 5)];
  if (r < 0.14) return 0;
  if (r < 0.30) return 0.9 + 0.1 * rand();                             // the toe-crossing-heavy region
  return rand();
}
function pickY(h, s) {
  const r = rand();
  if (r < 0.35) return rand();
  if (r < 0.55) return rand() ** 2;
  if (r < 0.65) return rand() ** 6;                                    // very dark
  if (r < 0.80) return gradeY(rand() * 100);                           // palette grades
  if (r < 0.87) { const L = 0.5 + (rand() - 0.5) * 1e-6; return refLum(h, s, L); }  // around L = 1/2
  if (r < 0.95) {                                                      // around a toe crossing
    const m = hslToSrgb(h, 1, 0.5).map((c) => 1 - 2 * c);              // hue factors m_i (s = 1 trick)
    const i = Math.floor(rand() * 3), alpha = 1 - s * m[i], beta = 1 + s * m[i];
    const xs = [0.04045 / alpha, 1 - 0.95955 / beta].filter((x) => x > 0 && x < 1);
    if (!xs.length) return rand();
    const x = xs[Math.floor(rand() * xs.length)] * (1 + (rand() - 0.5) * 1e-9);
    return refLum(h, s, x);
  }
  return 1 - rand() * 1e-6;                                            // near white
}
for (let k = 0; k < N; k++) { const h = pickH(), s = pickS(); cases.push([h, s, pickY(h, s)]); }
// structured grid incl. grades
for (let hi = 0; hi < 72; hi++) for (const s of [0, 0.05, 0.25, 0.5, 0.75, 0.92, 0.99, 1]) for (let g = 0; g <= 100; g += 2.5) cases.push([hi * 5, s, gradeY(g)]);

// ---------------- accuracy ----------------
let maxDYours = 0, maxDYBis = 0, maxDL = 0, maxDYpair = 0, maxCR = 0, worstL = null, worstY = null;
const itHist = {}, evHist = {}, powHist = {}, methods = {};
for (const [h, s, Y] of cases) {
  const r = hslLightnessForLuminanceDetailed(h, s, Y);
  const Lb = bisect(h, s, Y);
  const L = r.L;
  if (!(L >= 0 && L <= 1)) throw new Error(`out of range L=${L} for ${h},${s},${Y}`);
  const dY = Math.abs(refLum(h, s, L) - Y), dYb = Math.abs(refLum(h, s, Lb) - Y);
  const dL = Math.abs(L - Lb);
  if (dY > maxDYours) { maxDYours = dY; worstY = [h, s, Y, L, Lb, r.method]; }
  maxDYBis = Math.max(maxDYBis, dYb);
  if (dL > maxDL) { maxDL = dL; worstL = [h, s, Y, L, Lb, r.method]; }
  maxDYpair = Math.max(maxDYpair, Math.abs(refLum(h, s, L) - refLum(h, s, Lb)));
  maxCR = Math.max(maxCR, Math.abs((refLum(h, s, L) + 0.05) / (Y + 0.05) - 1));
  itHist[r.iterations] = (itHist[r.iterations] || 0) + 1;
  evHist[r.evaluations] = (evHist[r.evaluations] || 0) + 1;
  powHist[r.pows] = (powHist[r.pows] || 0) + 1;
  methods[r.method] = (methods[r.method] || 0) + 1;
}
const fmt = (x) => x.toExponential(3);
console.log(`cases: ${cases.length} (${N} random + ${cases.length - N} grid)`);
console.log(`max |Y(L_ours) - Y|        = ${fmt(maxDYours)}   (worst: h=${worstY[0]}, s=${worstY[1]}, Y=${worstY[2]}, ${worstY[5]})`);
console.log(`max |Y(L_bisect) - Y|      = ${fmt(maxDYBis)}   (60-step bisection, for comparison)`);
console.log(`max |L_ours - L_bisect|    = ${fmt(maxDL)}   (worst: h=${worstL[0]}, s=${worstL[1]}, Y=${worstL[2]}, L=${worstL[3]}, Lb=${worstL[4]}, ${worstL[5]})`);
console.log(`max |Y(L_ours)-Y(L_bisect)| = ${fmt(maxDYpair)}  (luminance difference between the two answers)`);
console.log(`max |contrast ratio error| = ${fmt(maxCR)}   (relative, (Y(L)+0.05)/(Y+0.05) - 1)`);
console.log('Halley iterations histogram:', JSON.stringify(itHist));
console.log('Y-evaluations histogram (each <= 3 pow calls):', JSON.stringify(evHist));
console.log('Math.pow calls per solve histogram:', JSON.stringify(powHist), ' (bisection: up to 180)');
console.log('method counts:', JSON.stringify(methods));

// ---------------- targets inside the decode-curve jump at a toe crossing ----------------
// sRGB decode jumps up by 2.3e-9 at c = 0.04045, so Y(L) jumps by w_i * 2.3e-9 where channel i
// crosses. For a target inside the jump the generalised inverse is the crossing itself.
{
  let maxGapDL = 0, n = 0, hits = 0;
  for (let k = 0; k < 20000; k++) {
    const h = rand() * 360, s = 0.05 + 0.95 * rand();
    const m = hslToSrgb(h, 1, 0.5).map((c) => 1 - 2 * c); // hue factors m_i
    const i = Math.floor(rand() * 3), alpha = 1 - s * m[i], beta = 1 + s * m[i];
    const xs = [0.04045 / alpha, 1 - 0.95955 / beta].filter((x) => (x > 0 && x < 0.5 && x === 0.04045 / alpha) || (x > 0.5 && x < 1));
    if (!xs.length) continue;
    const x = xs[0];
    // bracket the jump numerically with the reference: largest L with Y < jump-top
    const yBelow = refLum(h, s, x * (1 - 1e-12)), yAbove = refLum(h, s, x * (1 + 1e-12));
    if (!(yAbove - yBelow > 1e-10)) continue;
    const Y = 0.5 * (yBelow + yAbove); // middle of the jump
    n++;
    const r = hslLightnessForLuminanceDetailed(h, s, Y);
    if (r.method.startsWith('toe crossing')) hits++;
    maxGapDL = Math.max(maxGapDL, Math.abs(r.L - bisect(h, s, Y)));
  }
  console.log(`jump-gap targets: ${n}, solved as the crossing point: ${hits}, max |L_ours - L_bisect| = ${fmt(maxGapDL)}`);
}

// ---------------- palette grades: Y_g = 1.05 * 21^(-g/100) - 0.05 ----------------
{
  let maxDY = 0, maxDL = 0, maxCRg = 0, count = 0;
  for (let hDeg = 0; hDeg < 360; hDeg += 3) for (let s100 = 0; s100 <= 100; s100 += 5) for (let g = 0; g <= 100; g++) {
    const s = s100 / 100, Y = gradeY(g), L = hslLightnessForLuminance(hDeg, s, Y), Lb = bisect(hDeg, s, Y);
    maxDY = Math.max(maxDY, Math.abs(refLum(hDeg, s, L) - Y)); maxDL = Math.max(maxDL, Math.abs(L - Lb));
    maxCRg = Math.max(maxCRg, Math.abs(1.05 / (refLum(hDeg, s, L) + 0.05) / Math.pow(21, g / 100) - 1)); count++;
  }
  console.log(`grades (${count} = 120 hues x 21 saturations x 101 grades): max |dY| = ${fmt(maxDY)}, max |L_ours - L_bisect| = ${fmt(maxDL)}, max relative error of contrast vs white = ${fmt(maxCRg)}`);
}

// ---------------- speed ----------------
const T = cases.slice(0, Math.min(cases.length, 200000));
let sink = 0;
const time = (fn) => { const t0 = process.hrtime.bigint(); for (const [h, s, Y] of T) sink += fn(h, s, Y); return Number(process.hrtime.bigint() - t0) / T.length; };
time(hslLightnessForLuminance); time((h, s, Y) => bisect(h, s, Y)); // warm-up
const tOurs = time(hslLightnessForLuminance), tBis = time((h, s, Y) => bisect(h, s, Y));
console.log(`speed: ours ${tOurs.toFixed(0)} ns/call, 60-step bisection ${tBis.toFixed(0)} ns/call, ratio ${(tBis / tOurs).toFixed(1)}x  (sink ${sink > 0})`);
