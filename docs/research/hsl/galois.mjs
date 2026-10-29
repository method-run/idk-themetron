// Galois-group certificates that the HSL -> WCAG-luminance inverse is not solvable by radicals
// on representative pieces. For each piece type we take a rational specialisation
// (hue, saturation, target Y), build the polynomial whose root is the (5th root of the)
// power-segment argument, and use Dedekind's theorem (factorisation pattern mod p = cycle type
// of Frobenius) to show: (1) the polynomial is irreducible over Q, and (2) the Galois group
// contains a prime cycle of length l with n/2 < l <= n-3, hence (Jordan) contains A_n.
//
// T1: one channel in the power segment, the other two in the linear toe -> trinomial, n = 12
// T2: two distinct power terms (hue a multiple of 60 deg, so two channels coincide), n = 60
// T3: three distinct power terms (generic hue), n = 300
//
// Usage: node galois.mjs [T1|T2|T3|selftest]
import { Q, qpoly, trim, deg, mod, inv, ddfPattern, isSquarefree, primesBetween, subsetSums } from './polymod.mjs';

const wR = Q.of('0.2126'), wG = Q.of('0.7152'), wB = Q.of('0.0722');
const k055 = Q.of('0.055'), k1055 = Q.of('1.055'), k1292 = Q.of('12.92');
const ONE = new Q(1);

// ---------- T1: H = 30deg, S = 1/2, Y = 1/400; R in power segment, G and B in toe ----------
// alpha = (3/2, 1, 1/2). u = (aR L + .055)/1.055, v^5 = u:  v^12 + A v^5 + B = 0
function buildT1(Y = new Q(1, 400)) {
  const aR = new Q(3, 2), aG = new Q(1), aB = new Q(1, 2);
  const kappa = wG.mul(aG).add(wB.mul(aB)).div(k1292);
  const A = k1055.mul(kappa).div(aR.mul(wR));
  const B = k055.mul(kappa).div(aR).add(Y).div(wR).neg();
  const poly = Array.from({ length: 13 }, () => new Q(0)); poly[0] = B; poly[5] = A; poly[12] = ONE;
  return { poly, A, B, n: 12 };
}
// ---------- T2: H = 0deg, S = 1/2, Y = 1/20; all channels in power; G = B coincide ----------
// a^5 = uR ; uGB = a^5/3 + (2/3)(11/211) ; (Y - wR a^12)^5 - (wG+wB)^5 uGB^12 = 0
function buildT2(Y = new Q(1, 20)) {
  const c = k055.div(k1055);
  const uGB = [c.mul(new Q(2, 3)), new Q(0), new Q(0), new Q(0), new Q(0), new Q(1, 3)];
  const Tpoly = qpoly.add([Y], qpoly.mono(wR.neg(), 12));
  const lhs = qpoly.pow(Tpoly, 5);
  const rhs = qpoly.scale(qpoly.pow(uGB, 12), wG.add(wB).pow(5));
  const poly = qpoly.add(lhs, qpoly.scale(rhs, new Q(-1)));
  return { poly, n: 60 };
}
// ---------- T3: H = 30deg, S = 1/2, Y = 1/20; all three channels in power, all distinct ----------
// a^5 = uR ; uG = (2/3)a^5 + (1/3)c ; uB = (1/3)a^5 + (2/3)c with c = .055/1.055
// P3(a) = Res_D( D^5 - uB^12 , (Y - wR a^12 - wB D)^5 - wG^5 uG^12 ), degree 300 in a.
// Evaluated mod p at 301+ points and interpolated.
function makeT3Evaluator(p, params) {
  const { w1, w2, w3, r2, s2, r3, s3, Y } = params; const K = params.k || 12; // channel 1 is parametrised by a
  const W1 = w1.modp(p), W2 = w2.modp(p), W3 = w3.modp(p), R2 = r2.modp(p), S2 = s2.modp(p), R3 = r3.modp(p), S3 = s3.modp(p), YY = Y.modp(p);
  const pw = (x, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * x) % p; return r; };
  const binom = [1, 5, 10, 10, 5, 1];
  return (a) => {
    const a5 = pw(a, 5), T = mod(YY - W1 * pw(a, K) % p, p);
    const u2 = (R2 * a5 + S2) % p, u3 = (R3 * a5 + S3) % p;
    const Wv = (pw(W2, 5) * pw(u2, K)) % p, e = pw(u3, K);
    const q = []; for (let k = 0; k <= 5; k++) q.push((binom[k] * pw(T, 5 - k) % p) * pw(mod(-W3, p), k) % p);
    q[0] = mod(q[0] - Wv, p);
    const qt = [mod(q[0] + q[5] * e, p), q[1], q[2], q[3], q[4]];
    const M = Array.from({ length: 5 }, () => new Array(5).fill(0));
    for (let j = 0; j < 5; j++) for (let k = 0; k < 5; k++) { const r = k + j; if (r < 5) M[r][j] = qt[k]; else M[r - 5][j] = (qt[k] * e) % p; }
    return detmod(M, p);
  };
}
function detmod(M, p) {
  M = M.map((r) => r.slice()); const n = M.length; let det = 1;
  for (let c = 0; c < n; c++) {
    let piv = -1; for (let r = c; r < n; r++) if (M[r][c]) { piv = r; break; }
    if (piv < 0) return 0;
    if (piv !== c) { [M[piv], M[c]] = [M[c], M[piv]]; det = mod(-det, p); }
    det = (det * M[c][c]) % p; const ic = inv(M[c][c], p);
    for (let r = c + 1; r < n; r++) { const f = (M[r][c] * ic) % p; if (!f) continue; for (let k = c; k < n; k++) M[r][k] = mod(M[r][k] - f * M[c][k], p); }
  }
  return det;
}
function interpolate(xs, ys, p) { // Newton divided differences -> coefficient array
  const n = xs.length, c = ys.slice();
  for (let j = 1; j < n; j++) for (let i = n - 1; i >= j; i--) c[i] = mod((c[i] - c[i - 1]) * inv(mod(xs[i] - xs[i - j], p), p), p);
  let poly = [c[n - 1]];
  for (let i = n - 2; i >= 0; i--) { // poly = poly*(x - xs[i]) + c[i]
    const np = new Array(poly.length + 1).fill(0);
    for (let k = 0; k < poly.length; k++) { np[k + 1] = (np[k + 1] + poly[k]) % p; np[k] = mod(np[k] - poly[k] * xs[i] % p, p); }
    np[0] = (np[0] + c[i]) % p; poly = np;
  }
  return trim(poly);
}
const T3params = (() => {
  const c = k055.div(k1055);
  return { w1: wR, w2: wG, w3: wB, r2: new Q(2, 3), s2: c.mul(new Q(1, 3)), r3: new Q(1, 3), s3: c.mul(new Q(2, 3)), Y: new Q(1, 20) };
})();
function T3modp(p, params = T3params, n = 300) {
  const ev = makeT3Evaluator(p, params);
  const xs = [], ys = []; for (let i = 0; i <= n; i++) { xs.push(i); ys.push(ev(i)); }
  const poly = interpolate(xs, ys, p);
  // consistency: degree <= n must reproduce extra points
  for (const x of [n + 1, n + 7, n + 101]) { let v = 0; for (let k = poly.length - 1; k >= 0; k--) v = (v * x + poly[k]) % p; if (v !== ev(x)) throw new Error('interpolation inconsistent at p=' + p); }
  return poly;
}

