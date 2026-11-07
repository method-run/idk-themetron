---
id: tokens
title: Tokens
summary: The design tokens that themetron makes, their names, and their formats. Each theme in the tree becomes one CSS rule. A component library that reads only these tokens works with every themetron theme.
parent: idk-themetron
kind: reference
order: 3
code: [src/tokens.js, src/export.js]
tags: [system/tokens]
---
# Tokens

<!-- idk-plans:progress:start (generated) -->
◐ 38% (5/13) · 2 deferred
<!-- idk-plans:progress:end -->

> **Status:** 0.1 draft. The engine makes these tokens, with one gap: the dark mode does not use mirror grades yet. The [plan](../docs/plan.md "plan") lists them.

Each theme has two layers of tokens:

1. **Primitives** do not change with the mode. They are the two ramps (base and action), fonts, space, radius, borders, motion, and effects.
2. **Semantic tokens** have one value for each mode, light and dark. They say what a color is for, such as `bg.canvas` or `on-fill.action`. Most of them point at a grade of a ramp. A color token's name ends with its role, `base` or `action`, except the backgrounds, which are always base.

Components should use semantic tokens for color, and primitives for everything else. Then a component works in both modes, and in every theme.

## Contract

[`tokens.manifest.json`](./tokens.manifest.json) lists every token: its tier, its type, whether it holds both modes, its role, and whether it is stable. It also lists the color pairs that pass. The code makes it with `npm run spec`, and a test fails when the file and the code differ. [Using themetron in a site or library](./consumers.md "consumers") says what a site or library can depend on.

## Formats

| Format | Function | Use |
|---|---|---|
| CSS custom properties | `toCss(built, { prefix, classPrefix, root })` | Any web page. Names start with `--tm-`. `root: false` leaves out `:root`. |
| DTCG JSON | `toDtcg(built)` | Design tools and token pipelines, such as Style Dictionary. Follows the Design Tokens Community Group format. Each theme is a group. |
| shadcn/ui | `toShadcn(built)` | Its theme variables, for `globals.css`: `--primary`, `--background`, `--radius`, and the rest, in `:root` and `.dark`. Each child theme is a class. |
| Tailwind v4 | `toTailwind(built)` | A `@theme inline` block whose values point at the CSS variables, so theme classes and modes work in utilities too. Use it with the CSS. Grade 5 is Tailwind's 50, grade 10 is 100, and so on. |

A token path such as `on-fill.action` becomes `--tm-on-fill-action` in CSS, and `themes.danger.mode.light.on-fill.action` in DTCG JSON.

## Primitives

