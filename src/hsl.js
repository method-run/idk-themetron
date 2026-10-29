// Exact inverse of WCAG 2 relative luminance along the HSL lightness axis.
//
//   hslLightnessForLuminance(h, s, Y) -> L   with   hslRelativeLuminance(h, s, L) === Y (to float precision)
//
// h: hue in degrees (any real number), s: saturation in [0, 1], Y: target luminance in [0, 1].
// Returns L in [0, 1]. For CSS percentages pass s / 100 and multiply the result by 100.
//
// Method (proofs in docs/research/hsl-lightness.md; the scripts are in docs/research/hsl/):
//   1. For fixed h and s, every gamma-encoded channel is affine in L on [0, 1/2] and on [1/2, 1],
//      and crosses the sRGB toe threshold 0.04045 at most once. So [0, 1] splits into at most
//      7 pieces. On each piece Y(L) is smooth, strictly increasing and convex.
//   2. Pick the half by comparing Y with Y(1/2). Pick the piece by evaluating Y at the (at most 3)
//      toe crossings inside that half, from the top down.
//   3. Starting guess: fit Y ~ K + C (L - L0)^2.4 to the values and the slope ratio at the two ends
//      of the piece, and invert the fit in closed form. The fit is exact when only one channel
//      varies on the piece.
//   4. Safeguarded Halley iteration on that piece. It stops after 1 or 2 steps in all tests.
//
// No closed form exists in general: the generic piece is a degree-300 polynomial equation with
// Galois group S_300. The closed-form cases are used directly: grays (s = 0) and the darkest
// piece, where all channels are in the linear toe and Y is linear in L. For s = 1 at hues that
// are multiples of 60 degrees only one channel group varies, so the starting guess is already exact.
//
// Channel values are computed with the same floating-point operations as the CSS Color 4 hsl()
// algorithm, so the result is consistent with any code that uses that algorithm.

const W = [0.2126, 0.7152, 0.0722]; // WCAG 2 luminance weights for R, G, B
const GAMMA = 2.4;
const CUT = 0.04045; // sRGB decode threshold on the encoded value
const TOE_SLOPE = 1 / 12.92;
const TOE_AT_CUT = CUT / 12.92; // 0.0031308049535603713
const POW_AT_CUT = Math.pow((CUT + 0.055) / 1.055, GAMMA); // 0.0031308072830676845: the curve jumps up 2.3e-9 here
const DPOW_AT_CUT = (GAMMA * POW_AT_CUT) / (CUT + 0.055); // slope of the power branch at the cut
const MAX_ITERATIONS = 40;

/** sRGB EOTF (decode), constants as in IEC 61966-2-1 and CSS Color 4. */
export function srgbToLinear(c) {
  return c <= CUT ? c / 12.92 : Math.pow((c + 0.055) / 1.055, GAMMA);
}

/** Generalised inverse of srgbToLinear: the smallest encoded value whose decode is >= y. */
export function linearToSrgb(y) {
  if (y <= 0) return 0;
  if (y <= TOE_AT_CUT) return 12.92 * y;
  if (y <= POW_AT_CUT) return CUT; // y is inside the 2.3e-9 jump of the decode curve
  if (y >= 1) return 1;
  return 1.055 * Math.pow(y, 1 / GAMMA) - 0.055;
}

