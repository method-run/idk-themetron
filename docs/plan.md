---
id: plan
title: "Plan: join the grade math and the friendly inputs"
summary: How themetron joins the contrast math of themetron-3 with the friendly words of the first themetron, then moves to a tree of themes. It lists what we keep, what we change, and the next steps.
parent: idk-themetron
kind: plan
order: 1
aliases: ["Plan: join the grade math and the friendly inputs"]
tags: [system/plan]
---
# Plan: join the grade math and the friendly inputs

<!-- idk-plans:progress:start (generated) -->
◐ 67% (19/28)
<!-- idk-plans:progress:end -->

Two older projects each solved half of the problem. The first themetron had friendly inputs but no control of contrast. themetron-3 had contrast math but asked for technical inputs. This plan joins the strong half of each.

## The two older projects

| | themetron (2017) | themetron-3 (2020) |
|---|---|---|
| Inputs | One primary color, one Google font, and four sliders: roundness, shininess, thickness, depth | Named base colors, fonts, and a "depth" object: elevation, embossed, fullness, shine |
| Output | Bootstrap 4 Sass, compiled in the browser with sass.js | A JavaScript theme object for styled-components |
| Color math | None. Bootstrap darkened the one color. | WCAG luminance. A binary search on HSL lightness finds colors at contrast 7, 4.5, and 3 against a light and a dark background. |
| Strong | Words that anyone can use. One click to see the result. | Colors that pass WCAG by construction. Light and dark modes. Spacing words: compact to loose. |
| Weak | Tied to Bootstrap. No contrast control. Sliders showed raw numbers. | Tied to React. Each palette was made against one background, so two palettes did not match. HSL lightness shifts the hue. Many parts were not finished. |

<details>
<summary>Where to find these parts in the old code</summary>

- themetron: `src/client/app/themes/reducers.jsx` holds the inputs. `selectors.jsx` writes them as Sass variables, such as `$theme-roundness`. The Bootstrap fork in the `bootstrap` submodule reads them.
- themetron-3: `workspaces/theme/src/utils/colors.js` has the luminance and contrast math. `theme-utils.mjs` has `getColors` (the light and dark scales) and `getSizes` (the spacing words). `THEMES.md` has the notes on depth, shine, and button surfaces.

</details>

## What we keep, and what we change

- **Keep the words.** From the first themetron: a few sliders with names that people know. Now each slider also has words for its stops, such as compact, cozy, and spacious. See [Inputs](../spec/inputs.md "inputs").
- **Keep contrast by construction.** From themetron-3: the engine searches for a color with a target luminance. Now it searches in OKLCH, which keeps the hue, not in HSL. See [Grades and contrast](../spec/grades.md "grades").
- **Change palettes to fixed grades.** Each grade has the same luminance in every palette. So a rule such as "50 grades apart passes 4.5:1" works for any two colors. IBM Carbon and the US Web Design System use the same idea.
- **Change the output to tokens.** Not Bootstrap Sass and not a React object. The tokens come as CSS custom properties, DTCG JSON, and a Tailwind theme. See [Tokens](../spec/tokens.md "tokens").
- **Add choices for contrast.** WCAG 2 or APCA. Every theme ships the standard level, and the enhanced level as its more-contrast variant.
- **Add presets.** A preset is a set of feels with a familiar name, such as flat, brutalist, or glass.
- **Add roles.** Components ask for "primary" or "danger", not for a color name.
- **Grow the depth model.** themetron-3 split depth into elevation, shine, fullness, and emboss. Now these are separate feels: depth, shininess, softness, solidity. Emboss is a later task.

## Steps

### 0.0: the first build

- [x] Color math: OKLCH, WCAG 2, APCA, and fixed-luminance grades
- [x] Inputs, words, and presets
- [x] The token builder, with an audit of each pair
- [x] Exports: CSS, DTCG JSON, Tailwind
- [x] A first component library
- [x] The playground
- [x] Tests: the contrast promise for all presets, and the token names that components use
- [x] A formula for the OKLCH lightness at a target luminance, in place of the binary search

### 0.1: a tree of themes

The first build has many named colors and roles in one theme. 0.1 changes this to a tree of themes, with one color in each theme. See [Inputs](../spec/inputs.md "inputs") and [Tokens](../spec/tokens.md "tokens").

