---
id: hsl-lightness
title: HSL lightness for a target luminance
summary: Research with proofs. There is no closed form for the HSL lightness that gives a target WCAG luminance, except in a few cases. A fast solver finds it exactly instead.
parent: grades
kind: reference
order: 2
code: [src/hsl.js, docs/research/hsl/]
aliases: [HSL lightness for a target luminance]
tags: [system/tokens/grades/hsl-lightness]
---
# HSL lightness for a target luminance

The question: for a fixed HSL hue H and saturation S, is there a formula for the lightness L that gives a target WCAG 2 luminance Y? For OKLCH there is one, a cubic. See [Grades and contrast](../../spec/grades.md "grades").

**The answer: no formula in general.** For most hues and saturations, L is a root of an irreducible polynomial of degree 300 whose Galois group is the full symmetric group S₃₀₀. So no expression with roots can give L. There is a formula only in these cases:

- **Grays (S = 0):** L is the sRGB encoding of Y.
- **The darkest piece**, where every channel is in the linear toe of the sRGB curve (L ≤ 0.04045 / (1 + S)): L = 12.92 Y / (1 − S μ(H)), with μ(H) = Σ wᵢ mᵢ(H).
- **S = 1 at hues 0°, 60°, …, 300°:** only one channel group changes. With W = 0.2126, 0.9278, 0.7152, 0.7874, 0.0722, 0.2848 for those hues: if Y ≤ W, L = ½ enc(Y / W); else L = ½ (1 + enc((Y − W) / (1 − W))).

**What themetron does instead:** [src/hsl.js](../../src/hsl.js) finds the piece of the curve that holds the target, starts from a guess that has a formula, and takes one or two Halley steps. The answer is as exact as a 60-step binary search: the largest luminance error was 1.0e-15. It is about 15 times faster. In about 5.7 million test solves it never needed more than 2 Halley steps.

The research was done by an AI subagent (Claude), at the request of the project owner. The proofs below are its report, checked by running its scripts again.

<details>
<summary>1. The shape of the curve</summary>

In CSS Color 4, each channel is cᵢ = L − S · min(L, 1 − L) · mᵢ(H), with mᵢ = clamp(min(k − 3, 9 − k), −1, 1). In each 60° sector one channel has m = −1 (the largest), one has m = +1 (the smallest), and the third has m = t ∈ [−1, 1], linear in H.

- Lower half (L ≤ ½): cᵢ = αᵢ L, with αᵢ = 1 − S mᵢ ∈ [0, 2].
- Upper half (L ≥ ½): cᵢ = 1 − βᵢ (1 − L), with βᵢ = 1 + S mᵢ ∈ [0, 2].

Each channel crosses the toe cut 0.04045 at most once, so [0, 1] splits into at most 7 pieces. On each piece, Y is an affine toe part plus Σ wᵢ((pᵢ L + qᵢ) / 1.055)^(12/5) over different affine functions.

</details>

<details>
<summary>2. Monotonicity and slope bounds</summary>

The sRGB decode f is strictly increasing on [0, 1]. At c = 0.04045 the power branch is slightly above the toe, so the curve jumps up by 2.33e-9 there.

**Theorem 1.** For S ∈ [0, 1], Y(L) rises strictly from 0 to 1. It is continuous except for upward jumps of at most 2.33e-9 · wᵢ at the toe crossings. On each piece it is smooth and convex (Y′ > 0, Y″ ≥ 0, Y‴ ≥ 0).

*Proof.* Every channel slope is ≥ 0 and f is increasing, so Y does not fall. In the lower half the largest channel has slope 1 + S ≥ 1, and in the upper half the smallest channel does, so Y rises strictly on each half. On a piece, each term is one branch of f applied to an affine function, and the derivatives of ((c + 0.055) / 1.055)^2.4 up to order 3 are ≥ 0 for c > −0.055. ∎

So each target has one answer, and binary search and Newton-type methods are safe.

**Theorem 2.** Lower half: Y′ ≥ (1 − S μ(H)) / 12.92. Upper half: Y′ ≥ (1 + S μ(H)) / 12.92, with μ(H) ∈ [−0.8556, 0.8556]. Everywhere: 0.0111765 ≤ dY/dL ≤ 4.22127. Both bounds are reached at S = 1.

*Proof.* Y′ = Σ wᵢ f′(cᵢ) cᵢ′, with 1/12.92 ≤ f′ ≤ 2.4/1.055 on [0, 1], and Σ wᵢ cᵢ′ = 1 ∓ S μ. μ is linear on each sector, so its extremes are at multiples of 60°. ∎

</details>

<details>
<summary>3. Why there is no formula</summary>

"Formula" here means an expression with roots, in the sense that Cardano's formula solves the OKLCH cubic.

On a piece with k channels in the power branch, let a = u₁^(1/5), where u₁ = (c₁ + 0.055) / 1.055. Then a⁵ is affine in L, so L has a formula exactly when a does. Clearing the fifth roots gives a polynomial of degree 12 · 5^(k−1): 12 for one power channel, 60 for two, and 300 for three. OKLab has the integer exponent 3. HSL has 12/5 and different affine arguments. That is the whole difference.