// ---------- certificate search ----------
function certify(name, n, polyModP, primes, { needJordan = true } = {}) {
  let sums = null; const seen = []; let jordan = null, odd = null;
  const t0 = Date.now();
  for (const p of primes) {
    let f; try { f = polyModP(p); } catch (e) { continue; }
    if (deg(f) !== n || !isSquarefree(f, p)) continue;
    const pat = ddfPattern(f, p);
    seen.push([p, pat]);
    const ss = subsetSums(pat); sums = sums ? new Set([...sums].filter((x) => ss.has(x))) : ss;
    const big = pat.find((d) => d > n / 2 && d <= n - 3 && isPrime(d));
    if (big && !jordan) jordan = { p, cycle: big, pattern: pat };
    if (!odd && (n - pat.length) % 2 === 1) odd = { p, pattern: pat };
    const irreducible = sums.size === 2;
    if (irreducible && jordan && odd) break;
    if (Date.now() - t0 > 20 * 60e3) break;
  }
  const fmt = (pat) => compress(pat);
  console.log(`\n[${name}] degree ${n}: examined ${seen.length} good primes`);
  console.log(`  irreducible over Q: ${sums && sums.size === 2 ? 'YES' : 'not certified'} (common subset sums: ${sums ? [...sums].sort((a, b) => a - b).slice(0, 12).join(',') : '-'})`);
  for (const [p, pat] of seen.slice(0, 8)) console.log(`   p=${p}: ${fmt(pat)}`);
  if (jordan) console.log(`  prime cycle: p=${jordan.p} pattern ${fmt(jordan.pattern)} -> Frobenius^m is a ${jordan.cycle}-cycle (${n}/2 < ${jordan.cycle} <= ${n}-3) => Jordan: Gal contains A_${n}`);
  else console.log('  no Jordan prime cycle found');
  if (odd) console.log(`  odd permutation: p=${odd.p} pattern ${fmt(odd.pattern)} => Gal not inside A_${n}, so Gal = S_${n}`);
  return { irreducible: sums && sums.size === 2, jordan, odd };
}
function isPrime(n) { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; }
function compress(pat) { const m = new Map(); for (const d of pat) m.set(d, (m.get(d) || 0) + 1); return [...m].map(([d, k]) => (k > 1 ? `${d}^${k}` : `${d}`)).join(' '); }

