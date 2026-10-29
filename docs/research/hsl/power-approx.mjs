// Pure-power approximation of the sRGB decode: f(c) ~ k * c^gamma.
// On the lower half (L <= 1/2) every channel is alpha_i * L, so Y ~ k L^gamma * sum w_i alpha_i^gamma
// and L = (Y / (k K))^(1/gamma) is a closed form for every hue and saturation.
// This script measures what that costs in true (sRGB) luminance and in WCAG contrast.
// Usage: node power-approx.mjs
import { hslLightnessForLuminance, hslRelativeLuminance, srgbToLinear } from '../../../src/hsl.js';

const W = [0.2126, 0.7152, 0.0722];
function mvals(h) { h %= 360; if (h < 0) h += 360; const f = (n) => { const k = (n + h / 30) % 12; return Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; }

// per-channel forward error bounds over c in [0, 1]
function channelBounds(k, g) {
  let abs = 0, rel = 0, argAbs = 0, argRel = 0;
  for (let i = 0; i <= 200000; i++) {
    const c = i / 200000, f = srgbToLinear(c), a = k * Math.pow(c, g);
    const e = Math.abs(f - a), r = e / (a + 0.05);
    if (e > abs) { abs = e; argAbs = c; }
    if (r > rel) { rel = r; argRel = c; }
  }
  return { abs, rel, argAbs, argRel };
}

function inverseErrors(k, g, samples = 200000) {
  let seed = 2024; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let maxDY = 0, maxCR = 0, maxDL = 0, n = 0, outOfHalf = 0; const crs = [];
  for (let t = 0; t < samples; t++) {
    const h = rand() * 360, s = rand();
    const m = mvals(h), K = W.reduce((acc, w, i) => acc + w * Math.pow(1 - s * m[i], g), 0) * k;
    const yHalf = hslRelativeLuminance(h, s, 0.5);
    const Y = yHalf * (rand() < 0.5 ? rand() : rand() ** 3); // targets whose exact answer is in the lower half
    const Lg = Math.pow(Y / K, 1 / g);
    if (Lg > 0.5) { outOfHalf++; continue; } // the model's answer left the closed-form half
    const Ltrue = hslLightnessForLuminance(h, s, Y);
    const Yact = hslRelativeLuminance(h, s, Lg);
    const cr = Math.abs((Yact + 0.05) / (Y + 0.05) - 1);
    maxDY = Math.max(maxDY, Math.abs(Yact - Y)); maxCR = Math.max(maxCR, cr); maxDL = Math.max(maxDL, Math.abs(Lg - Ltrue)); crs.push(cr); n++;
  }
  crs.sort((a, b) => a - b);
  return { n, outOfHalf, maxDY, maxCR, p50: crs[Math.floor(n * 0.5)], p95: crs[Math.floor(n * 0.95)], maxDL };
}

const show = (label, k, g) => {
  const cb = channelBounds(k, g), ie = inverseErrors(k, g);
  console.log(`${label}: per-channel max |f - k c^g| = ${cb.abs.toFixed(5)} (at c=${cb.argAbs.toFixed(3)}), max |f - k c^g|/(k c^g + 0.05) = ${(100 * cb.rel).toFixed(2)}% (at c=${cb.argRel.toFixed(3)})`);
  console.log(`   lower-half closed form on ${ie.n} targets (${ie.outOfHalf} skipped: model answer > 1/2): max |dY| = ${ie.maxDY.toFixed(5)}, max |dL| = ${ie.maxDL.toFixed(4)}, contrast error median ${(100 * ie.p50).toFixed(2)}%, p95 ${(100 * ie.p95).toFixed(2)}%, max ${(100 * ie.maxCR).toFixed(2)}%`);
};
show('pure 2.2', 1, 2.2);
show('pure 2.4', 1, 2.4);

// best k * c^g for the contrast-relevant bound (minimax over c of |f - k c^g| / (k c^g + 0.05))
let best = { rel: Infinity };
for (let g = 1.9; g <= 2.6; g += 0.01) for (let k = 0.85; k <= 1.15; k += 0.0025) {
  let rel = 0; for (let i = 0; i <= 2000; i++) { const c = i / 2000, a = k * Math.pow(c, g); rel = Math.max(rel, Math.abs(srgbToLinear(c) - a) / (a + 0.05)); }
  if (rel < best.rel) best = { rel, g, k };
}
show(`best fit k=${best.k.toFixed(4)}, gamma=${best.g.toFixed(2)}`, best.k, best.g);