| 0.0 | 0.1 |
|---|---|
| Named colors, and roles that point at them | One `color` in each theme. A child theme for each extra color. |
| `--tm-danger-fill` and one set for each role | `--tm-fill-action` in each theme, and `class="theme-danger"` on the part |
| Default colors for success, warning, danger, and info | No built-in colors. You define each theme that you want. |
| Neutral made from the primary hue | `neutral`, with its own color |
| Dark grades picked on their own | Dark mode mirrors the light grades: `g` becomes `100 − g` |
| Three font roles, each set on its own | `font`, with `headingFont` and `monoFont` that inherit from it |

- [ ] Dark mode by mirror grades, with the extra APCA check, and shadows that do not mirror
- [x] The theme tree: parents, inheritance, color themes and full themes
- [x] CSS for the tree: one rule on each theme class, with both modes in each value through `light-dark()`
- [x] DTCG and Tailwind exports for the tree
- [x] Components: read `accent.*`, and drop `data-role`. Theme classes do its job.
- [x] Playground: edit the tree, and show one row of parts for each theme that you define
- [ ] Move the reasons from this plan to the spec pages, then delete this plan

### Roles: base and action

One color for each theme was too few. A gray page with blue buttons is the most usual case, and it needed a theme class on every button. Two colors for each theme, one for each role, fix this. See [Inputs](../spec/inputs.md "inputs") and [Using themetron](../spec/consumers.md "consumers").

| Before | Now |
|---|---|
| `neutral` and `color` | `base` and `action`. `color` sets both. |
| `accent-fill`, `accent-text`, … | `fill-action`, `fg-action`, … : the role is the last part of the name |
| `fg-default`, `border-default`, … | `fg-base`, `border-base`, … |
| No quiet buttons | `fill-base`, `tint-base`, and their labels |
| A color theme set only its color tokens, and took the rest from the page | Each theme class sets every token, from the tree |

- [x] Inputs: `base`, `action`, and `color` for both. Version 2, and version 1 files still load.
- [x] Tokens: the role at the end of each color name, and fills and tints for both roles
- [x] CSS: each theme class sets every token, and themes with the same values share a rule
- [x] Components, playground, example, and specs
- [ ] A test that fails when a stable token goes away and the major version stays the same

<details>
<summary>Notes: how we chose this</summary>

- **"Accent" sounded minor.** The theme's main color is often its most important part. "Key color" is a theme's color in a role, and "action" is the role.
- **Roles, not tokens or elements.** Borrowing one token, such as `fill`, breaks its pairs: the label was chosen for another fill. Borrowing by element, such as `link` or `button`, puts the list of components in the contract. A role is the smallest group that keeps its pairs, and the component chooses it.
- **"Neutral" is only a color.** A theme's base color can be gray or not. A danger theme with `color` has a red base: a pink box with dark red text.
- **The tree, not the page.** A color theme that took its base from the page would look different in each section. Pairs between its action text and that base were not checked either. CSS cannot take a value from a named ancestor, so each class sets every token.
- **Names we did not use:** "key" names the color, not the job. "Accent" sounds minor. "Interactive" is more exact but long. "Color" (as in "black and white or color") is less clear.

</details>

### Later: ideas, not needed for the first release

These ideas come after the 0.1 standard ships. None of them changes the stable tokens, so they can come in a minor version of the contract.

- [ ] **Icon sets.** A selector for an icon set, such as Lucide, Phosphor, or Material Symbols, in each theme. A child takes its parent's set. The stroke width and corner style could follow the thickness and roundness feels.
- [ ] **A role from another theme.** A theme could take a role from another theme by name, such as `"action": "brand"`, in place of a color. Today a role that a theme does not set comes from its parent, which covers most cases.
- [ ] **Colors for each part.** An advanced section for a part, such as buttons or fields, where you pick an ancestor theme for each piece of the part: the fill, the label, the border, and the focus ring. So a button can have the fill of `brand` and the label of `default`. This is finer than the roles. It belongs in the components, so the token contract does not change. The engine checks each pair that this makes, with the audit.
- [x] **Enhanced contrast as a variant of every theme.** Done ahead of the first release: the enhanced level ships with every theme, like light and dark mode. `prefers-contrast: more` and `data-tm-contrast` switch it. See [More contrast](../spec/tokens.md "tokens").
- [ ] **Lightest and darkest limits.** Two sliders in a theme, Lightest and Darkest, in place of the white and black limits of an earlier draft. They clamp the ramps that the engine makes now: the tokens use only the grades between the two limits, such as 4 to 97. See the notes below.
- [ ] **A tinted white and black.** A white and a black color, as an advanced form of the sliders. Their luminance sets the limits. Their hue and chroma blend along the base ramp, so a warm white can sit at one end and a cool black at the other.
- [ ] **Gradients in themes.** The same hue blend, used for gradient fills and backgrounds.
- [x] **A button in the exact key color: `tm-button--exact`.** The key color, exactly, with white or black, light on dark in light mode. Done ahead of the first release, with experimental tokens. See the notes below.