// ---------- numeric sanity checks: the real HSL solution is a root ----------
function numericChecks() {
  const W = [0.2126, 0.7152, 0.0722];
  const eotf = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = (al, L) => al.reduce((s, a, i) => s + W[i] * eotf(a * L), 0);
  const solve = (al, Y) => { let lo = 0, hi = 0.5; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (lum(al, m) < Y) lo = m; else hi = m; } return lo; };
  // T1
  { const { A, B } = buildT1(); const L = solve([1.5, 1, 0.5], 1 / 400); const u = (1.5 * L + 0.055) / 1.055, v = Math.pow(u, 0.2);
    console.log(`T1 numeric: L*=${L.toFixed(9)} (piece needs ${(0.04045 / 1.5).toFixed(5)}<L<${0.04045.toFixed(5)}), v^12+Av^5+B = ${(v ** 12 + A.toNumber() * v ** 5 + B.toNumber()).toExponential(2)}  (A=${A.toNumber().toPrecision(8)}, B=${B.toNumber().toPrecision(8)})`); }
  // T2
  { const { poly } = buildT2(); const L = solve([1.5, 0.5, 0.5], 1 / 20); const a = Math.pow((1.5 * L + 0.055) / 1.055, 0.2);
    const val = poly.reduceRight((acc, c) => acc * a + c.toNumber(), 0); const scale = poly.reduce((s, c, k) => s + Math.abs(c.toNumber() * a ** k), 0);
    console.log(`T2 numeric: L*=${L.toFixed(9)} (needs L>0.0809), |P2(a*)|/sum|terms| = ${(Math.abs(val) / scale).toExponential(2)}`); }
  // T3 (complex-free check: the real branch satisfies the defining relation)
  { const L = solve([1.5, 1, 0.5], 1 / 20); console.log(`T3 numeric: L*=${L.toFixed(9)} (needs L>0.0809), all channels in power segment: ${[1.5, 1, 0.5].every((a) => a * L > 0.04045)}`); }
}

function selftestT3() {
  // synthetic case with a known rational root a0 = 1 (b0 = 2, c0 = 3): checks the resultant pipeline
  const params = { w1: wR, w2: wG, w3: wB, r2: new Q(7), s2: new Q(25), r3: new Q(43), s3: new Q(200), Y: null };
  params.Y = wR.add(wG.mul(new Q(2 ** 12))).add(wB.mul(new Q(3 ** 12)));
  for (const p of [1009, 10007, 65537]) { const poly = T3modp(p, params); const at = (x) => { let v = 0; for (let k = poly.length - 1; k >= 0; k--) v = (v * x + poly[k]) % p; return v; };
    console.log(`selftest p=${p}: deg=${deg(poly)} P(1)=${at(1)} (expect 0)  P(2)=${at(2)} (expect nonzero)`); }
}