/** CSS Color 4 hsl() -> gamma-encoded sRGB. h in degrees, s and l in [0, 1]. */
export function hslToSrgb(h, s, l) {
  h %= 360;
  if (h < 0) h += 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

/** WCAG 2 relative luminance of hsl(h, s, l). */
export function hslRelativeLuminance(h, s, l) {
  const [r, g, b] = hslToSrgb(h, s, l);
  return W[0] * srgbToLinear(r) + W[1] * srgbToLinear(g) + W[2] * srgbToLinear(b);
}

/** Luminance that has contrast `ratio` with a colour of luminance `otherY` (WCAG 2 formula). */
export function luminanceForContrast(otherY, ratio, direction /* 'lighter' | 'darker' */) {
  return direction === 'lighter' ? (otherY + 0.05) * ratio - 0.05 : (otherY + 0.05) / ratio - 0.05;
}

/** The HSL lightness L in [0, 1] whose WCAG 2 relative luminance is Y (exact to float precision). */
export function hslLightnessForLuminance(h, s, Y) {
  return solve(h, s, Y, null);
}

/** Same as hslLightnessForLuminance, with diagnostics: Halley iterations, Y evaluations, pow calls. */
export function hslLightnessForLuminanceDetailed(h, s, Y) {
  const info = { L: NaN, iterations: 0, evaluations: 0, pows: 0, half: '', piece: null, method: '' };
  POWS = 0;
  info.L = solve(h, s, Y, info);
  info.pows = POWS;
  return info;
}

// ---------------------------------------------------------------------------------------------

let POWS = 0;
let EY = 0;
let EY1 = 0;
let EY2 = 0;
let EY3 = 0;

// Channel value exactly as CSS computes it: c = L - s * min(L, 1 - L) * m.
const channel = (s, m, upper, L) => L - s * (upper ? 1 - L : L) * m;

// Y and its first three derivatives in L on one piece. Channel i has slope B[i] and uses the
// power branch iff pw[i]. Results go to EY, EY1, EY2, EY3.
function evalPiece(s, m, upper, B, pw, L) {
  let y = 0;
  let y1 = 0;
  let y2 = 0;
  let y3 = 0;
  const a = s * (upper ? 1 - L : L);
  for (let i = 0; i < 3; i++) {
    const c = L - a * m[i];
    const w = W[i];
    const b = B[i];
    if (pw[i]) {
      const t = c + 0.055;
      const v = Math.pow(t / 1.055, GAMMA);
      POWS++;
      const d1 = (GAMMA * v) / t; // f'
      const d2 = ((GAMMA - 1) * d1) / t; // f''
      const d3 = ((GAMMA - 2) * d2) / t; // f'''
      y += w * v;
      y1 += w * d1 * b;
      y2 += w * d2 * b * b;
      y3 += w * d3 * b * b * b;
    } else {
      y += w * c * TOE_SLOPE;
      y1 += w * b * TOE_SLOPE;
    }
  }
  EY = y;
  EY1 = y1;
  EY2 = y2;
  EY3 = y3;
}

function hueFactor(n, h30) {
  const k = (n + h30) % 12;
  return Math.max(-1, Math.min(k - 3, 9 - k, 1));
}

function solve(hue, sat, Y, info) {
  if (Number.isNaN(Y) || Number.isNaN(sat) || !Number.isFinite(hue)) return NaN;
  if (Y <= 0 || Y >= 1) {
    if (info) info.method = 'endpoint';
    return Y <= 0 ? 0 : 1;
  }
  const s = sat >= 1 ? 1 : sat > 0 ? sat : 0;
  if (s === 0) {
    if (info) info.method = 'closed form (gray)';
    return linearToSrgb(Y);
  }
  let h = hue % 360;
  if (h < 0) h += 360;
  const h30 = h / 30;
  const m = [hueFactor(0, h30), hueFactor(8, h30), hueFactor(4, h30)];

  // Lower half L in [0, 1/2]: c_i = alpha_i L,             alpha_i = 1 - s m_i.
  // Upper half L in [1/2, 1]: c_i = 1 - beta_i (1 - L),    beta_i  = 1 + s m_i.
  // Channel values at L = 1/2 are shared by both halves, so their power-branch values are reused.
  const c5 = [0, 0, 0];
  const v5 = [0, 0, 0];
  let y5 = 0;
  for (let i = 0; i < 3; i++) {
    const c = channel(s, m[i], false, 0.5);
    c5[i] = c;
    if (c > CUT) {
      v5[i] = Math.pow((c + 0.055) / 1.055, GAMMA);
      POWS++;
      y5 += W[i] * v5[i];
    } else {
      y5 += W[i] * c * TOE_SLOPE;
    }
  }
  if (info) info.evaluations += 1;

  const upper = Y > y5;
  const B = upper ? [1 + s * m[0], 1 + s * m[1], 1 + s * m[2]] : [1 - s * m[0], 1 - s * m[1], 1 - s * m[2]];
  const lo = upper ? 0.5 : 0;
  const hi = upper ? 1 : 0.5;
  if (info) info.half = upper ? 'upper' : 'lower';

  // Toe crossings strictly inside the half, ascending. Channels that coincide (hue a multiple
  // of 60 degrees) cross at exactly the same L and are merged into one breakpoint.
  const xs = []; // crossing positions
  const xw = []; // sum of W[i] over the channels crossing there (scales the decode-curve jump)
  const xwb = []; // sum of W[i] * B[i] over those channels (scales the slope jump)
  for (let i = 0; i < 3; i++) {
    if (B[i] > 0) {
      const x = upper ? 1 - (1 - CUT) / B[i] : CUT / B[i];
      if (x > lo && x < hi) {
        const dup = xs.indexOf(x);
        if (dup >= 0) {
          xw[dup] += W[i];
          xwb[dup] += W[i] * B[i];
          continue;
        }
        let k = xs.length;
        while (k > 0 && xs[k - 1] > x) {
          xs[k] = xs[k - 1];
          xw[k] = xw[k - 1];
          xwb[k] = xwb[k - 1];
          k--;
        }
        xs[k] = x;
        xw[k] = W[i];
        xwb[k] = W[i] * B[i];
      }
    }
  }
  const pwAt = (L) => [channel(s, m[0], upper, L) > CUT, channel(s, m[1], upper, L) > CUT, channel(s, m[2], upper, L) > CUT];

  // Value and slope at the end of the half that bounds the top piece.
  let pw = pwAt(xs.length ? 0.5 * (xs[xs.length - 1] + hi) : 0.5 * (lo + hi));
  let b = hi;
  let yb = 0;
  let db = 0;
  if (upper) {
    yb = W[0] + W[1] + W[2]; // every channel is 1 at L = 1
    db = (GAMMA / 1.055) * (W[0] * B[0] + W[1] * B[1] + W[2] * B[2]);
  } else {
    for (let i = 0; i < 3; i++) {
      if (pw[i]) {
        yb += W[i] * v5[i];
        db += W[i] * ((GAMMA * v5[i]) / (c5[i] + 0.055)) * B[i];
      } else {
        yb += W[i] * c5[i] * TOE_SLOPE;
        db += W[i] * B[i] * TOE_SLOPE;
      }
    }
  }

  // Walk the pieces from the top down until Y at the piece start is <= the target.
  let a = lo;
  let ya = 0;
  let da = 0;
  for (let j = xs.length - 1; ; j--) {
    if (j < 0) {
      if (upper) {
        for (let i = 0; i < 3; i++) {
          if (pw[i]) {
            const v = c5[i] > CUT ? v5[i] : POW_AT_CUT; // a channel exactly at the cut at L = 1/2
            ya += W[i] * v;
            da += W[i] * ((GAMMA * v) / (c5[i] + 0.055)) * B[i];
          } else {
            ya += W[i] * c5[i] * TOE_SLOPE;
            da += W[i] * B[i] * TOE_SLOPE;
          }
        }
      } else {
        da = (W[0] * B[0] + W[1] * B[1] + W[2] * B[2]) * TOE_SLOPE; // all channels in the toe near L = 0
      }
      break;
    }
    const x = xs[j];
    evalPiece(s, m, upper, B, pw, x); // right-hand limit at the crossing
    if (info) info.evaluations += 1;
    if (Y >= EY) {
      a = x;
      ya = EY;
      da = EY1;
      break;
    }
    const yLeft = EY - xw[j] * (POW_AT_CUT - TOE_AT_CUT);
    if (Y > yLeft) {
      // The target lies inside the (<= 2.3e-9) jump of the sRGB decode curve at this crossing.
      if (info) info.method = 'toe crossing (decode-curve jump)';
      return x;
    }
    b = x;
    yb = yLeft;
    db = EY1 - xwb[j] * (DPOW_AT_CUT - TOE_SLOPE);
    pw = pwAt(j > 0 ? 0.5 * (xs[j - 1] + x) : 0.5 * (lo + x));
  }
  if (info) info.piece = [a, b];

  const theta = (Y - ya) / (yb - ya);
  if (!(theta > 0 && theta < 1)) {
    if (info) info.method = 'piece endpoint';
    return theta > 0 ? b : a;
  }
  if (!pw[0] && !pw[1] && !pw[2]) {
    // All channels in the linear toe: Y is affine in L, so this is exact.
    if (info) info.method = 'closed form (all-toe piece)';
    return a + (Y - ya) / da;
  }

  // Starting guess: invert Y ~ K + C (L - L0)^GAMMA fitted through both end values and the end
  // slope ratio:  L = a + (b - a) * ((1 + (rho^GAMMA - 1) theta)^(1/GAMMA) - 1) / (rho - 1),
  // with rho = (db / da)^(1 / (GAMMA - 1)). Written with expm1/log1p so it stays accurate as rho -> 1.
  let L;
  const ratio = db / da;
  if (ratio > 1 + 1e-12) {
    const lr = Math.log(ratio) / (GAMMA - 1);
    L = a + ((b - a) * Math.expm1(Math.log1p(Math.expm1(GAMMA * lr) * theta) / GAMMA)) / Math.expm1(lr);
  } else {
    L = a + theta * (b - a);
  }
  if (!(L > a && L < b)) L = a + theta * (b - a);

  // Safeguarded Halley iteration. [lo2, hi2] always brackets the root. A Halley step is taken
  // only if it stays in the bracket and the residual at least halved since the previous step;
  // otherwise the bracket is bisected. So the iteration converges on every piece (either the
  // residual or the bracket shrinks geometrically). From the starting guess above it stops
  // after 1 or 2 Halley steps.
  let lo2 = a;
  let hi2 = b;
  let prevG = Infinity;
  if (info) info.method = 'piece + Halley';
  for (let it = 0; it < MAX_ITERATIONS; it++) {
    evalPiece(s, m, upper, B, pw, L);
    if (info) {
      info.evaluations += 1;
      info.iterations += 1;
    }
    const g = EY - Y;
    const ag = Math.abs(g);
    if (ag <= 2 * Number.EPSILON * Y) return L; // residual is at rounding level
    if (g < 0) lo2 = L;
    else hi2 = L;
    const denom = 2 * EY1 * EY1 - g * EY2;
    if (ag <= 0.5 * prevG && denom > 0) {
      const delta = (2 * g * EY1) / denom;
      const next = L - delta;
      if (next >= lo2 && next <= hi2) {
        prevG = ag;
        // Halley's error recursion: e_next ~ C e^3 with C = (Y''/2Y')^2 - Y'''/(6Y').
        const ad = Math.abs(delta);
        const q = EY2 / (2 * EY1);
        const C = Math.abs(q * q - EY3 / (6 * EY1));
        if (ad < 1e-4 && C * ad * ad * ad <= 1e-17) return next;
        L = next;
        continue;
      }
    }
    prevG = ag;
    L = 0.5 * (lo2 + hi2);
    if (info) info.method = 'piece + Halley (bisection fallback used)';
    if (hi2 - lo2 <= 4 * Number.EPSILON * hi2) return L;
  }
  return L;
}
