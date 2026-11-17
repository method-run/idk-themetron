---
id: inputs
title: Inputs
summary: A theme set is a tree of themes. Each theme has a base color and an action color, and the root theme also has a font. Each child theme changes some fields of its parent and takes the rest from it.
parent: idk-themetron
kind: reference
order: 2
code: [src/inputs.js]
tags: [system/inputs]
---
# Inputs

<!-- idk-plans:progress:start (generated) -->
◐ 62% (5/8) · 5 deferred · 2 dropped
<!-- idk-plans:progress:end -->

> **Status:** 0.1 draft. The engine and the playground use these inputs. The [tasks](#tasks) at the end of this page list what is left.

You make a theme set from a small set of inputs. A theme set is a tree of themes. The root theme is named `default`. Each other theme has a parent, and it takes every field that it does not set from that parent.

```json
{
  "version": 2,
  "themes": {
    "default": {
      "base": "#6b7280",
      "action": "#2456e8",
      "font": { "family": "Figtree", "fallback": "sans-serif" },
      "preset": "balanced",
      "contrast": { "method": "wcag" }
    },
    "danger": { "parent": "default", "color": "#d62828" },
    "success": { "parent": "default", "color": "#1f8a3b" },
    "brand": { "parent": "default", "action": "#8a4fff", "headingFont": { "family": "Fraunces", "fallback": "serif" } },
    "playful": { "parent": "brand", "preset": "playful", "feel": { "roundness": "pill" } }
  }
}
```

## The theme tree

- `themes` maps a name to a theme. A name uses lowercase letters, digits, and single hyphens, and starts with a letter. The name is the theme's ID in code: the class `theme-<name>`, its DTCG group, and what `parent` points at.
- `label` is what people see, such as `"USA"` or `"Big Sale"`: any text, in any case, with spaces. Without one, the label comes from the name: `warning` is "Warning", `big-sale` is "Big sale", and the root, `default`, is "Default". A label is not inherited, and no token or class uses it.
- A key that is not a valid name, such as `"Big Sale"`, is an error that suggests the name and the label: `"big-sale"`, with `"label": "Big Sale"`. The playground does this for you: type any text in a theme's Name field.
- `default` is the root. It has no `parent`. Every other theme must have a `parent`, and the parents must not make a loop.
- A theme sets only the fields that it changes. To take a field from the parent, leave it out.
- Without any inputs, you get one theme, `default`, with all defaults.

A theme's settings come from the tree, not from the page. A theme class sets every token of its theme, so `theme-danger` looks the same in any section of a page. See [Tokens](./tokens.md "tokens").

There are two kinds of child theme. The difference is only a name: the playground and the audit show it.

| Kind | It changes |
|---|---|
| **Color theme** | Only colors, and its label: `color`, `base`, `action`, and `label`. It has the fonts and feels of its parent. |
| **Full theme** | Fonts, icons, feels, contrast, or a preset too. |

### Theme names to start with

Most theme systems need the same few child themes. `SEMANTIC_THEMES` lists them, in the order to add them. The playground names each new child with the first name that is not taken yet, with its suggested color. When all of them are taken, a new child is `child-1`, `child-2`, and so on. You can rename any theme.

| Name | Other names for it | For |
|---|---|---|
| `danger` | error, critical, negative, destructive | Errors, and actions that delete or cannot be undone. |
| `warning` | caution, attention, notice | Things to check before going on. |
| `success` | positive | Things that went well, such as a saved form. |
| `info` | information, informative | Neutral news and tips. |
| `secondary` | | A second brand color, for parts that support the main one. |

- **Why these five.** The root theme is the main brand color. Nearly every design system names the four status colors: Bootstrap, MUI, Ant Design, daisyUI, Atlassian, Carbon, Polaris, Primer, and Spectrum. Secondary comes last: in MUI and daisyUI, it is a second brand color, which a child theme can be. In Bootstrap and shadcn/ui, secondary is a quiet neutral, which every theme already has as its base tint and quiet button.
- **No accent.** In Primer, Spectrum, and Radix, accent is the color that you act on: a theme's action color. In shadcn/ui, it is a faint hover background: the action tint. Only daisyUI has it as a third brand color. So every theme has an accent already.
- **The framework exports** read the status themes by name: `danger` (or `error`), `warning`, `success`, and `info`. Their secondary and accent colors come from the root theme's tints, not from a theme.
- **Another name for the same job.** When a theme already has a name from the "Other names" column, such as `error`, the playground does not suggest that job's name again.

<details>
<summary>Why a tree, and why two colors for each theme</summary>

- **A tree.** Most sites have one main look and a few changes to it: a danger color, a marketing section with another font. A tree states each change once. A change to the root reaches every theme that does not set that field itself.
- **Two roles.** A page has quiet parts, such as text, cards, and secondary buttons, and parts that you act on, such as links, primary buttons, and checks. A gray page with blue buttons is the most usual case, so each theme has a color for each role. A component chooses the role, and the theme chooses the color.
- **`color` for both.** A status theme, such as danger, is often one color everywhere: a red box, red text, and a red button. `color` sets both roles at once.
- **Base, not neutral.** A theme's base color can be gray, or not. A danger theme that sets `color` has a red base: a pink box with dark red text. So the field is `base`, not `neutral`.
- **Action, not accent.** "Accent" sounds minor, but the key color is often the most important part of a theme. "Key" names the color, not its job. "Interactive" is exact, but long. So the role is "action", and "key color" is a theme's color in a role.
- **More roles later.** Two roles cover most pages, but some tools expect more. See [Other roles](#other-roles) under the tasks.
- **From the tree, not from the page.** The order of themes in the tree and the order of elements on a page are not always the same. A theme that depends on the page could look different in each place. Also, the engine could not check the pairs of its action text on that page's base.

</details>

## Fields

| Field | Default at the root | What it is |
|---|---|---|
| `parent` | None | The name of the parent theme. Required on every theme but `default`. |
| `label` | Made from the name | The text that people see. Not inherited. |
| `base` | `#808080` | The base color: backgrounds, text, borders, and quiet controls. `{ "color": "#808080" }` is the same. |
| `action` | `#0000ee` | The action color: links, buttons, checks, switches, focus rings, and other parts that you act on, or that show their state. `{ "color": "#0000ee" }` is the same. Or a gradient: see [Action gradient](#action-gradient). |
| `color` | None | Sets `base` and `action` to one color. `base` and `action` override it. |
| `font` | The browser's default `sans-serif` font | The main font: `{ "family", "fallback", "src" }`. A string sets only `family`. See [Fonts](#fonts). |
| `headingFont` | `font` | The font for headings. |
| `monoFont` | The browser's default `monospace` font | The font for code. |
| `typeVariance` | `0.5` (`classic`) | How fast text grows above body size, from 0 to 1, or a word: `flat`, `gentle`, `classic`, `bold`, `dramatic`. Small and body text barely move. Not a feel: presets do not set it. See [Type sizes](#type-sizes). |
| `icons` | `{ "style": "standard", "fill": false, "weight": 400 }` | The icons: Material Symbols. `style` is `sharp`, `standard`, or `rounded`: the corners, from square to round. `standard` is the font Google calls Outlined. `fill` is `true` for filled icons. `weight` is the line weight, from 100 to 700. Each field comes from the parent if not set. Not a feel: presets do not set it, so filled icons can go with thin borders, and sharp icons with round buttons. |
| `preset` | `balanced` | A set of feels. See [Presets](#presets). |
| `feel` | The preset's values | The feels. See [Feels](#feels). |
| `contrast` | `{ "method": "wcag" }` | The contrast standard. See [Contrast](#contrast). |

### Base and action

Each role's color is a **key color**. The engine makes a ramp of [grades](./grades.md "grades") from each key color, and picks the grades that pass the contrast setting.

- **`base`** gives its hue and chroma to the backgrounds, text, and borders, and to quiet fills and tints. A pure gray, such as the default, gives pure grays.
- **`action`** gives the fills, tints, text, and edges of the parts that you act on. The default is `#0000ee`, the color that browsers use for links.

A role that a theme does not set comes from its parent. In the example, `brand` sets only `action`, so its base is the gray of `default`. `danger` sets `color`, so its base and its action are both red.

Every ramp goes from pure white to pure black. Limits for the lightest and darkest colors come after the first release. See [Tasks](#tasks).

<details>
<summary>Plan: lightest and darkest limits</summary>

Two sliders in a theme, Lightest and Darkest, will clamp the ramps. The tokens then use only the grades between the two limits, such as 4 to 97. These points are decided:

- **Clamp, do not renumber.** The contrast of two grades comes only from their difference: 21^(difference/100). So the limits cut the ramp to a range of grades, and the engine picks the tokens inside it. Grade numbers mean the same in every theme, and the `gap-*` tokens do not change. An earlier draft renumbered the grades, so that 0 was the theme's own white. That changed what a gap means in each theme, so we dropped it.
- **All ramps.** The limits clamp the action ramps too. So "lightest" is the lightest color on the page, labels and tints included.
- **Ramp tokens outside the range take the limit color,** such as `--tm-base-0` as the paper white. Those grades then do not have the luminance of their number, and the manifest says so.
- **No impossible themes.** Each slider shows a swatch and the contrast that is left for text, such as "leaves 15.2:1". It stops where text would fail at the enhanced level: body text needs about 65 grades there (7:1), plus room for muted text and surfaces. So there is no range-check error.
- **Warnings.** The Palettes view marks the grades outside the range, and says how many grades are left. The Audit view lists each pair that the smaller range makes harder. A theme's title bar in the inputs pane shows a mark when its range is clamped. The manifest marks the ramp tokens outside the range.
- **Dark mode.** Darkest is the dark end of the dark canvas, so a dark mode that is not pure black comes free.
- **Children.** Each theme class sets every token from the tree, so a child of a clamped theme is clamped too.
- **Later steps.** A tinted white and black: their luminance sets the limits, and their hue and chroma blend along the base ramp, so a warm white can sit at one end and a cool black at the other. Then gradients, with the same blend.

</details>

### Action gradient

The action color can be a gradient of two colors:

```json
"action": { "color": "#7b2ff7", "to": "#f107a3", "solid": 0.5, "angle": 180 }
```

| Field | Default | What it does |
|---|---|---|
| `color` | Required | The start color. |
| `to` | Required | The end color. |
| `solid` | `0` | Where the solid color sits, from 0 (the start) to 1 (the end). |
| `angle` | `180` | The direction, as a CSS angle in degrees: 180 runs top to bottom, and 90 left to right. |

- **Where the gradient shows:** solid fills (buttons, the exact button, checks, radios, switches, solid badges, avatars, progress bars, and the pressed segment), soft buttons, badges, and the hover of outline and ghost buttons. As text: links, error messages, the selected tab, and the labels of soft, outline, and ghost buttons and of badges. As edges: outline buttons, badges, and the selected tab's underline. Text fields, alerts, and focus rings keep solid edges.
- **The solid color:** the two colors mixed in OKLCH at `solid`. It is the action color for every part without the gradient: links, borders, focus rings, and `fill.action` itself. Its ramp makes every action token, as for a plain action color.
- **The gradient's colors:** each end has a ramp. For each fill and tint token, the gradient takes the same grade from each end's ramp. A grade fixes luminance, so the label passes on each end as it does on the solid color. The blend between the ends can drift a little, so the engine also checks the middle, and fills choose a grade where the label passes there too.
- **The exact button** shows the two colors exactly. Its label must pass on both, as on the one key color. Where it does not, the audit warns, and the more-contrast variant uses the normal button.
- **APCA in dark mode:** dark-mode fills have black labels, and APCA needs a very light fill for black text. Near white, sRGB has little room for color, so both ends of a gradient are pale there. WCAG 2 allows darker, more vivid fills. The exact button shows the two colors as given, in both methods.
- **Children:** a child that sets `action` or `color` has its own gradient, or none. A child that sets neither takes its parent's gradient.

To add a color, add a child theme. Themetron adds no colors of its own, such as a red for danger. Apply a theme with the class `theme-<name>`. See [Tokens](./tokens.md "tokens").

### Fonts

A font is a `family`, a `fallback`, and optional `src` files.

- `family` is a font family name. Without `src`, it is a Google Fonts family, and the CSS export loads it from Google Fonts.
- `fallback` is a CSS font list that ends in a generic family, such as `Georgia, serif` or `system-ui, sans-serif`. The browser uses it while the font loads, and if the font does not load.
- `src` is a list of your own font files. Use it for a font that is not on Google Fonts, or to serve fonts from your own site. It needs a `family`.

```json
{ "font": { "family": "Figtree", "fallback": "system-ui, sans-serif" } }
```

#### Your own font files

Each file in `src` has these fields:

| Field | Value |
|---|---|
| `url` | The URL of the file. It must end in `.woff2`, `.woff`, `.ttf`, or `.otf`. A query or hash after the extension is OK. The URL cannot have spaces or quotes. |
| `weight` | Optional. The weight of the file, from 1 to 1000, such as `400`. For a variable font, a range, such as `"100 900"`. |
| `style` | Optional. `normal` or `italic`. If you do not set it, the browser uses `normal`. |

```json
{
  "font": {
    "family": "Inter",
    "fallback": "system-ui, sans-serif",
    "src": [
      { "url": "/fonts/Inter.woff2", "weight": "100 900" },
      { "url": "/fonts/Inter-Italic.woff2", "weight": "100 900", "style": "italic" }
    ]
  }
}
```

The CSS export writes one `@font-face` rule for each file, with `font-display: swap`. The extension sets the `format()`. A family with files does not load from Google Fonts. This is true in all themes, also in a theme that names the family without files.

<details>
<summary>Limits of <code>src</code></summary>

- The engine does not fetch the files. It does not check that they exist, or that the weights are correct.
- A relative URL is relative to the stylesheet, not to the page.
- Each file has one URL. There is no list of formats for one file, and no `unicode-range`.
- The style is `normal` or `italic` only. An `oblique` angle is not supported.
- The playground keeps `src` from an imported theme. It cannot add or change files. If you pick a font in the playground, the files go away for that field.

</details>

## Feels

A feel is a number from 0 to 1. A word can stand for a number: the words are the stops on the scale. The playground shows the words under each slider.

| Feel | 0 | Words | 1 | It changes |
|---|---|---|---|---|
| `roundness` (Round) | Square corners | square, slight, rounded, round, pill | Pill shapes | The radius of each part, as a share of the most that part can round |
| `spaciousness` (Space) | Dense | compact, cozy, comfortable, relaxed, spacious | Airy | How many grid squares padding, gaps, and line heights take. The grid itself is always 4 px. |
| `depth` (Depth) | Flat | flat, low, raised, floating | Floating | How far parts float above the page: soft shadows, and how far buttons rise on hover |
| `softness` (Soft) | Hard | hard, crisp, soft, pillowy | Pillowy | How blurry shadows are, and how far headings lighten toward their min-contrast grade. Below 0.5, shadows get darker and sharper, and card and dialog edges move toward the text color. At the top of the range (0.9 to 1), a light shadow fades in up and to the left, the edges of buttons and cards fade to half, and text fields, checks, and radios look pressed into the page, for a neumorphic look. |
| `thinness` (Thin) | Chunky | chunky, heavy, regular, hairline, none | No edges | How wide edges are: `round((1 − thinness) × 4)` px: 4 px at chunky (0), 3 px at heavy (0.25), 2 px at regular (0.5), 1 px at hairline (0.8, the default), and 0 at none (1). Fields, checks, radios, switches, segmented controls, outline buttons, dividers, tabs, and links keep at least 1 px. |
| `shininess` (Shine) | Matte | matte, satin, plastic, glassy | Glass | The shine on filled parts, from the part's own ramp. Buttons get a brighter top and a darker bottom. Other parts get a gradient, an edge band, and a glow. Labels get a 1 px line that sets them into the surface. |
| `clarity` (Clear) | Solid | solid, tinted, frosted, clear | Clear | How see-through parts are. The default is 0. At 0, everything is opaque. At 1, cards, tints, and quiet buttons are 10% opaque, fields 30%, and solid fills 50%; inverted fills 30%, and inverted cards, tints, and quiet buttons 95%. |

Clarity replaces `solidity`, and is its inverse: clarity = 1 − solidity. Thinness replaces `thickness` the same way: thinness = 1 − thickness. Inputs that set `solidity` or `thickness` still load. The engine turns the value over, and the old words still work. If a theme sets both the old and the new feel, the new feel wins.

The other feels (`bounciness`, `snappiness`, and `tone`) are removed for now. They can come back one at a time. Inputs that set them still load: the engine skips them, and the schema marks them deprecated. Until they come back, motion is the same in every theme, with no overshoot.

Each feel of a theme comes from the first of these that has it:

1. The theme's own `feel`.
2. The theme's own `preset`. A preset sets every feel.
3. The parent's feel. The root uses the defaults.

A feel set to `"inherit"` skips the preset and takes the parent's value. So a child can take a look and keep its parent's sizes:

```json
{ "parent": "default", "preset": "brutalist", "feel": { "spaciousness": "inherit" } }
```

Spaciousness sets how many grid squares each space step takes, so a child that inherits it has the same space steps, line heights, and control heights as its parent.

The playground uses presets as a one-time stamp: picking one writes every feel into the theme's `feel`, and stores no `preset`. Removing a feel there removes it from `feel`.

<details>
<summary>How each feel becomes tokens</summary>

The formulas are in `buildPrimitives` in [src/tokens.js](../src/tokens.js). In short, with `s` for spaciousness and so on:

- Grid: 4 px squares, down and across, for every theme. The `rhythm` token holds it.
- Space unit: `2 + 4 s` squares (8 to 24 px). The space scale is 0.32, ½, 1, 1½, 2, 3, and 4 units. The `xs` step is 0.32, not ¼, so that it grows at about spaciousness 0.67, not only at 1. Each step rounds to whole squares on its own, and is at least one square. So the steps change at different points along the slider.
- Text sizes do not change with any feel. See [Type sizes](#type-sizes).
- Line heights: for each text size, the whole number of squares nearest to the size × `1.4 + 0.25 s` (body), or × `1.15 + 0.1 s` (tight, for headings and controls), and never less than the size. The grid is fixed and the ratios only grow, so line heights never shrink as spaciousness grows.
- Controls: a tight line, plus padding and border that add up to whole squares. The padding is 0.45 of a space unit down, and 0.95 across, rounded to whole squares. These factors differ from the space steps' factors, so the padding and the space steps grow at different points along the slider. Small and large controls differ by whole pairs of squares, so they center on grid lines in one row. In the most compact themes, a small control is as tall as the default.
- Radius: a share of the most that each part can round. Controls: `r × height ÷ 2`, for each control size, so `r = 1` makes every size a pill. Cards: `r ×` their padding (`space.lg`). Alerts and text areas: `r × space.md`. Small parts: `r × space.xs`. So a corner never cuts into the content. Badges, switches, and progress bars round by `r ×` their own height `÷ 2`, from the `roundness` token, so they too are pills only at `r = 1`.
- Shadows: elevation 1, 2, and 3 float `d × 4`, `d × 6`, and `d × 16` px below the part, and half that to the right, as if lit from the upper left. The key shadow's blur is `1 + 0.6 ×` that offset, and a wider ambient shadow blurs `2 + 1.5 ×` it. Buttons rise `d` px on hover, at most 1 px, and their shadow changes from elevation 1 to elevation 2. The inset shadow of pressed and sunken parts is `max(1, 2 d)` px down. Softness multiplies every shadow's blur by `0.4 × 6.25^softness`: 0.4 at 0, 1 at the default (0.5), and 2.5 at 1. Harder shadows are darker: below softness 0.5, the key shadow's opacity rises from 16%, to fully opaque at softness 0, and its blur shrinks in a straight line to 0, so it is a sharp block. At softness 0 exactly, there is no ambient shadow. Card and dialog edges harden the same way: from the usual edge grade at softness 0.5, through the grades, to the text grade at softness 0. The inset shadow of text fields, checks, and radios hardens the same way: fully opaque with no blur at softness 0. From softness 0.9 to 1, a light shadow fades in up and to the left, at least as far as a raised part's (elevation 2) shadow, so resting buttons show it too: white at up to 90% in light mode, and a color 15 grade numbers lighter than the canvas at up to 35% in dark mode. Over the same range, text fields, checks, and radios look pressed into the page (`elevation.field`): their dark inset shadow moves to the top and left edges, and a light inset shadow in the same light color fades in inside the bottom and right edges. Both grow to twice their usual strength (the light one at most fully opaque). A negative spread of half their blur keeps each shadow on its own side. The light shadow moves further, up to its blur, so the far wall shows as a clear band. The edge of text fields and selects (`border.base-field`) recedes to the lightest grade that still passes the control contrast.
- Opacity: each kind of part goes from its clearest opacity at clarity 1 to opaque at 0, evenly. Page-like parts (cards, fields, tints, quiet buttons) have their label on the far side of the page, so they can be very see-through; solid fills have their label on the page's side, so they stay at 50% or more, and their labels get a halo of the fill's color as they fade. Inverted parts swap the two. The audit checks each label on its part as seen over the canvas and the surface, as a warning. Blur is not part of clarity: see `tm-over-media`.
- Text fading: headings (`fg.base-heading-lg`, `-2xl`, `-3xl`) lighten with softness, all along its range, to the min-contrast grade for their size at softness 1. The engine checks each heading at its size, at regular weight. With WCAG 2, 24 px or more counts as large. With APCA, the font table gives the minimum (see [Grades and contrast](./grades.md "grades")). The engine can also fade body text, to one notch (10 grade numbers) past the min-contrast text grade, but nothing turns that on yet. Linear, rounded to a grade.
- Edge width: `round((1 − thinness) × 4)` px (`border-width` and `panel-border-width`). The focus ring is `max(2, width + 1)` px. Fields, selects, text areas, checks, radios, switches, segmented controls, outline buttons, dividers, tabs, and links use at least 1 px, so they keep a hairline at thinness 1. The edges of cards, dialogs, other buttons, badges, alerts, avatars, and progress bars can go away.
- Edge fade: from softness 0.9 to 1, the edges of buttons and cards fade to half (`edge-alpha`, 1 to 0.5), so shadows shape them more. Outline buttons, dialogs, and drawers keep their edges. Field edges recede instead: see Shadows.
- Shine: from the part's own ramp, not white. The shininess sets its strength, from none at 0. Most parts paint a gradient (a lighter rim and top, a darker shadow and bottom), a thin edge band, and a soft glow at the top. Buttons paint no gradient: two masked layers brighten their top and darken their bottom. Labels get a 1 px line of their part's ramp. See [How shininess becomes styles](../docs/shininess-flow.md "shininess-flow").

</details>

More about the feels: the [Feel audit](../docs/feel-audit.md "feel-audit"), a snapshot from when there were nine feels, lists where each feel's output jumps and what it changes outside its own domain, and the [Shine notes](../docs/shine-notes.md "shine-notes") have the hand-tuned gradients that the shine started from.

<details>
<summary>Why feels are numbers from 0 to 1</summary>

Words are easy to learn, but a slider needs numbers between the words. A number from 0 to 1 means the same thing for every feel, so a preset or another tool can set feels without knowing their units. The words are names for points on the scale. They do not limit the values.

</details>

## Type sizes

The type variance `v` sets every text size. Small text is `round(13 − 2v)` px: 13, then 12 at the default, then 11 at the most. Body text is 16 px, or 17 px in the top quarter. Each step above body text is the step below it times a ratio: 1.125 at `v = 0`, 1.2 at the default, and 1.5 at `v = 1`, even in log steps between. `xs` is one pixel under small text, and at least 11 px.

| `typeVariance` | `sm` | `md` | Ratio | h1 (`3xl`) |
|---|---|---|---|---|
| 0, flat | 13 | 16 | 1.125 | 26 |
| 0.5, classic | 12 | 16 | 1.2 | 33 |
| 1, dramatic | 11 | 17 | 1.5 | 86 |

Every line height is still a whole number of grid squares, so the grid holds at every size. Small text stays at 11 px or more, and body text at 16 px or more. At 16 px, body text can meet APCA's font table, which asks Lc 100 at 15 px: more than most color pairs can reach. Fields also use text of at least 16 px, because iOS zooms the page in when you tap a field with smaller text.

## Presets

A preset is a set of feels with a familiar name. A feel that a preset does not set takes its default. No preset sets the type variance. With only seven feels for now, some presets look alike. Their names stay, so inputs that use them still load.

| Preset | Roundness | Spaciousness | Depth | Softness | Thinness | Shininess | Clarity |
|---|---|---|---|---|---|---|---|
| Default | 0.35 | 0.5 | 0.3 | 0.5 | 0.8 | 0 | 0 |
| `balanced` | default | default | default | default | default | default | default |
| `flat` | 0.2 | default | 0 | 0.5 | 0.8 | 0 | default |
| `material` | 0.25 | default | 0.5 | 0.7 | 1 | 0 | default |
| `brutalist` | 0 | 0.4 | 0.5 | 0 | 0.25 | 0 | default |
| `neumorphic` | 0.6 | default | 0.7 | 1 | 1 | 0 | 0.7 |
| `glass` | 0.6 | default | 1 | 0.85 | 0.8 | 1 | 1 |
| `glossy` | 1 | default | 0.5 | 0.6 | 0.8 | 1 | default |
| `playful` | 0.9 | 0.65 | 0.45 | 0.3 | 0.6 | default | default |
| `dense` | 0.15 | 0 | 0.15 | 0.5 | 0.8 | default | default |

## Contrast

`contrast.method` is `wcag` or `apca`. APCA keeps the WCAG 2 minimums as a floor. `contrast.model` is the color model of the ramps: `oklch` (the default) or `hsl`. The [Grades and contrast](./grades.md "grades") page gives the thresholds. A child theme can change the contrast setting. Then it is a full theme.

Every theme ships both levels: the `standard` level, which readers get by default, and the `enhanced` level as a more-contrast variant, for readers who ask for more contrast. You do not choose a level: like dark mode, the variant comes with every theme. See [More contrast](./tokens.md "tokens"). Older inputs could set `contrast.level`. The engine now skips it, so those files still load, and the schema marks it deprecated.

## Light and dark

Each theme makes a light mode and a dark mode. You do not set the dark colors. The engine runs the same rules for each mode. In dark mode, it starts from the dark end of each ramp, and checks each pair in dark mode. So a dark grade is not always the mirror of its light grade. See [Light and dark mode](./tokens.md#light-and-dark-mode).

## Schema and version

[`inputs.schema.json`](./inputs.schema.json) is the JSON Schema of the inputs. It is a draft, and it changes with the inputs. The code makes it from the lists of fields, feels, presets, and settings, with `npm run spec`. The site publishes it at <https://method-run.github.io/idk-themetron/schema/inputs.schema.json>, and a copy for each released contract version at `schema/<version>/inputs.schema.json`. See [Using themetron](./consumers.md "consumers"). A test checks that the schema and the engine accept and reject the same inputs. The schema cannot check across themes: that each parent exists, that the parents make no loop, and that only `default` has no parent. The engine checks those.

An inputs file can have two more fields:

- `version`: the version of the inputs format. Now `2`. A file without it is read as version 2. The engine stops with a message for any other version. The playground's Inputs download and share links include it.
- Version `1` still loads. In it, `neutral` was the base color, `color` was the action color only, and `fillLabel` flipped the labels on fills. The engine reads a version 1 file with those meanings. Without `"version": 1`, `neutral` is an error that names the new field.
- `feel.tone` is gone too, and so are the other removed feels. The engine skips them.
- `fillLabel` is gone in every version: every fill has light labels in light mode and dark labels in dark mode. The engine skips the field, so old files still load, and the schema marks it deprecated. To flip one part, put the class `tm-invert` on it. We removed `fillLabel` because it was easy to miss, and it made one theme's buttons the opposite of the others.
- `$schema`: a path or URL to the schema, for editors. The engine ignores it. Use `https://method-run.github.io/idk-themetron/schema/inputs.schema.json` for the latest schema, or a released version's URL to pin it. The playground's Inputs view, downloads, and share links include the latest URL, because the playground runs the latest engine.

## Checks

The engine checks all inputs before it makes a theme set. It reports every problem at once, one line for each, with the theme name, and makes no themes. For example:

- `themes.playful.feel.roundness: unknown word "curvy". Use a number from 0 to 1, "inherit", or one of: square, slight, rounded, round, pill.`
- `themes.brand.action: "blue" is not a hex color, such as #1e66f5.`
- `themes.alerts.parent: no theme is named "alert".`

## Tasks

- [x] Change the engine and the playground to the theme tree
- [x] Write a JSON Schema for the inputs, so that editors can check and complete them
- [x] Start with the browser's own fonts, and add a Google font only when you choose one
- [x] Let a theme load its own font files, not only Google Fonts
- [ ] Let a part override a feel, such as rounder buttons than cards. themetron-3 had this idea.
- [-] Add the "embossed" feel from themetron-3: text shadow on raised parts
- [-] Add a "vibrance" feel that sets the chroma of tints
- [ ] Suggest font pairs, and match the x-height of fallback fonts with `size-adjust`
- [>] Add Lightest and Darkest sliders that clamp the ramps. See [Plan: lightest and darkest limits](#base-and-action).
- [>] Add a tinted white and black, as an advanced form of the Lightest and Darkest sliders
- [x] Let the action color be a two-color gradient, for solid fills, soft buttons, and badges
- [>] Add gradient fills and backgrounds, from the same blend as the tinted white and black
- [ ] Let a theme choose an icon set, such as Lucide, Phosphor, or Material Symbols. A child takes its parent's set. Material Symbols is the only set for now.
- [>] Let a role take its color from another theme by name, such as `"action": "brand"`. Parked until themes have more than two roles. With two roles, the parent or a copy of the hex covers almost every case. The work is on the branch of [#5](https://github.com/method-run/idk-themetron/pull/5): the engine, the schema, and a playground menu that picks a theme's color.
- [>] Decide whether to add a third role, such as secondary. See [Other roles](#other-roles).

### Other roles

Themes have two roles today: base and action. These are the roles that we could add, best first:

1. **Secondary:** a second brand color, for secondary buttons, highlights, and chart series. MUI, daisyUI, Bootstrap, and Material 3 all have one. Today the framework exports use a stand-in: the action tint for MUI and daisyUI `secondary`, and the muted base text for Bootstrap `secondary`. With a secondary role, links to other themes become useful, such as `"secondary": { "theme": "brand", "role": "action" }`.
2. **Surface and ink:** split base in two, so that the page background can have a different hue from the text and the borders. This is like Material 3's neutral and neutral variant. It is useful for warm or cool pages, but it adds many tokens.
3. **Focus or selection:** a separate color for focus rings and selection. This is probably one token, not a role with a ramp.

These are not roles:

- **Status colors**, such as danger, success, warning, and info, are themes. A theme class changes the normal tokens. See [Theme classes](./consumers.md "consumers").
- **Data visualization colors** are a set of series colors. That is a different system.

We decided against two names: "neutral" for base, and "accent" for action. The reasons are under "Why a tree, and why two colors for each theme", near the top of this page.
