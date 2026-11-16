---
id: grades
title: Grades and contrast
summary: Each key color becomes a palette of 21 grades, 5 apart. A grade has the same luminance in every palette, so the grade numbers alone tell you which pairs pass contrast.
parent: tokens
kind: reference
order: 1
code: [src/palette.js, src/color.js]
aliases: [Grades and contrast]
tags: [system/tokens/grades]
---
# Grades and contrast

<!-- idk-plans:progress:start (generated) -->
◐ 71% (5/7) · 2 deferred
<!-- idk-plans:progress:end -->

Each key color becomes a palette of 21 grades, 5 apart: 0, 5, 10, 15, and so on to 100. Grade 0 is pure white and grade 100 is pure black. The grades between them keep the hue of the key color.

Within a theme, a grade has the same luminance in every palette. So `harbor.20` and `coral.20` are equally light, and the contrast between two grades depends only on the grade numbers. A green 40 on a red 90 has the same contrast as a blue 40 on a gray 90.

## The grade gap

The grade gap is the smallest difference between two grade numbers that always passes. It is true for any two palettes, in both directions.

| Method | Level | Text | Large text | Controls |
|---|---|---|---|---|
| WCAG 2 | standard | 50 | 40 | 40 |
| WCAG 2 | enhanced | 65 | 50 | 40 |
| APCA | standard | 85 | 75 | 65 |
| APCA | enhanced | 95 | 85 | 75 |

For example, with WCAG 2 at the standard level, any grade 10 on any grade 60 passes for body text. Each theme also states its own gaps in its tokens, because the engine measures them from the real palettes.

APCA does not give the same result in both directions, and it gives less contrast to dark pairs than WCAG 2 does. So the APCA gaps are larger. The engine checks each real pair, so a theme can still pass with smaller gaps in the places where it uses them.

## Text size and weight

The engine checks body text and headings at their real size and weight. Body text uses the body size at regular weight (400). Headings use their own size, at regular weight (400). The components set headings in bold, and bold text needs less contrast, so this is the safe side. It holds for any heading weight from regular to bold.

- **WCAG 2.** Text of 24 px or more is large text. Smaller text is body text. The engine does not use the WCAG 2 rule for bold text (18.66 px and bold), so the WCAG 2 results do not change.
- **APCA.** APCA's font table gives the minimum Lc for each size and weight. Larger and bolder text needs less contrast. The engine uses the next larger Lc row (rows are 5 apart) and the next lighter weight column, so it never asks for less than the table.
- **The body-text cap.** The table asks Lc 90 for body text of 16 px, and more for smaller text. On most canvases, no grade has that much contrast. So the APCA minimum for text is never more than the fixed body-text minimum: Lc 75 at the standard level, and Lc 90 at the enhanced level. Thus body text uses the same minimum as before, and only large text gets a smaller minimum.
- **The enhanced level.** The enhanced level adds Lc 15 to the table value, the same step as for the fixed minimums.
- **The floor.** The WCAG 2 minimum always applies too.

For the default sizes, the minimums are:

| Text | Size and weight | WCAG 2 standard | APCA standard | APCA enhanced |
|---|---|---|---|---|
| Body text | 16 px, 400 | 4.5:1 | Lc 75 | Lc 90 |
| `fg.base-heading-lg` (h3) | 19 px, 400 | 4.5:1 | Lc 75 | Lc 90 |
| `fg.base-heading-2xl` (h2) | 28 px, 400 | 3:1 | Lc 55 | Lc 70 |
| `fg.base-heading-3xl` (h1) | 33 px, 400 | 3:1 | Lc 50 | Lc 65 |

The grade gaps in the table above still use the fixed minimums for text, large text, and controls.

<details>
<summary>How it works</summary>

**Luminance of each grade.** Grade `g` has WCAG luminance `Y = 1.05 × 21^(−g/100) − 0.05`. The contrast ratio of two grades is then `21^(difference/100)`. A difference of 50 gives 4.58:1, and 40 gives 3.38:1.

