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
◐ 46% (6/13) · 2 deferred
<!-- idk-plans:progress:end -->

> **Status:** 0.1 draft. The engine makes these tokens.

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
| Bootstrap 5 Sass | `toBootstrapSass(built)` | Sass variables, such as `$primary`, `$body-bg`, `$border-radius`, and `$box-shadow`. Import the file before Bootstrap. Sass variables are fixed when Sass compiles, so they hold the root theme's light-mode values. The Bootstrap 5.3 `*-dark` variables, such as `$body-bg-dark`, hold its dark-mode values. `$success`, `$info`, `$warning`, and `$danger` come from themes with those names. Other child themes are not in it. |

A token path such as `on-fill.action` becomes `--tm-on-fill-action` in CSS, and `themes.danger.mode.light.on-fill.action` in DTCG JSON.

## Primitives

| Token | Example | Notes |
|---|---|---|
| `base.<grade>` | `base.90` | The ramp of the base color, from white (0) to black (100). |
| `action.<grade>` | `action.60` | The ramp of the action color. |
| `base.key`, `action.key` | `action.key` | Each role's key color, exactly as given. Not a grade: it has no fixed luminance. The exact button uses it. |
| `gap.text`, `gap.large`, `gap.ui` | `gap.text` = 50 | The [grade gaps](./grades.md "grades") of this theme. Two grades this far apart pass. |
| `font.family.<role>` | `font.family.body` | `body`, `heading`, `mono`. Each one ends in its fallback list. |
| `font.size.<step>` | `font.size.md` | `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`. Sizes above `md` grow by a ratio from the type variance: 1.2 by default. See [Type sizes](./inputs.md#type-sizes). |
| `font.weight.<name>` | `font.weight.bold` | `regular`, `medium`, `bold`. |
| `font.lineHeight.<use>` | `font.lineHeight.body` | `body`, `heading`, `control`, as ratios. |
| `font.leading.<step>`, `font.leadingTight.<step>` | `font.leading.md` | The line height in px for each text size, on the rhythm grid. Tight is for headings and controls. |
| `rhythm` | `rhythm` = 4px | The grid: 4 px squares in every theme. Space steps, line heights, and the heights of parts are whole multiples of it. |
| `space.<step>` | `space.md` | `xs` to `3xl`. |
| `control.height`, `control.heightSm`, `control.heightLg`, `control.paddingX`, `control.paddingY` | | For buttons, fields, and avatars. Heights are whole rhythm steps. |
| `radius.<step>` | `radius.control` | `sm`, `md`, `lg`, `control`, `controlSm`, `controlLg`, `full`. Each control radius is a pill at full roundness, for its own control size. `sm`, `md`, and `lg` round as far as the padding of the parts that use them. |
| `roundness` | `roundness` | The roundness feel, from 0 to 1. A part of height `h` that has no radius token of its own rounds by `roundness × h ÷ 2`, so it is a pill at 1. The components use it for badges, switches, and progress bars. Experimental. |
| `border.width`, `border.focus` | | The edge width, from thinness: `round((1 − thinness) × 4)` px, so 4 px at 0, 1 px at the default (0.8), and 0 at thinness 1. CSS: `border-width` and `panel-border-width`. The focus width is `max(2, width + 1)` px. |
| `duration.<speed>` | `duration.base` | `fast`, `base`, `slow`. |
| `easing.<use>` | `easing.enter` | `standard`, `enter`, `exit`. Motion is the same in every theme for now, with no overshoot. |
| `shininess`, `effect.panelBlur`, `effect.lift` | | The shininess (0 to 1), a blur radius (0 for now: see `tm-over-media`), and the hover lift (up to 1 px, from depth). The shine itself is `shine-image`, built on each element: see [consumers](./consumers.md "consumers"). |
| `effect.fillAlpha`, `effect.tintAlpha`, `effect.fieldAlpha`, `effect.fillAlphaInverted`, `effect.tintAlphaInverted` | `fill-alpha` | The opacity of solid fills, of tints and quiet buttons, and of fields, from clarity. Cards use `bg.panel`. See [Feels](./inputs.md#feels). `fill-alpha-clearest` and `tint-alpha-inverted-clearest` are the opacities at clarity 1, so a component can tell how far a part has faded. |
| `shine-backdrop-top`, `-bottom`, `shine-filter-top`, `-bottom`, `shine-paint` | | How buttons shade. When parts are see-through, the backdrop filters brighten the top and darken the bottom. When parts are opaque, the plain filters do it on layers painted in the fill's color (`shine-paint` is 1). The components weaken the shadow on light fills, from the fill's own lightness. `none` and 0 at shininess 0. CSS only. |
| `edge-alpha` | | The opacity of button and card edges: 1, fading to 0.5 from softness 0.9 to 1, for a neumorphic look. Thinness, not softness, removes edges. |

## Semantic tokens

Each mode has these tokens. The engine picks each grade so that the pairs in the Checks column pass the contrast setting. Both roles have tints: `tint.base` and `tint.action`. Only the action role has solid fills (`fill.action`); the base role's button is the quiet button (`fill.quiet`). Text and borders for the action role are `fg.action` and `border.action`.

| Token | Meaning | Checks |
|---|---|---|
| `bg.canvas` | The page background | |
| `bg.surface` | Cards and other parts on the canvas | |
| `bg.sunken` | Wells, code, and tracks | |
| `bg.field` | Inside text fields, checks, and radios: the surface grade | |
| `bg.panel` | `bg.surface`, see-through as clarity rises: down to 10% opaque at clarity 1, or 95% for an inverted card (`bg.panel-inverted`). Opaque at clarity 0. | Computed |
| `fg.base` | Body text | text, on canvas, surface, and sunken |
| `fg.base-muted` | Secondary text | text, on canvas, surface, and sunken |
| `fg.base-heading-lg`, `-2xl`, `-3xl` | Headings (h3, h2, h1). They lighten with softness, from the body text color at softness 0 to the min-contrast grade for their size at softness 1. Large text is 24 px or more, at any weight. | large or text, by size, on canvas, surface, and sunken |
| `fg.base-subtle` | Placeholders and icons | ui, on canvas |
| `border.base` | Dividers and the edges of surfaces | None. It is decoration. |
| `panel.border` | Card and dialog edges: `border.base` from softness 0.5 up. Below 0.5 it moves through the grades toward the text grade, which it reaches at softness 0. | None. It is decoration. |
| `border.base-strong` | The edges of fields and controls | ui, on surface |
| `border.base-field` | The edges of text fields and selects: `border.base-strong`, receding from softness 0.9 to 1 to the lightest grade that passes | ui, on canvas, surface, and sunken |
| `border.focus` | Focus rings | ui, on surface |
| `fill.action` | The background of a solid part, such as a button | ui, on canvas |
| `on-fill.action` | Text and icons on the fill: pure white in light mode, pure black in dark mode | text, on fill |
| `fill.action-hover`, `fill.action-active` | The fill when you point at it, and when you press it: 5 grade numbers lighter, and 5 darker, in both modes | |
| `on-fill.action-hover`, `on-fill.action-active` | The label of each state. It moves as far as its fill, so the contrast stays the same. | text, on its fill (press: a warning only) |
| `tint.action`, `tint.action-hover`, `tint.action-active` | A light wash of the action color, for soft buttons, badges, and selected rows. Hover and press are 10 and 20 grade numbers toward the text. | |
| `tint.base`, `tint.base-hover`, `tint.base-active` | 10 grade numbers beyond the canvas and the surface, toward the text: 15 in light mode, 80 in dark mode. For neutral hover and selected backgrounds, such as menu items and list rows. | |
| `on-tint.<role>`, `on-tint.<role>-hover`, `on-tint.<role>-active` | Text on each state of the tint, moved as far as the tint. For base, the body text color when it passes. | text, on its tint (press: a warning only) |
| `fill.quiet` and its states, `on-fill.quiet` and its states | The quiet button, the base role's button: a solid button with the polarity flipped, all in the base color. Its fill is the base tint's grade. Its label is the body text color where it passes. | text, on its fill (press: a warning only) |
| `fg.action` | Colored text on the canvas, such as links | text, on canvas and surface |
| `border.action` | Colored borders | ui, on surface |
| `fill.action-exact`, `on-fill.action-exact` | The exact button: the key color, with white or black from the action ramp, whichever has more contrast. Like every fill, light mode puts the lighter color on the darker one, and dark mode mirrors it. | text, as a warning only. The more-contrast variant uses the normal button's colors where it fails. |
| `fill.action-exact-hover`, `-active`, and their labels | The exact button's states: the nearest grade at least 5 grade numbers lighter on hover, and at least 5 darker on press. The label follows. A white fill cannot get lighter, so on hover it stays white and only its label gets lighter. A black fill stays black when pressed, and only its label gets darker. | text, as a warning only |
| `border.action-exact` | The exact button's edge: the key color | |
| `gloss.<part>-rim`, `-top`, `-shadow`, `-bottom` | The shine's grades for `action`, `quiet`, `action-exact`, `base-muted`, `tint-action`, and `tint-base`. Counted from the part's own fill: 30 and 20 grade numbers lighter (rim and top), 20 and 10 darker (shadow and bottom). Tints use half the distances, and have one set for each state, such as `gloss.tint-action-hover-rim`. The other parts have resting grades only, as buttons do not paint the gradient. | text, on-fill on the resting top and bottom, as a warning only |
| `shine-image` | The shine gradient, defined once on every element and pseudo-element, from four colors that each part sets from its gloss grades. CSS only. See [consumers](consumers.md#shine). | |
| `elevation.1`, `.2`, `.3`, `elevation.inset`, `elevation.field` | Box shadows, from the depth feel: a resting part, a raised part (hover, cards), and an overlay (dialogs, menus), a faint shadow inside a pressed or sunken part, and the inset shadow of text fields, checks, and radios. Each floating shadow has a key layer, cast down and to the right, and a wide, faint ambient layer. The color is the base ramp's grade 90 in light mode and 100 in dark mode, 1.8 times as strong in dark mode. Softness multiplies the blur (0.4 to 2.5, 1 at the default). Below softness 0.5 it hardens the key shadow: fully opaque with no blur at softness 0, and no ambient layer at exactly 0. From softness 0.9 a light shadow in the page's lighter color fades in up and to the left, and `elevation.field` turns into a neumorphic hollow: a dark inset at the top left and a light one at the bottom right. See [Feels](./inputs.md#feels). Empty at depth 0. | Computed |
| `highlight.<part>`, `highlight.tint-<role>`, for `action` and `base-muted` (small base parts, such as a switch's knob) | The top edge of a filled part, which catches the light: a lighter grade of the part's own color (its resting rim grade), with the shininess as its opacity in light mode, and half that in dark mode. Components draw it as a band at the top edge, about a twenty-first of the part's height and at least 1 px, and half as wide along the left edge, as if lit from the upper left: `box-shadow: inset <band ÷ 2> <band> 0 <color>`. Transparent at shininess 0. | Computed |
| `glow.<part>`, `glow.tint-<role>` | A soft glow at the top of a filled part, in the same color as the highlight. It grows with the shininess: transparent at 0, and 20% opacity at 1. Components draw it as an inset shadow, offset by about a third of the part's height and blurred by a fifth, so it follows the part's rounded outline. | Computed |
| `text-shadow.<part>`, for `action`, `action-exact`, `quiet`, `tint-action`, and `tint-base` | The label set into the surface: a 1 px line of the part's own ramp, on the far side of the light. Light text on a darker surface gets a dark line above and to the left, in the part's resting shadow grade, at half the shininess as its opacity. Dark text on a lighter surface gets a light line below and to the right, in its resting rim grade, at 0.3 of the shininess. Each token holds both lines, and `light-dark()` keeps the one that fits the mode, so `tm-invert` flips it too. An empty shadow at shininess 0, so a component can add its own shadows to the list. | Computed |
| `text-halo` | A soft halo of the canvas color behind text, for text over photos. `tm-over-media` turns it on. | Computed |

Each theme has an audit: a list of the checked pairs, with the WCAG ratio, the APCA Lc value, and pass or fail. The playground shows it.

<details>
<summary>How the engine picks the grades</summary>

- **Backgrounds.** Light mode: canvas 5, surface 0, sunken 10. Dark mode: canvas 95, surface 90, sunken 100. Card and dialog edges (`panel.border`) are the same grade as `border.base` from softness 0.5 up. Below it they move through the grades toward the text grade, which they reach at softness 0. If no grade of text can pass on these backgrounds, the engine moves them toward white or black.
- **Text.** `fg.base` is grade 90 (light) or 5 (dark) if that passes. `fg.base-muted` and `fg.base-subtle` are the first grades out from the canvas that pass.
- **Fills.** Every fill has a pure white label in light mode, and pure black in dark mode, whatever the key color. The engine finds the min-contrast grade: the lightest grade (the darkest in dark mode) where that label passes, and that stands out from the canvas (3:1). The fill is one grade beyond it, so the shine's lighter top stays close to passing above the label. So a yellow key color makes a deep golden fill with a white label. To show a part the other way, put `tm-invert` on it. Hover makes the fill 5 grade numbers lighter, and press 5 darker, in both modes. The fill is a full step beyond the min-contrast grade, so the lighter hover still passes. The label follows, as far as it can.
- **Shine.** For each fill and tint: a rim and a top lighter than the fill, and a shadow and a bottom darker, by fixed grade distances (half as far for tints). Tints have them for each state. Most parts draw them with the shared gradient, `shine-image`, whose opacity is the shininess. Light comes from above in both modes. A switch track that is on turns it upside down, so it looks inset. Buttons do not paint the gradient: they brighten their top and darken their bottom, and use the grades only for the edge line of their labels.
- **Tints.** Action tints are grade 5 (light) or 95 (dark). Base tints are 10 grade numbers beyond the canvas and the surface, toward the text (15 in light mode, 80 in dark mode), so they differ from the sunken background too, because those grades already hold the base color. Hover and press are 10 and 20 grade numbers further, toward the text. The label follows by the same distance, as far as it still passes. With APCA in light mode, body text passes only on the lightest grades, so a tint moves only as far as some label can pass.
- **Action text and borders.** The grade nearest the key grade that passes on all backgrounds.
- **The exact button.** The partner of the key color is the action ramp's white or black, whichever has more contrast with it. The partner is the same in both modes. With pure white and pure black, the better partner always gives at least √21, about 4.58:1, so WCAG 2 at the standard level always passes. The enhanced level and APCA can fail, and then the audit warns. Over 120 sample key colors, it warns for none at WCAG standard, 34 at WCAG enhanced, 43 at APCA standard, and 88 at APCA enhanced.
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

The engine runs the same rules once for each mode. In dark mode, it starts from the dark end of each ramp, and it checks every pair in dark mode. Dark mode does not copy the light grades. So a dark grade is often near `100 − g`, but not always:

| Token | Light | Dark | Why |
|---|---|---|---|
| `bg.canvas` | 5 | 95 | The same distance from each end |
| `bg.surface` | 0 | 90 | A raised surface is lighter than the canvas in both modes |
| `fg.base` | 90 | 5 | The rule tries 90 first in light mode, and 5 first in dark mode |
| `border.base-strong`, with APCA | 50 | 30 | APCA scores light-on-dark pairs lower, so the dark grade must be further from the canvas |

- **WCAG 2.** The contrast of two grades depends only on their difference. So most dark pairs have the same distance as their light pairs.
- **APCA.** APCA scores light text on a dark background lower than dark text on a light background. The engine checks each dark pair with APCA, so a dark token can be further from its background than its light twin. The audit shows each pair in each mode.
- **Shadows.** Shadows do not change sides. Light comes from above in both modes. Light mode uses the base ramp's grade 90 as the shadow color. Dark mode uses grade 100, the darkest, at 1.8 times the strength, because dark backgrounds hide shadows.

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
- **Shadows around an inverted part.** `elevation-1`, `-2`, and `-3` fall on the page around a part, so an inverted part keeps the page's mode for them. Otherwise a light card on a dark page would get a white glow from the light-mode shadow. Each has two internal twins: `-flipped`, with the modes swapped, which the inverted part uses, and `-normal`, which gives the parts inside it their usual shadows again. `elevation-inset` and `highlight` are inside the part, so they flip with it.
- **See-through fills on an inverted part.** An inverted button uses the other mode's fill over this mode's page: a light fill with a dark label on a light page. The page showing through keeps the fill on its label's far side, so the fill can be very see-through: `fill-alpha-inverted`, down to 30% at clarity 1. Tints have their own opacity, `tint-alpha`, for soft, quiet, outline-hover, and ghost-hover buttons, and `tint-alpha-inverted` for inverted ones. An inverted tint is a dark tint with a light label on a light page, so the page showing through works against the label: it stays at 95% or more. `tm-invert` uses the inverted opacities, and the parts inside get `fill-alpha-normal` and `tint-alpha-normal` back. The opacities come straight from clarity; the audit checks labels on see-through parts over this mode's canvas and surface, as a warning, but not over the other mode's page.
- **See-through cards on an inverted part.** An inverted card is the other way round: a light card on a dark page darkens as the page shows through, and its dark text would fail. So `bg-panel-inverted` stays at 95% or more. `tm-invert` uses it, and cards inside get `bg-panel-normal` back. The edge against the page is not checked: an inverted part sits on the other mode's canvas, which no pair covers.

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
- **Leaving it out.** `toCss(built, { more: false })` makes CSS without the variant. DTCG has it as a `moreContrast` group in each theme. The Tailwind export reads the CSS variables, so it follows the variant. The shadcn/ui and Bootstrap exports do not have it yet.
- **APCA in light mode.** Body text passes only on the lightest grades, even in black: up to grade 15 at the standard level, and only grade 5 at the enhanced level. A tint's hover and press stop at the last grade where some label passes, so at the enhanced level a soft button's tint does not change on hover.

## Compatible libraries

A component library or a theming tool is compatible with themetron when:

1. It reads colors only from semantic tokens, or from ramp grades that it checks with the theme's `gap.*` tokens.
2. It reads size, shape, and motion only from primitives.
3. It changes color only with theme classes, and does not name a ramp or a hex value. It can use theme names, such as `theme-danger`, and it still works when the theme set does not define them.

Then any themetron theme set works with it, and so do the inputs and the playground.

## Tasks

- [x] Version the token names, and list changes in a changelog. See [consumers](./consumers.md "consumers").
- [x] Export for Bootstrap 5 Sass variables, like the first themetron
- [x] Export for shadcn/ui theme variables
- [ ] Export for MUI, DaisyUI, and Bootstrap 5 theme variables
- [ ] Add a command-line tool: `themetron build inputs.json --format css`
- [ ] Use the DTCG resolver format for themes and modes, when tools support it
