// Large sweep (no bisection): iteration counts, pow counts and residuals over random and
// dense-grid (h, s, Y). The residual r = Y(L) - Y gives a rigorous bound |L - L*| <= |r| / 0.011176
// (slope lower bound; ignores the float error of evaluating Y itself).
// Usage: node sweep.mjs [randomCount=5000000]
import { hslLightnessForLuminanceDetailed, hslRelativeLuminance } from '../../../src/hsl.js';

const N = Number(process.argv[2] || 5000000);
let seed = 123456789 >>> 0;
const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const res = { n: 0, maxIt: 0, maxEv: 0, maxPow: 0, maxR: 0, maxRrel: 0, fallback: 0, it: {}, worst: null, sumPow: 0 };
function run(h, s, Y) {
  const r = hslLightnessForLuminanceDetailed(h, s, Y);
  const resid = Math.abs(hslRelativeLuminance(h, s, r.L) - Y);
  res.n++; res.it[r.iterations] = (res.it[r.iterations] || 0) + 1; res.sumPow += r.pows;
  if (r.iterations > res.maxIt) { res.maxIt = r.iterations; res.worst = [h, s, Y, r.method]; }
  res.maxEv = Math.max(res.maxEv, r.evaluations); res.maxPow = Math.max(res.maxPow, r.pows);
  if (resid > res.maxR) res.maxR = resid;
  res.maxRrel = Math.max(res.maxRrel, resid / (Y + 0.05));
  if (r.method.includes('fallback')) res.fallback++;
}
const t0 = Date.now();
for (let k = 0; k < N; k++) {
  const u = rand();
  const h = u < 0.1 ? 60 * Math.floor(rand() * 6) : rand() * 360;
  const s = rand() < 0.1 ? 1 : rand() < 0.2 ? 0.9 + 0.1 * rand() : rand();
  const v = rand();
  const Y = v < 0.4 ? rand() : v < 0.7 ? rand() ** 3 : v < 0.85 ? 1 - rand() ** 3 : 1.05 * Math.pow(21, -rand()) - 0.05;
  run(h, s, Y);
}
const tRandom = Date.now() - t0;
// dense grid: hue every 0.5 deg, saturation every 0.02, 120 targets spread over [0, 1] (linear and cubic)
for (let hi = 0; hi < 720; hi++) for (let si = 1; si <= 50; si++) for (let yi = 1; yi < 120; yi++) {
  const Y = yi % 2 ? yi / 120 : (yi / 120) ** 3;
  run(hi / 2, si / 50, Y);
}
console.log(`solves: ${res.n} (${N} random in ${(tRandom / 1000).toFixed(1)} s, plus a 720 x 50 x 119 grid)`);
console.log(`Halley iterations histogram: ${JSON.stringify(res.it)}  max ${res.maxIt} (worst ${JSON.stringify(res.worst)})`);
console.log(`max Y evaluations: ${res.maxEv}, max Math.pow calls: ${res.maxPow}, mean Math.pow calls: ${(res.sumPow / res.n).toFixed(2)}, bisection fallbacks: ${res.fallback}`);
console.log(`max |Y(L) - Y| = ${res.maxR.toExponential(3)}, max |Y(L) - Y| / (Y + 0.05) = ${res.maxRrel.toExponential(3)}, implied |L - L*| <= ${(res.maxR / 0.0111765).toExponential(2)}`);