| Token | Example | Notes |
|---|---|---|
| `base.<grade>` | `base.90` | The ramp of the base color, from white (0) to black (100). |
| `action.<grade>` | `action.60` | The ramp of the action color. |
| `base.key`, `action.key` | `action.key` | Each role's key color, exactly as given. Not a grade: it has no fixed luminance. The exact button uses it. |
| `gap.text`, `gap.large`, `gap.ui` | `gap.text` = 50 | The [grade gaps](./grades.md "grades") of this theme. Two grades this far apart pass. |
| `font.family.<role>` | `font.family.body` | `body`, `heading`, `mono`. Each one ends in its fallback list. |
| `font.size.<step>` | `font.size.md` | `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, on a 1.2 ratio. |
| `font.weight.<name>` | `font.weight.bold` | `regular`, `medium`, `bold`. |
| `font.lineHeight.<use>` | `font.lineHeight.body` | `body`, `heading`, `control`, as ratios. |
| `font.leading.<step>`, `font.leadingTight.<step>` | `font.leading.md` | The line height in px for each text size, on the rhythm grid. Tight is for headings and controls. |
| `rhythm` | `rhythm` = 4px | The grid: 4 px squares in every theme. Space steps, line heights, and the heights of parts are whole multiples of it. |
| `space.<step>` | `space.md` | `xs` to `3xl`. |
| `control.height`, `control.heightSm`, `control.heightLg`, `control.paddingX`, `control.paddingY` | | For buttons, fields, and avatars. Heights are whole rhythm steps. |
| `radius.<step>` | `radius.control` | `sm`, `md`, `lg`, `control`, `controlSm`, `controlLg`, `full`. Each control radius is a pill at full roundness, for its own control size. `sm`, `md`, and `lg` round as far as the padding of the parts that use them. |
| `roundness` | `roundness` | The roundness feel, from 0 to 1. A part of height `h` that has no radius token of its own rounds by `roundness × h ÷ 2`, so it is a pill at 1. The components use it for badges, switches, and progress bars. Experimental. |
| `border.width`, `border.focusWidth` | | The focus width is at least 2 px. |
| `duration.<speed>` | `duration.base` | `fast`, `base`, `slow`. |
| `easing.<use>` | `easing.enter` | `standard`, `enter` (can overshoot), `exit`. |
| `effect.gloss`, `effect.panelBlur`, `effect.lift` | | A CSS gradient, a blur radius, and the hover lift. |

## Semantic tokens

Each mode has these tokens. The engine picks each grade so that the pairs in the Checks column pass the contrast setting. The two roles have the same fills and tints: `fill.base` and `fill.action`, `tint.base` and `tint.action`, and so on. Base fills and tints are for quiet controls, such as a secondary button. Text and borders for the action role are `fg.action` and `border.action`.

| Token | Meaning | Checks |
|---|---|---|
| `bg.canvas` | The page background | |
| `bg.surface` | Cards and other parts on the canvas | |
| `bg.sunken` | Wells, code, and tracks | |
| `bg.field` | Inside text fields. Sunken when there are no borders. | |
| `bg.panel` | `bg.surface`. It was see-through at low solidity; solidity is removed for now. | Computed |
| `fg.base` | Body text | text, on canvas, surface, and sunken |
| `fg.base-muted` | Secondary text | text, on canvas, surface, and sunken |
| `fg.base-subtle` | Placeholders and icons | ui, on canvas |
| `border.base` | Dividers and card edges | None. It is decoration. |
| `border.base-strong` | The edges of fields and controls | ui, on surface |
| `border.focus` | Focus rings | ui, on surface |
| `fill.<role>` | The background of a solid part, such as a button | ui, on canvas |
| `on-fill.<role>` | Text and icons on the fill | text, on fill and fill-hover |
| `fill.<role>-hover`, `fill.<role>-active` | The fill when you point at it, and when you press it | |
| `tint.action`, `tint.action-hover` | A light wash of the action color, for soft buttons, badges, and selected rows | |
| `tint.base`, `tint.base-hover` | One grade beyond the canvas and the surface, so a quiet button shows on both | |
| `on-tint.<role>` | Text on the tint. For base, the body text color when it passes. | text, on tint and tint-hover |
| `fg.action` | Colored text on the canvas, such as links | text, on canvas and surface |
| `border.action` | Colored borders | ui, on surface |
| `fill.action-exact`, `on-fill.action-exact` | The exact button: the key color, with the lightest or darkest base color, whichever has more contrast. Like every fill, light mode puts the lighter color on the darker one, and dark mode mirrors it. | text, as a warning only. The more-contrast variant uses the normal button's colors where it fails. |
| `border.action-exact` | The exact button's edge: the key color, or `border.base` when the key color is below 3:1 on the canvas | |
| `gloss.<role>-top`, `gloss.<role>-bottom` | The shine on solid fills: up to two grades lighter at the top and one darker at the bottom, as shininess allows | text, on-fill on each |
| `gloss-<role>` | A gradient of the two gloss grades over the fill, or `none`. It blends in OKLCH (`linear-gradient(180deg in oklch, …)`), so the shine keeps the fill's hue. CSS only. | Built from the two above |
| `elevation.1`, `.2`, `.3`, `elevation.inset` | Box shadows. Empty for now: depth and softness are removed. | Computed |
| `highlight` | An inset top highlight for shiny parts | Computed |

Each theme has an audit: a list of the checked pairs, with the WCAG ratio, the APCA Lc value, and pass or fail. The playground shows it.

<details>
<summary>How the engine picks the grades</summary>

- **Backgrounds.** Light mode: canvas 5, surface 0, sunken 10. Dark mode: canvas 95, surface 90, sunken 100.. Card edges (`panel.border`) are the same grade as `border.base`. If no grade of text can pass on these backgrounds, the engine moves them toward white or black.
- **Text.** `fg.base` is grade 90 (light) or 5 (dark) if that passes. `fg.base-muted` and `fg.base-subtle` are the first grades out from the canvas that pass.
- **Fills.** Every fill has light labels in light mode, and dark labels in dark mode, whatever the key color. The fill is the grade nearest the key grade where that label passes, and that stands out from the canvas (3:1). So a yellow key color makes a deep golden fill with a light label. To show a part the other way, put `tm-invert` on it. Hover and active move the fill away from the label, so the contrast only grows.
- **Shine.** `gloss.<role>-top` and `gloss.<role>-bottom` are lighter and darker grades of the fill's ramp, as far as the label still passes.
- **Tints.** Action tints are grade 5 (light) or 95 (dark). Base tints are one grade beyond the canvas and the surface, toward the text, because those grades already hold the base color. The hover tint is one grade further, or the tint itself when no label passes on it.
- **Action text and borders.** The grade nearest the key grade that passes on all backgrounds.
- **If nothing passes.** The engine takes the grade with the most contrast, and the audit marks the pair as failed.

</details>

### Applying a theme

Put the class `theme-<name>` on an element. The theme applies to that element and to everything in it. The nearest theme class around an element wins. Put one theme class on an element.

```html
<button class="tm-button theme-danger">Delete</button>