**Certificates.** All the constants are rational. For each case, the scripts pick a rational (H, S, Y) whose real answer is on that piece, and factor the polynomial modulo many primes. By Dedekind's theorem each factor pattern is the cycle type of a Frobenius element. In each case:

1. The polynomial is irreducible over Q: the only degree sums that every pattern shares are 0 and n.
2. A power of one Frobenius element is a prime cycle of length ℓ, with n/2 < ℓ ≤ n − 3. So the group is primitive and contains Aₙ (Jordan, 1873).
3. One pattern is odd, so the group is Sₙ.

| Case | Piece | H, S, Y | n | Group |
|---|---|---|---|---|
| T1 | lower half, 1 power + 2 toe | 30°, ½, 1/400 | 12 | S₁₂ |
| T2 | lower half, 2 power | 0°, ½, 1/20 | 60 | S₆₀ |
| T2s1 | lower half, S = 1 | 30°, 1, 1/20 | 60 | S₆₀ |
| T2t | lower half, 2 power + 1 toe | 30°, 0.95, 1/20 | 60 | S₆₀ |
| T2u | upper half, 2 power | 0°, ½, ½ | 60 | S₆₀ |
| T3 | lower half, 3 power | 30°, ½, 1/20 | 300 | S₃₀₀ |
| T3b | lower half, 3 power | 200°, 0.3, 1/10 | 300 | S₃₀₀ |
| T3u | upper half, 3 power | 30°, ½, ½ | 300 | S₃₀₀ |
| T3u22 | upper half, pure power 2.2 | 30°, ½, ½ | 275 | S₂₇₅ |

From one specialisation to "L as a function of Y": the specialised group embeds in the group over Q(Y), so that group is Sₙ too. Its geometric part is a nontrivial normal subgroup, so it contains Aₙ, which is not solvable. So L(Y) has no expression with roots on any interval of Y. By Khovanskii's topological Galois theory, it has no expression with elementary functions and integrals either. That result is cited, not derived here.

**Limits.** The certificates are for the listed points. By Hilbert's irreducibility theorem, the group stays Sₙ for other rational (H, S) outside a thin set, which is not described beyond the cases with formulas. A thin piece of the upper half (one power channel plus the toe, S t > 0.919) was not checked on its own. It has the same form as T1.

</details>

<details>
<summary>4. A pure power instead of the sRGB curve</summary>

With f(c) = c^γ, the lower half has a formula for every H and S: Σ wᵢ (αᵢ L)^γ = K · L^γ, so L = (Y / K)^(1/γ). The 0.055 offset of real sRGB is what breaks this. The upper half has no formula even with a pure power (T3u22).

The cost is too high for contrast checks: up to 6.7% error in the contrast ratio with γ = 2.2, and 17.5% with γ = 2.4. So themetron does not use it.

</details>

<details>
<summary>5. The solver, and what is proven about it</summary>

1. Choose the half: compare Y with Y(½).
2. Choose the piece: evaluate Y at the toe crossings in that half, from the top down. A target inside a 2.3e-9 jump returns the crossing. On the all-toe piece the linear answer is exact.
3. Start from a fitted curve Y ≈ K + C (L − L₀)^2.4 through both ends of the piece and the ratio of their slopes, inverted with a formula. It is exact when one channel group changes. The measured start error is at most 1.1e-3 in the lower half and 4.2e-3 in the upper half.
4. Take Halley steps inside a bracket. A step is taken only if it stays in the bracket and the error at least halves; if not, the bracket is cut in half.

**Proven:** the method converges from any start, because the bracket always holds the answer. Near the answer the error goes from e to about C e³, with |C| ≤ 215. After the fact, |L − L*| ≤ |Y(L) − Y| / 0.0111765.

**Measured, not proven:** that 2 Halley steps are always enough. The code does not depend on this: the convergence test and the bisection fallback stay in place. The fallback never ran in the tests.

</details>

<details>
<summary>6. Measured results, and the scripts</summary>

| Measure | Result |
|---|---|
| Largest luminance error | 1.0e-15 (60-step bisection: 7.8e-16) |
| Halley steps | 0: 8.5%, 1: 29%, 2: 62%, never 3 |
| Cost of one solve | at most 12 `Math.pow` calls (bisection: up to 180) |
| Speed | 1.3 to 1.5 µs against 21 µs for bisection, about 15 times faster |

The scripts are in `docs/research/hsl/`. Run them with Node from that folder:

- `node selfcheck.mjs [N] [seed]`: compares the solver with a 60-step bisection.
- `node sweep.mjs`: a stress test over millions of solves.
- `node analysis.mjs`: the slope bounds, convexity, constants, and start errors.
- `node power-approx.mjs`: the pure-power errors.
- `node galois.mjs T1|T2|T3|T3b|T3u|T3u22|extra|selftest`: the Galois certificates. `polymod.mjs` does the polynomial arithmetic modulo p, and `test_polymod.mjs` tests it. The `.log` files are earlier runs.
- `node numeric_checks.mjs`: checks that the real HSL answers are roots of the certified polynomials.

</details>