| Grade | Luminance | On white | On black |
|---|---|---|---|
| 0 | 1.000 | 1.00:1 | 21.00:1 |
| 5 | 0.852 | 1.16:1 | 18.03:1 |
| 10 | 0.724 | 1.36:1 | 15.49:1 |
| 15 | 0.615 | 1.58:1 | 13.30:1 |
| 20 | 0.521 | 1.84:1 | 11.42:1 |
| 25 | 0.440 | 2.14:1 | 9.81:1 |
| 30 | 0.371 | 2.49:1 | 8.42:1 |
| 35 | 0.312 | 2.90:1 | 7.24:1 |
| 40 | 0.261 | 3.38:1 | 6.21:1 |
| 45 | 0.217 | 3.94:1 | 5.34:1 |
| 50 | 0.179 | 4.58:1 | 4.58:1 |
| 55 | 0.147 | 5.34:1 | 3.94:1 |
| 60 | 0.119 | 6.21:1 | 3.38:1 |
| 65 | 0.095 | 7.24:1 | 2.90:1 |
| 70 | 0.075 | 8.42:1 | 2.49:1 |
| 75 | 0.057 | 9.81:1 | 2.14:1 |
| 80 | 0.042 | 11.42:1 | 1.84:1 |
| 85 | 0.029 | 13.30:1 | 1.58:1 |
| 90 | 0.018 | 15.49:1 | 1.36:1 |
| 95 | 0.008 | 18.03:1 | 1.16:1 |
| 100 | 0.000 | 21.00:1 | 1.00:1 |

**Color of each grade.** The engine converts the key color to OKLCH. For each grade, it calculates the OKLCH lightness that gives the target WCAG luminance. The hue stays the same. The chroma is the chroma of the key color, less toward the ends of the scale, and less where the sRGB gamut has no room.

**The lightness formula.** In OKLab, each of the three cone values is `(L + kᵢ)³`. Each `kᵢ` depends only on the hue and chroma. WCAG luminance is a weighted sum of the cone values, and the weights add up to 1. So, for a fixed hue and chroma:

`Y = w₁(L + k₁)³ + w₂(L + k₂)³ + w₃(L + k₃)³`

This is a cubic in `L`, and Cardano's formula solves it. For a gray, every `kᵢ` is 0, so `L = ∛Y`. The weights are about −0.0408, 1.1125, and −0.0717. See `lightnessForLuminance` in [src/color.js](../src/color.js).

The formula is exact while the color is in the sRGB gamut. When the full chroma is out of the gamut, the engine does a short binary search on chroma only, and uses the formula at each step. This is about 16 times faster than the earlier search on lightness with a search on chroma inside it. The colors are the same, within 1/255.

**Key grade.** The key grade is the grade at which the key color itself sits, such as 58.2. Semantic tokens prefer grades near it, so the theme looks like its key colors.

**Grade gaps.** `gradeGaps` tests every pair of grades in every pair of palettes, in both directions. The gap is the smallest difference larger than the largest difference that fails.

**APCA.** The engine uses APCA-W3 version 0.0.98G-4g. The tests check it against the reference values. The font table is `fontLookupAPCA` from apca-w3 0.1.9 (table version 0.1.7 G, May 2022). See `apcaMinLc` and `minContrast` in [src/palette.js](../src/palette.js).

</details>

<details>
<summary>Why it works this way</summary>

- **Fixed luminance, not contrast against one background.** themetron-3 made each palette against its own background, so two palettes did not line up. With fixed luminance, one rule works for all palettes, and designers can mix colors freely. IBM Carbon and the US Web Design System use the same idea.
- **An exponential scale.** With equal steps in luminance, the contrast between neighbors would be large at the dark end and small at the light end. The exponential scale gives each step of 10 the same contrast ratio, 1.36:1.
- **OKLCH, not HSL.** A change of HSL lightness also changes the hue and the felt saturation, so blues turned purple. OKLCH keeps the hue.
- **Every 5 grades.** Most rules choose from the grades 10 apart, plus 5 and 95 near white and black. Hover and press states use all of them, so a tint at 5 has neighbors at 15 and 25, the same distance apart as in the middle of the scale.
- **Grade numbers from 0 to 100.** The US Web Design System uses the same numbers and the same idea of a "magic number". Multiply by 10, and grades 5 to 95 match Tailwind's 50 to 950.

</details>

## Tasks

- [x] Let a theme choose the color model of its ramps: OKLCH or HSL
- [x] Drop the "both" contrast method: APCA keeps the WCAG 2 minimums as a floor
- [x] Find an exact formula for the HSL lightness at a target luminance, or prove that there is none. There is none in general; see [HSL lightness](../docs/research/hsl-lightness.md "hsl-lightness").
- [ ] Add OKHSL as a color model: true hues, and a saturation that always fits the gamut
- [>] Add HCT (Material 3) as a color model. It needs CAM16, or Google's library.
- [>] Allow wider-gamut ramps in Display P3
- [x] Use APCA's font-size and weight table, so that large text can use a smaller gap
- [x] Check text on see-through panels against the lightest and darkest backdrops
- [ ] Give the tints less chroma for very bright key colors, such as green
