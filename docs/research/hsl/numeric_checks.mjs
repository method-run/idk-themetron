// Floating-point sanity checks: the actual HSL solution satisfies each certified piece polynomial / parametrisation.
const W = [0.2126, 0.7152, 0.0722];
const eotf = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
function css(h, s, l) { h = ((h % 360) + 360) % 360; const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; }
const lum = (h, s, l) => css(h, s, l).reduce((acc, c, i) => acc + W[i] * eotf(c), 0);
const solve = (h, s, Y) => { let lo = 0, hi = 1; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (lum(h, s, m) < Y) lo = m; else hi = m; } return lo; };
const U = (c) => (c + 0.055) / 1.055;
const rel = (terms) => Math.abs(terms.reduce((a, b) => a + b, 0)) / terms.reduce((a, b) => a + Math.abs(b), 0);
// T2u: H=0,S=1/2,Y=1/2: (Y - wR a^12)^5 - (wG+wB)^5 (3a^5-2)^12
{ const L = solve(0, 0.5, 0.5), c = css(0, 0.5, L), a = U(c[0]) ** 0.2;
  console.log('T2u  L*=', L.toFixed(9), 'channels', c.map((x) => x.toFixed(4)).join(','), 'uGB vs 3a^5-2:', U(c[1]).toFixed(12), (3 * a ** 5 - 2).toFixed(12),
    'rel residual', rel([(0.5 - W[0] * a ** 12) ** 5, -((W[1] + W[2]) ** 5) * (3 * a ** 5 - 2) ** 12]).toExponential(2)); }
// T2s1: H=30,S=1,Y=1/20: channels (2L, L, 0)
{ const L = solve(30, 1, 0.05), c = css(30, 1, L), a = U(c[0]) ** 0.2, cc = 0.055 / 1.055;
  console.log('T2s1 L*=', L.toFixed(9), 'channels', c.map((x) => x.toFixed(4)).join(','), 'rel residual', rel([(0.05 - W[0] * a ** 12) ** 5, -(W[1] ** 5) * (a ** 5 / 2 + cc / 2) ** 12]).toExponential(2)); }
// T2t: H=30,S=0.95,Y=1/20: R,G power, B toe
{ const L = solve(30, 0.95, 0.05), c = css(30, 0.95, L), a = U(c[0]) ** 0.2, cc = 0.055 / 1.055, aR = 1.95, kap = W[2] * 0.05 / 12.92;
  const lam = kap * 1.055 / aR, mu = -kap * 0.055 / aR;
  console.log('T2t  L*=', L.toFixed(9), 'channels', c.map((x) => x.toFixed(4)).join(','), 'B in toe:', c[2] <= 0.04045, 'R,G in power:', c[0] > 0.04045 && c[1] > 0.04045,
    'rel residual', rel([(0.05 - mu - W[0] * a ** 12 - lam * a ** 5) ** 5, -(W[1] ** 5) * (a ** 5 / aR + cc * (1 - 1 / aR)) ** 12]).toExponential(2)); }
// T3u: H=30,S=1/2,Y=1/2: uG = 2a^5-1, uB = 3a^5-2
{ const L = solve(30, 0.5, 0.5), c = css(30, 0.5, L), a = U(c[0]) ** 0.2;
  console.log('T3u  L*=', L.toFixed(9), 'channels', c.map((x) => x.toFixed(4)).join(','), 'uG', U(c[1]).toFixed(12), '2a^5-1', (2 * a ** 5 - 1).toFixed(12), 'uB', U(c[2]).toFixed(12), '3a^5-2', (3 * a ** 5 - 2).toFixed(12)); }
// T3b: H=200,S=0.3,Y=0.3 lower half? channels
{ const L = solve(200, 0.3, 0.3), c = css(200, 0.3, L); console.log('T3b  L*=', L.toFixed(9), '(lower half needs L<=0.5)', 'channels', c.map((x) => x.toFixed(4)).join(','), 'all power:', c.every((x) => x > 0.04045)); }
// T3u22 (pure 2.2): solve sum w c^2.2 = 1/2 on upper half with H=30,S=1/2 and check c_G = 2c_R-1, c_B = 3c_R-2
{ const lum22 = (l) => css(30, 0.5, l).reduce((acc, c, i) => acc + W[i] * c ** 2.2, 0); let lo = 0, hi = 1; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (lum22(m) < 0.5) lo = m; else hi = m; }
  const c = css(30, 0.5, lo); console.log('T3u22 L*=', lo.toFixed(9), 'upper half:', lo > 0.5, 'cG-(2cR-1)=', (c[1] - (2 * c[0] - 1)).toExponential(1), 'cB-(3cR-2)=', (c[2] - (3 * c[0] - 2)).toExponential(1)); }