<section class="theme-playful">
  <button class="tm-button">Join</button>
  <button class="tm-button theme-danger">Leave</button>
</section>
```

Both danger buttons look the same: danger's colors, and the shape and fonts of danger's parent, `default`. A theme class sets every token from the theme's place in the tree, not from the section around it. For a danger button with playful's shape, add a child of `playful` that sets the danger color. The `default` theme also applies to `:root`, so a page without any theme class uses it.

- **Only the themes you define exist.** Themetron does not add status themes, such as danger or success, with its own colors. You add each one as a child theme, with your color.
- **An unknown theme does nothing.** If a page uses `theme-danger` and there is no `danger` theme, no CSS rule matches. The element keeps the theme around it. So a component library can put `theme-danger` on its error messages, and they still work in a theme set without a danger theme.
- **The class prefix** is `theme-` by default. `toCss(built, { classPrefix })` changes it, for example to `t-` or to an empty string.

<details>
<summary>Why a class, and not a data attribute</summary>

A class is what most people and tools already use to style an element: plain HTML, `className` in React, `class:` bindings, and Tailwind-style class lists. It needs no new attribute, and it combines with the component classes in one place. A class and an attribute selector have the same specificity, so the choice does not change the cascade.

</details>

## Light and dark mode

The light mode comes first. The dark mode uses the mirror grade of each light token: if `fg.base` is `base.90` in light mode, it is `base.10` in dark mode.

- **WCAG 2.** The contrast of two grades depends only on their difference, and the mirror keeps every difference. So each pair that passes in light mode passes in dark mode too.
- **APCA.** APCA scores light text on a dark background lower than dark text on a light background. So with `apca`, the engine checks the dark mode again, and moves a token one grade further from its background where it must. The audit shows these changes.
- **Raised surfaces are not mirrored.** In dark mode, raised surfaces are one grade lighter than the canvas, not darker.

## CSS

Each theme class sets every token of its theme. The values come from the theme's place in the tree, so a theme looks the same wherever it is on a page. The `default` theme also applies to `:root`.

Themes that have the same values in a group of tokens share one rule for that group. There are three groups: the base role, the action role, and the rest (fonts, sizes, feels, and gaps).

```css
:root, .theme-default, .theme-brand { /* default's base tokens: brand sets only action */ }
.theme-danger                       { /* danger's base tokens */ }
:root, .theme-default               { /* default's action tokens */ }
.theme-danger                       { /* danger's action tokens */ }
.theme-brand                        { /* brand's action tokens */ }
```

- **One token, one rule.** Each theme gets each token from exactly one rule, and all the selectors have the same specificity. So the order of the rules does not matter.
- **Semantic tokens point at grades.** A value such as `var(--tm-base-90)` is resolved on each element, from that element's own ramp. So many semantic tokens have the same text in every theme, and share a rule.
- **The mode.** Each color value holds both modes, such as `light-dark(var(--tm-base-5), var(--tm-base-95))`. The browser picks one from the `color-scheme` where the value is used. `:root` gets `color-scheme: light dark`, so pages follow the system setting. `data-tm-mode="dark"` or `"light"` on an element sets one mode for that element and its children. So a theme needs only one set of rules, and a theme class works the same in a light section and a dark one.
- **Invert.** `class="tm-invert"` shows an element, and everything in it, in the other mode: a light-mode part on a dark page, or the reverse. Every color token holds both modes, so the class only flips `color-scheme`, and sets the text color again. An invert inside an invert is not supported.
- **Shadows around an inverted part.** `elevation-1`, `-2`, and `-3` fall on the page around a part, so an inverted part keeps the page's mode for them. Otherwise a light card on a dark page would get a white glow from the light-mode shadow. Each has two internal twins: `-flipped`, with the modes swapped, which the inverted part uses, and `-normal`, which gives the parts inside it their usual shadows again. `elevation-inset` and `highlight` are inside the part, so they flip with it. While depth is removed, the shadows are empty.
- **See-through fills on an inverted part.** An inverted button uses the other mode's fill over this mode's page: a light fill with a dark label on a light page. The page showing through keeps the fill on its label's far side, so the fill can be very see-through: `fill-alpha-inverted`, down to 5% at solidity 0. Tints have their own opacity, `tint-alpha`, for soft, quiet, outline-hover, and ghost-hover buttons, and `tint-alpha-inverted` for inverted ones. An inverted tint is a dark tint with a light label on a light page, so the page showing through works against the label, and it usually stays solid. Each opacity starts from the solidity and rises only until each label passes. `tm-invert` uses the inverted opacities, and the parts inside get `fill-alpha-normal` and `tint-alpha-normal` back. While solidity is removed, every part is opaque, so these opacities are all 1.
- **See-through cards on an inverted part.** An inverted card is the other way round: a light card on a dark page darkens as the page shows through, and its dark text fails. So `bg-panel-inverted` is raised until body and muted text pass on the card as seen over the other mode's page. In practice an inverted card is nearly solid at any solidity. `tm-invert` uses it, and cards inside get `bg-panel-normal` back. While solidity is removed, cards are opaque, so both are `bg-surface`. The edge against the page is not checked: an inverted part sits on the other mode's canvas, which no pair covers.

<details>
<summary>Why it works this way</summary>

- **Checks, not fixed grades.** A fixed rule, such as "a fill is grade 50", would ignore the key color: a pale yellow and a deep navy would both land on 50. The engine starts at the key color and moves only as far as the label and the contrast setting need.
- **One label polarity.** If the label color followed each key color, light colors would get dark labels and dark colors light ones, and buttons in one theme set would flip for no reason you chose. With one polarity, all buttons match. `tm-invert` flips one part on purpose.
- **Aliases to grades.** A semantic token that names its grade, such as `--tm-fill-action: var(--tm-action-60)`, shows where its contrast comes from, and other tools can follow the alias.
- **Flat selectors, not nested ones.** `.theme-default .theme-danger` would make danger work only inside default, and the specificity would grow at each level. The tree is in the generator, not in the selectors.
- **Every token on every class.** CSS has no way to take a value from a named ancestor: `inherit` reads the parent element, and style queries and `@scope` see only the nearest match. So a theme that left tokens out would take them from wherever it sits on the page. Setting every token is the only way to make a theme independent of the page. The CSS is generated, so the repetition costs nothing to keep up, and shared rules keep it small.
- **DTCG.** It is the common format for design tokens. Many tools read it, so themetron does not need a plugin for each tool.

</details>

## More contrast

Every theme ships a second set of semantic tokens at the enhanced level, for readers who ask for more contrast. It uses the same ramps, so only the grades that the tokens pick change, and the `gap-*` tokens. Themes share these rules as they share the others. The token names stay the same, so components need no change.

```css
@media (prefers-contrast: more) { .theme-danger { /* the tokens that change */ } }
@scope ([data-tm-contrast="more"]) { :scope:is(.theme-danger), .theme-danger { /* the same */ } }
@scope ([data-tm-contrast="base"]) { :scope:is(.theme-danger), .theme-danger { /* the base values again */ } }
```

- **The reader's setting.** `prefers-contrast: more` turns the variant on. Operating systems set it, for example "Increase contrast" on macOS and iOS.
- **A switch on the page.** `data-tm-contrast="more"` turns it on for an element and everything in it, and `"base"` turns it off, whatever the reader's setting. Put it on `<html>`, or on an element with a theme class. On another element it changes only the theme classes inside it. Scoped rules beat unscoped ones, and the nearest scope wins, so the attribute beats the media query, and the nearest attribute wins.
- **Leaving it out.** `toCss(built, { more: false })` makes CSS without the variant. DTCG has it as a `moreContrast` group in each theme. The Tailwind export reads the CSS variables, so it follows the variant. The shadcn/ui export does not have it yet.
- **APCA at the enhanced level, light mode.** No label passes on the usual hover tint, grade 10, so the hover tint is the same as the tint. A soft button then shows its hover by its lift only.

## Compatible libraries

A component library or a theming tool is compatible with themetron when:

1. It reads colors only from semantic tokens, or from ramp grades that it checks with the theme's `gap.*` tokens.
2. It reads size, shape, and motion only from primitives.
3. It changes color only with theme classes, and does not name a ramp or a hex value. It can use theme names, such as `theme-danger`, and it still works when the theme set does not define them.

Then any themetron theme set works with it, and so do the inputs and the playground.

## Tasks

- [x] Version the token names, and list changes in a changelog. See [consumers](./consumers.md "consumers").
- [ ] Export for Bootstrap 5 Sass variables, like the first themetron
- [x] Export for shadcn/ui theme variables
- [ ] Export for MUI, DaisyUI, and Bootstrap 5 theme variables
- [ ] Add a command-line tool: `themetron build inputs.json --format css`
- [ ] Use the DTCG resolver format for themes and modes, when tools support it
