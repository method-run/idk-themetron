// Minimal dense polynomial arithmetic over F_p (p < 2^26 so products fit exactly in a double),
// plus exact rationals (BigInt) and a distinct-degree factorization that returns the
// factorization pattern (multiset of irreducible-factor degrees) of a squarefree polynomial.
// Polynomials are arrays of coefficients, index = degree.

export const mod = (a, p) => { const r = a % p; return r < 0 ? r + p : r; };
export function inv(a, p) { // extended Euclid
  let [r0, r1] = [mod(a, p), p], [s0, s1] = [1, 0];
  while (r1 !== 0) { const q = Math.floor(r0 / r1); [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; }
  if (r0 !== 1) throw new Error('not invertible');
  return mod(s0, p);
}
export const trim = (a) => { while (a.length && a[a.length - 1] === 0) a.pop(); return a; };
export const deg = (a) => a.length - 1;
export function mul(a, b, p) {
  if (!a.length || !b.length) return [];
  const r = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) { const ai = a[i]; if (!ai) continue;
    for (let j = 0; j < b.length; j++) r[i + j] = (r[i + j] + ai * b[j]) % p; }
  return trim(r);
}
export function sub(a, b, p) {
  const n = Math.max(a.length, b.length), r = new Array(n);
  for (let i = 0; i < n; i++) r[i] = mod((a[i] || 0) - (b[i] || 0), p);
  return trim(r);
}
export function rem(a, b, p) { // a mod b
  a = a.slice(); const db = deg(b), ib = inv(b[db], p);
  for (let i = deg(a); i >= db; i--) { const c = (a[i] * ib) % p; if (!c) continue;
    for (let j = 0; j <= db; j++) a[i - db + j] = mod(a[i - db + j] - c * b[j], p); }
  a.length = Math.min(a.length, db); return trim(a);
}
export function divexact(a, b, p) {
  a = a.slice(); const db = deg(b), ib = inv(b[db], p); const q = new Array(Math.max(0, deg(a) - db + 1)).fill(0);
  for (let i = deg(a); i >= db; i--) { const c = (a[i] * ib) % p; q[i - db] = c; if (!c) continue;
    for (let j = 0; j <= db; j++) a[i - db + j] = mod(a[i - db + j] - c * b[j], p); }
  if (trim(a).length) throw new Error('not exact');
  return trim(q);
}
export function monic(a, p) { const i = inv(a[deg(a)], p); return a.map((c) => (c * i) % p); }
export function gcd(a, b, p) { a = trim(a.slice()); b = trim(b.slice());
  while (b.length) { const r = rem(a, b, p); a = b; b = r; } return a.length ? monic(a, p) : a; }
export function deriv(a, p) { const r = []; for (let i = 1; i < a.length; i++) r.push((a[i] * (i % p)) % p); return trim(r); }
export function powmod(base, e, f, p) { // base^e mod f, e a Number or BigInt
  let result = [1], b = rem(base, f, p); let E = BigInt(e);
  while (E > 0n) { if (E & 1n) result = rem(mul(result, b, p), f, p); b = rem(mul(b, b, p), f, p); E >>= 1n; }
  return result;
}
// Factorization pattern of squarefree f over F_p (distinct-degree factorization with a Frobenius matrix).
export function ddfPattern(f, p) {
  f = monic(trim(f.slice()), p); const n = deg(f);
  const xp = powmod([0, 1], p, f, p);
  const rows = [[1]]; for (let i = 1; i < n; i++) rows.push(rem(mul(rows[i - 1], xp, p), f, p));
  const frob = (h) => { const r = new Array(n).fill(0);
    for (let i = 0; i < h.length; i++) { const hi = h[i]; if (!hi) continue; const R = rows[i];
      for (let j = 0; j < R.length; j++) r[j] = (r[j] + hi * R[j]) % p; } return trim(r); };
  let fcur = f, h = [0, 1]; const pattern = [];
  for (let d = 1; 2 * d <= deg(fcur); d++) {
    h = frob(h);
    const g = gcd(rem(sub(h, [0, 1], p), fcur, p), fcur, p);
    if (deg(g) > 0) { for (let k = 0; k < deg(g) / d; k++) pattern.push(d); fcur = divexact(fcur, g, p); }
  }
  if (deg(fcur) > 0) pattern.push(deg(fcur));
  return pattern.sort((a, b) => b - a);
}
export const isSquarefree = (f, p) => deg(gcd(f, deriv(f, p), p)) === 0;

// ---- exact rationals ----
const bgcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
export class Q {
  constructor(n, d = 1n) { n = BigInt(n); d = BigInt(d); if (d < 0n) { n = -n; d = -d; } const g = bgcd(n, d) || 1n; this.n = n / g; this.d = d / g; }
  static of(str) { // decimal string -> exact rational
    if (str.includes('/')) { const [a, b] = str.split('/'); return new Q(a, b); }
    const neg = str.startsWith('-'); if (neg) str = str.slice(1);
    const [i, f = ''] = str.split('.'); const q = new Q(BigInt(i + f), 10n ** BigInt(f.length)); return neg ? q.neg() : q; }
  add(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Q(this.n * o.n, this.d * o.d); }
  div(o) { return new Q(this.n * o.d, this.d * o.n); }
  neg() { return new Q(-this.n, this.d); }
  pow(k) { return new Q(this.n ** BigInt(k), this.d ** BigInt(k)); }
  isZero() { return this.n === 0n; }
  modp(p) { const P = BigInt(p); const dn = Number(((this.d % P) + P) % P); if (dn === 0) throw new Error('den divisible by p');
    return (Number(((this.n % P) + P) % P) * inv(dn, p)) % p; }
  toNumber() { return Number(this.n) / Number(this.d); }
  toString() { return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`; }
}
// polynomials with Q coefficients
export const qpoly = {
  add(a, b) { const n = Math.max(a.length, b.length), r = []; for (let i = 0; i < n; i++) r.push((a[i] || new Q(0)).add(b[i] || new Q(0))); return r; },
  mul(a, b) { const r = Array.from({ length: a.length + b.length - 1 }, () => new Q(0));
    for (let i = 0; i < a.length; i++) if (!a[i].isZero()) for (let j = 0; j < b.length; j++) r[i + j] = r[i + j].add(a[i].mul(b[j])); return r; },
  scale(a, c) { return a.map((x) => x.mul(c)); },
  pow(a, k) { let r = [new Q(1)]; for (let i = 0; i < k; i++) r = qpoly.mul(r, a); return r; },
  mono(c, k) { const r = Array.from({ length: k + 1 }, () => new Q(0)); r[k] = c; return r; },
  modp(a, p) { return trim(a.map((c) => c.modp(p))); },
};

export function primesBetween(lo, hi) {
  const out = []; for (let n = Math.max(2, lo); n <= hi; n++) { let ok = true; for (let d = 2; d * d <= n; d++) if (n % d === 0) { ok = false; break; } if (ok) out.push(n); } return out;
}

// Galois certificate helpers
// subset sums reachable from a multiset of degrees
export function subsetSums(pattern) { let s = new Set([0]); for (const d of pattern) { const t = new Set(s); for (const x of s) t.add(x + d); s = t; } return s; }
