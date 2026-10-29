import { ddfPattern, mul, isSquarefree, primesBetween } from './polymod.mjs';
// x^4+1: irreducible over Q, splits as 2+2 for p = 3,5,7 mod 8 and 1+1+1+1 for p = 1 mod 8
for (const p of [3, 5, 7, 17, 41, 73, 97, 101]) console.log('x^4+1 mod', p, '(p mod 8 =', p % 8 + ')', ddfPattern([1, 0, 0, 0, 1], p));
// product of known irreducibles mod 101: (x^2+2) irreducible iff -2 non-residue; build (x^3+x+1)(x^2+1)(x+5) mod 2 etc.
const p = 2; console.log('(x^3+x+1)(x^2+x+1)(x+1) mod 2 ->', ddfPattern(mul(mul([1, 1, 0, 1], [1, 1, 1], p), [1, 1], p), p));
// Chebotarev sanity: x^5 - x - 1 has Galois group S5; frequency of 5-cycles should be ~1/5, of (2,1,1,1) ~ 10/120
const counts = {}; let tot = 0;
for (const q of primesBetween(7, 20000)) { const f = [q - 1, q - 1, 0, 0, 0, 1]; if (!isSquarefree(f, q)) continue; const k = ddfPattern(f, q).join(','); counts[k] = (counts[k] || 0) + 1; tot++; }
console.log('x^5-x-1 pattern frequencies:', Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, (v / tot).toFixed(3)])));
console.log('S5 expected: 5:0.200 4,1:0.250 3,2:0.167 3,1,1:0.167 2,2,1:0.125 2,1,1,1:0.083 1^5:0.008');