<details>
<summary>Notes: lightest and darkest limits</summary>

- **Clamp, do not renumber.** A grade's luminance comes from its number, and the contrast of two grades comes only from their difference: 21^(difference/100). So the limits cut the ramp to a range of grades, and the tokens are picked inside it. Grade numbers mean the same in every theme, and the `gap-*` tokens do not change. An earlier draft renumbered the grades so that 0 was the theme's own white. That changed what a gap means in each theme, so it is dropped.
- **The sliders cannot make an impossible theme.** Each slider shows a swatch and the contrast that is left for text, such as "leaves 15.2:1". It stops where text would fail: body text needs about 50 grades at the standard level (4.5:1) and about 65 at the enhanced level (7:1), plus room for muted text and surfaces. Enhanced contrast is a variant of every theme, so the sliders stop at its limit. There is no range-check error.
- **Warnings about reduced contrast.** The sliders show the contrast that is left as you drag. The Palettes view marks the grades outside the range, and says how many grades are left between the limits. The Audit view lists each pair that the smaller range makes harder. A theme title bar in the inputs pane shows a mark when that theme's range is clamped, so you see it when the card is closed. The manifest marks the ramp tokens outside the range.
- **All ramps (decided).** The limits clamp the action ramps too, so "lightest" is the lightest color on the page, labels and tints included.
- **Ramp tokens outside the range take the limit color (decided),** such as `--tm-base-0` as the paper white. Then those grades no longer have the luminance of their number, and the manifest says so.
- **Dark mode.** Darkest is the dark end of the dark canvas, so a dark mode that is not pure black comes free.
- **Children take the limits from the tree.** Each theme class sets every token from the tree, so a child of a clamped theme is clamped too, wherever it is on the page.
- **Order:** the sliders and the clamp first, then the tinted white and black, then gradients.

</details>

<details>
<summary>Notes: the exact button</summary>

The partner is the theme's lightest or darkest color, whichever has more contrast with the key color. It is the same in both modes.

The pair has the same polarity as every fill: the darker color is the fill in light mode, and the lighter color is the fill in dark mode. `tm-invert` shows the other version on one button.

| | Light mode | Dark mode |
|---|---|---|
| Background | The darker of the pair | The lighter of the pair |
| Label | The lighter of the pair | The darker of the pair |
| Border | The key color, or `border-base` when the key color is below 3:1 on the canvas | The same rule |

- Navy: navy with white text, then white with navy text. Magenta and pale yellow: black with magenta or yellow text, then magenta or yellow with black text.
- **Why the label polarity (decided).** An earlier draft always put the key color in the light-mode fill. Then light keys had dark labels and dark keys had light labels, so the buttons of one theme set flipped with the color. All buttons in a theme now match. A light key color shows as the label in light mode, and as the fill in dark mode or with `tm-invert`.
- **No label setting (decided).** `fillLabel` let a theme flip all its fills to dark labels in light mode. It was easy to miss, and it made one theme's buttons the opposite of the others. It is removed: light mode is always light on dark, dark mode is always dark on light, and `tm-invert` flips one part.
- **The one pair without a promise (decided).** Every other checked pair is guaranteed, including each fill on the canvas (contract 0.4.0). The exact pair cannot be: moving off the key color would defeat the button. So the audit warns, and does not fail.
- **Contrast.** With pure white and pure black, the better partner always gives at least √21, about 4.58:1, so WCAG 2 AA always passes. The enhanced level, APCA, and clamped limits can fail. Then the audit warns. In the enhanced contrast variant, a failing pair uses the normal button's colors.
- **A pale fill on a pale canvas has almost no edge.** When the key color is below 3:1 on the canvas, the border is `border-base`. In dark mode the same rule gives a navy key a gray edge on its white fill.
- **Tokens (built):** `fill-action-exact`, `on-fill-action-exact`, and `border-action-exact`, all experimental. They point at a new primitive for each role, `action-key` and `base-key`: the key color exactly as given.
- **How often it warns.** Over 120 sample key colors: never at WCAG standard, 34 at WCAG enhanced, 43 at APCA standard, and 88 at APCA enhanced. The audit marks these rows "warn".

</details>