const which = process.argv[2] || 'all';
if (which === 'selftest' || which === 'all') { numericChecks(); selftestT3(); }
const avoid = new Set([2, 3, 5, 17, 19, 211, 1063, 447, 361]);
if (which === 'T1' || which === 'all') { const { poly } = buildT1(); certify('T1 trinomial v^12 + A v^5 + B (H=30, S=1/2, Y=1/400)', 12, (p) => { if (avoid.has(p)) throw 0; return qpoly.modp(poly, p); }, primesBetween(7, 5000)); }
if (which === 'T2' || which === 'all') { const { poly } = buildT2(); certify('T2 two power terms (H=0, S=1/2, Y=1/20)', 60, (p) => { if (avoid.has(p)) throw 0; return qpoly.modp(poly, p); }, primesBetween(7, 20000)); }
// ---- further piece types ----
// generic two-term builder: (Y - mu - w1 a^k - lam a^5)^5 - w2^5 (r a^5 + s)^k = 0
function twoTerm({ w1, w2, r, s, Y, lam = new Q(0), mu = new Q(0), k = 12 }) {
  const Tpoly = qpoly.add(qpoly.add([Y.sub(mu)], qpoly.mono(w1.neg(), k)), qpoly.mono(lam.neg(), 5));
  const lhs = qpoly.pow(Tpoly, 5);
  const rhs = qpoly.scale(qpoly.pow([s, new Q(0), new Q(0), new Q(0), new Q(0), r], k), w2.pow(5));
  return qpoly.add(lhs, qpoly.scale(rhs, new Q(-1)));
}
const cc = k055.div(k1055);
const extra = {
  // upper half, H = 0, S = 1/2 (G = B coincide): beta = (1/2, 3/2, 3/2); a^5 = uR, uGB = 3 a^5 - 2; Y = 1/2
  T2u: () => ({ n: 60, poly: twoTerm({ w1: wR, w2: wG.add(wB), r: new Q(3), s: new Q(-2), Y: new Q(1, 2) }), label: 'T2u upper half, two power terms (H=0, S=1/2, Y=1/2)' }),
  // lower half, S = 1, H = 30: alpha = (2, 1, 0): Y = wR f(2L) + wG f(L); a^5 = uR, uG = a^5/2 + c/2; Y = 1/20
  T2s1: () => ({ n: 60, poly: twoTerm({ w1: wR, w2: wG, r: new Q(1, 2), s: cc.mul(new Q(1, 2)), Y: new Q(1, 20) }), label: 'T2s1 lower half, S=1, H=30 (two power terms, B identically 0)' }),
  // lower half, H = 30, S = 19/20: alpha = (39/20, 1, 1/20); R, G power, B toe (linear); Y = 1/20
  T2t: () => { const aR = new Q(39, 20), aB = new Q(1, 20); const kap = wB.mul(aB).div(k1292);
    // L = (1.055 a^5 - .055)/aR  ->  kap L = lam a^5 + mu
    const lam = kap.mul(k1055).div(aR), mu = kap.mul(k055).div(aR).neg();
    return { n: 60, poly: twoTerm({ w1: wR, w2: wG, r: new Q(1).div(aR), s: cc.mul(new Q(1).sub(new Q(1).div(aR))), Y: new Q(1, 20), lam, mu }), label: 'T2t lower half, two power terms + one toe channel (H=30, S=0.95, Y=1/20)' }; },
};
for (const [key, mk] of Object.entries(extra)) if (which === key || which === 'extra') { const { n, poly, label } = mk(); certify(label, n, (p) => { if (avoid.has(p) || p === 13) throw 0; return qpoly.modp(poly, p); }, primesBetween(7, 50000)); }
// upper half, H = 30, S = 1/2: beta = (1/2, 1, 3/2): a^5 = uR, uG = 2a^5 - 1, uB = 3a^5 - 2. Same polynomial for pure 2.4 power.
const T3uParams = { w1: wR, w2: wG, w3: wB, r2: new Q(2), s2: new Q(-1), r3: new Q(3), s3: new Q(-2), Y: new Q(1, 2) };
if (which === 'T3u') certify('T3u upper half, three power terms (H=30, S=1/2, Y=1/2); identical polynomial for pure gamma 2.4', 300, (p) => { if (avoid.has(p)) throw 0; return T3modp(p, T3uParams); }, primesBetween(1000, 200000));
// pure power 2.2 = 11/5, upper half, same channel relations (c_G = 2c_R - 1, c_B = 3c_R - 2), degree 25*11 = 275
if (which === 'T3u22') certify('T3u22 pure gamma 2.2, upper half, three power terms (H=30, S=1/2, Y=1/2)', 275, (p) => { if (avoid.has(p)) throw 0; return T3modp(p, { ...T3uParams, k: 11 }, 275); }, primesBetween(1000, 200000));
// another generic lower-half point for robustness: H = 200 (sector 180-240: max B, mid G (t = h/30-7 = -1/3), min R), S = 3/10, Y = 1/10 (lower half, L* = 0.35)
if (which === 'T3b') { const S = new Q(3, 10), t = new Q(-1, 3); const aMax = new Q(1).add(S), aMid = new Q(1).sub(S.mul(t)), aMin = new Q(1).sub(S);
  const r2 = aMid.div(aMax), r3 = aMin.div(aMax);
  certify('T3b lower half, three power terms (H=200, S=3/10, Y=1/10)', 300, (p) => { if (avoid.has(p) || p === 13 || p === 7) throw 0;
    return T3modp(p, { w1: wB, w2: wG, w3: wR, r2, s2: cc.mul(new Q(1).sub(r2)), r3, s3: cc.mul(new Q(1).sub(r3)), Y: new Q(1, 10) }); }, primesBetween(1000, 200000)); }
if (which === 'T3' || which === 'all') { certify('T3 three power terms (H=30, S=1/2, Y=1/20)', 300, (p) => { if (avoid.has(p)) throw 0; return T3modp(p); }, primesBetween(1000, 200000)); }
