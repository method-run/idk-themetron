// Numerical companion to the proofs:
//  (1) slope bounds 0.011176 <= dY/dL <= 4.2213 and where they are attained,
//  (2) convexity on pieces (Y'' >= 0) and the Newton / Halley constants,
//  (3) starting-guess (power-model fit) error and the error after 1 and 2 Halley steps,
//  (4) the sRGB decode-curve jump at 0.04045 (and the legacy WCAG 0.03928 threshold).
// Usage: node analysis.mjs
import { hslLightnessForLuminance } from '../../../src/hsl.js';

const W = [0.2126, 0.7152, 0.0722], G = 2.4, CUT = 0.04045;
function mvals(h) { h %= 360; if (h < 0) h += 360; const f = (n) => { const k = (n + h / 30) % 12; return Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; }
// one-sided (right) derivatives on the piece containing (L, L + 0)
function derivs(h, s, L) {
  const m = mvals(h), upper = L >= 0.5;
  let y = 0, y1 = 0, y2 = 0, y3 = 0;
  for (let i = 0; i < 3; i++) {
    const B = upper ? 1 + s * m[i] : 1 - s * m[i];
    const c = L - s * (upper ? 1 - L : L) * m[i];
    if (c > CUT || (c === CUT && B > 0)) {
      const t = c + 0.055, v = Math.pow(t / 1.055, G), d1 = G * v / t, d2 = (G - 1) * d1 / t, d3 = (G - 2) * d2 / t;
      y += W[i] * v; y1 += W[i] * d1 * B; y2 += W[i] * d2 * B * B; y3 += W[i] * d3 * B * B * B;
    } else { y += W[i] * c / 12.92; y1 += W[i] * B / 12.92; }
  }
  return [y, y1, y2, y3];
}
const lum = (h, s, L) => derivs(h, s, L)[0];

// ---- (1)+(2) slope bounds, convexity, Newton/Halley constants on a grid ----
{
  let minD = Infinity, maxD = 0, argMin, argMax, minY2 = Infinity, maxKappaLo = 0, maxKappaHi = 0, maxC = 0, argC;
  for (let hi = 0; hi < 360; hi++) for (let si = 0; si <= 50; si++) for (let li = 0; li <= 2000; li++) {
    const h = hi, s = si / 50, L = li / 2000 * (1 - 1e-12);
    const [, y1, y2, y3] = derivs(h, s, L);
    if (y1 < minD) { minD = y1; argMin = [h, s, L]; }
    if (y1 > maxD) { maxD = y1; argMax = [h, s, L]; }
    minY2 = Math.min(minY2, y2);
    const kappa = y2 / y1; if (L < 0.5) maxKappaLo = Math.max(maxKappaLo, kappa * L); else maxKappaHi = Math.max(maxKappaHi, kappa);
    const q = y2 / (2 * y1), C = Math.abs(q * q - y3 / (6 * y1)); if (C > maxC) { maxC = C; argC = [h, s, L]; }
  }
  const mu = (h) => mvals(h).reduce((a, m, i) => a + W[i] * m, 0);
  let muMin = Infinity, muMax = -Infinity; for (let h = 0; h < 360; h += 0.5) { muMin = Math.min(muMin, mu(h)); muMax = Math.max(muMax, mu(h)); }
  console.log(`mu(H) = sum w_i m_i(H) ranges over [${muMin.toFixed(4)}, ${muMax.toFixed(4)}] (extremes at H = 60 and 240)`);
  console.log(`dY/dL on grid: min ${minD.toPrecision(6)} at (h,s,L)=${argMin.map((x) => +x.toFixed(4))}, max ${maxD.toPrecision(6)} at ${argMax.map((x) => +x.toFixed(4))}`);
  console.log(`  proven bounds: (1-|mu|max)/12.92 = ${((1 - 0.8556) / 12.92).toPrecision(6)}, (2.4/1.055)(1+|mu|max) = ${((2.4 / 1.055) * 1.8556).toPrecision(6)}`);
  console.log(`min Y'' inside pieces on grid: ${minY2.toExponential(2)} (>= 0: convex on every piece)`);
  console.log(`Newton constant: max L*Y''/Y' on lower half = ${maxKappaLo.toFixed(4)} (proof: < 1.4), max Y''/Y' on upper half = ${maxKappaHi.toFixed(3)}`);
  console.log(`Halley constant max |(Y''/2Y')^2 - Y'''/6Y'| = ${maxC.toFixed(2)} at (h,s,L)=${argC.map((x) => +x.toFixed(4))}`);
}

// ---- (3) starting-guess error and Halley contraction (replicates the solver's guess) ----
{
  // reproduce the solver internals for measurement: piece selection + power-model guess
  function pieceAndGuess(h, s, Y) {
    const m = mvals(h);
    const y5 = lum(h, s, 0.5 - 1e-15 * 0) ; // left value at 1/2 (continuous there)
    const upper = Y > y5, lo = upper ? 0.5 : 0, hi = upper ? 1 : 0.5;
    const xs = [];
    for (let i = 0; i < 3; i++) { const B = upper ? 1 + s * m[i] : 1 - s * m[i]; if (B > 0) { const x = upper ? 1 - (1 - CUT) / B : CUT / B; if (x > lo && x < hi) xs.push(x); } }
    xs.sort((a, b) => a - b); const pts = [lo, ...xs, hi];
    let k = pts.length - 2; while (k > 0 && lum(h, s, pts[k] * (1 + 1e-15)) > Y) k--;
    const a = pts[k], b = pts[k + 1], e = (b - a) * 1e-12;
    const [ya, da] = derivs(h, s, a + e), [yb0, db] = derivs(h, s, b - e);
    const yb = yb0; const theta = (Y - ya) / (yb - ya), ratio = db / da;
    let L0 = a + theta * (b - a);
    if (ratio > 1 + 1e-12) { const lr = Math.log(ratio) / (G - 1); L0 = a + (b - a) * Math.expm1(Math.log1p(Math.expm1(G * lr) * theta) / G) / Math.expm1(lr); }
    const allToe = [0, 1, 2].every((i) => { const c = (a + b) / 2 - s * ((a + b) / 2 >= 0.5 ? 1 - (a + b) / 2 : (a + b) / 2) * m[i]; return c <= CUT; });
    return { a, b, L0, upper, allToe, toe: [0, 1, 2].filter((i) => { const L = (a + b) / 2; return L - s * (L >= 0.5 ? 1 - L : L) * m[i] <= CUT; }).length };
  }
  const halley = (h, s, Y, L) => { const [y, y1, y2] = derivs(h, s, L); const g = y - Y; return L - 2 * g * y1 / (2 * y1 * y1 - g * y2); };
  let seed = 99; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const stats = {};
  for (let n = 0; n < 300000; n++) {
    const h = rand() < 0.1 ? 60 * Math.floor(rand() * 6) : rand() * 360, s = rand() < 0.15 ? 1 : rand(), Y = rand() < 0.5 ? rand() : rand() ** 3;
    if (s === 0) continue;
    const L = hslLightnessForLuminance(h, s, Y); // reference (validated against bisection in selfcheck.mjs)
    const P = pieceAndGuess(h, s, Y); if (P.allToe) continue;
    const key = `${P.upper ? 'upper' : 'lower'} half, ${3 - P.toe} power channel(s)`;
    const S = stats[key] ||= { n: 0, e0: 0, e1: 0, e2: 0 };
    const L1 = halley(h, s, Y, P.L0), L2 = halley(h, s, Y, L1);
    S.n++; S.e0 = Math.max(S.e0, Math.abs(P.L0 - L)); S.e1 = Math.max(S.e1, Math.abs(L1 - L)); S.e2 = Math.max(S.e2, Math.abs(L2 - L));
  }
  console.log('starting-guess error |L0 - L*| and after 1 and 2 plain Halley steps (300k random targets):');
  for (const [k, S] of Object.entries(stats).sort()) console.log(`  ${k.padEnd(34)} n=${String(S.n).padStart(6)}  max e0 ${S.e0.toExponential(2)}  max e1 ${S.e1.toExponential(2)}  max e2 ${S.e2.toExponential(2)}`);
}

// ---- (4) the decode-curve jump ----
{
  const pw = (c) => Math.pow((c + 0.055) / 1.055, 2.4);
  console.log(`sRGB decode at 0.04045: toe ${(0.04045 / 12.92).toPrecision(17)}, power ${pw(0.04045).toPrecision(17)}, jump ${(pw(0.04045) - 0.04045 / 12.92).toExponential(3)} (upward)`);
  console.log(`legacy WCAG threshold 0.03928: toe ${(0.03928 / 12.92).toPrecision(12)}, power ${pw(0.03928).toPrecision(12)}, jump ${(pw(0.03928) - 0.03928 / 12.92).toExponential(3)} (downward: luminance would be non-monotone by this much)`);
}

// ---- (5) the closed-form special cases, checked against the solver ----
{
  const { linearToSrgb } = await import('../../../src/hsl.js');
  let e1 = 0, e2 = 0, e3 = 0;
  // gray: L = sRGB-encode(Y)
  for (let i = 1; i < 1000; i++) { const Y = (i / 1000) ** 3; e1 = Math.max(e1, Math.abs(linearToSrgb(Y) - hslLightnessForLuminance(123, 0, Y))); }
  // darkest piece: all channels in the toe, Y = L (1 - S mu(H)) / 12.92 for L <= 0.04045 / (1 + S)
  for (let k = 0; k < 20000; k++) {
    const h = (k * 7.3) % 360, s = ((k * 0.618) % 1), m = mvals(h), mu = m.reduce((a, mi, i) => a + W[i] * mi, 0);
    const Ymax = 0.04045 * (1 - s * mu) / (12.92 * (1 + s)), Y = Ymax * ((k % 97) + 1) / 98;
    e2 = Math.max(e2, Math.abs(12.92 * Y / (1 - s * mu) - hslLightnessForLuminance(h, s, Y)));
  }
  // S = 1 at multiples of 60 deg: one varying channel group of weight Wtop in each half
  const Wtop = { 0: 0.2126, 60: 0.9278, 120: 0.7152, 180: 0.7874, 240: 0.0722, 300: 0.2848 };
  for (const [hs, wt] of Object.entries(Wtop)) for (let i = 1; i < 2000; i++) {
    const Y = i / 2000, h = Number(hs);
    const Lc = Y <= wt ? 0.5 * linearToSrgb(Y / wt) : 0.5 * (1 + linearToSrgb((Y - wt) / (1 - wt)));
    e3 = Math.max(e3, Math.abs(Lc - hslLightnessForLuminance(h, 1, Y)));
  }
  console.log(`closed forms vs solver: gray max |dL| ${e1.toExponential(2)}, all-toe piece ${e2.toExponential(2)}, S=1 & H in 60Z ${e3.toExponential(2)}`);
}
