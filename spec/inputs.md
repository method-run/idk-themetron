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
◐ 37% (3/8)
<!-- idk-plans:progress:end -->

> **Status:** 0.1 draft. The engine and the playground use these inputs. The [plan](../docs/plan.md "plan") lists what is left.

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
| **Full theme** | Fonts, feels, contrast, or a preset too. |

<details>
<summary>Why a tree, and why two colors for each theme</summary>

- **A tree.** Most sites have one main look and a few changes to it: a danger color, a marketing section with another font. A tree states each change once. A change to the root reaches every theme that does not set that field itself.
- **Two roles.** A page has quiet parts, such as text, cards, and secondary buttons, and parts that you act on, such as links, primary buttons, and checks. A gray page with blue buttons is the most usual case, so each theme has a color for each role. A component chooses the role, and the theme chooses the color.
- **`color` for both.** A status theme, such as danger, is often one color everywhere: a red box, red text, and a red button. `color` sets both roles at once.
- **From the tree, not from the page.** The order of themes in the tree and the order of elements on a page are not always the same. A theme that depends on the page could look different in each place.

</details>

## Fields

| Field | Default at the root | What it is |
|---|---|---|
| `parent` | None | The name of the parent theme. Required on every theme but `default`. |
| `label` | Made from the name | The text that people see. Not inherited. |
| `base` | `#808080` | The base color: backgrounds, text, borders, and quiet controls. `{ "color": "#808080" }` is the same. |
| `action` | `#0000ee` | The action color: links, buttons, checks, switches, focus rings, and other parts that you act on, or that show their state. `{ "color": "#0000ee" }` is the same. |
| `color` | None | Sets `base` and `action` to one color. `base` and `action` override it. |
| `font` | The browser's default `sans-serif` font | The main font: `{ "family", "fallback" }`. A string sets only `family`. |
| `headingFont` | `font` | The font for headings. |
| `monoFont` | The browser's default `monospace` font | The font for code. |
| `typeVariance` | `0.5` (`classic`) | How fast text grows above body size, from 0 to 1, or a word: `flat`, `gentle`, `classic`, `bold`, `dramatic`. Small and body text barely move. Not a feel: presets do not set it. See [Type sizes](#type-sizes). |
| `preset` | `balanced` | A set of feels. See [Presets](#presets). |
| `feel` | The preset's values | The feels. See [Feels](#feels). |
| `contrast` | `{ "method": "wcag" }` | The contrast standard. See [Contrast](#contrast). |

### Base and action

Each role's color is a **key color**. The engine makes a ramp of [grades](./grades.md "grades") from each key color, and picks the grades that pass the contrast setting.

- **`base`** gives its hue and chroma to the backgrounds, text, and borders, and to quiet fills and tints. A pure gray, such as the default, gives pure grays.
- **`action`** gives the fills, tints, text, and edges of the parts that you act on. The default is `#0000ee`, the color that browsers use for links.

A role that a theme does not set comes from its parent. In the example, `brand` sets only `action`, so its base is the gray of `default`. `danger` sets `color`, so its base and its action are both red.

Every ramp goes from pure white to pure black. Limits for the lightest and darkest colors come after the first release. See the [plan](../docs/plan.md "plan").

To add a color, add a child theme. Themetron adds no colors of its own, such as a red for danger. Apply a theme with the class `theme-<name>`. See [Tokens](./tokens.md "tokens").

### Fonts

A font is a `family` and a `fallback`.

- `family` is a Google Fonts family name, for now. The CSS export loads it from Google Fonts. Your own font files are a later task.
- `fallback` is a CSS font list that ends in a generic family, such as `Georgia, serif` or `system-ui, sans-serif`. The browser uses it while the font loads, and if the font does not load.

```json
{ "font": { "family": "Figtree", "fallback": "system-ui, sans-serif" } }
```

## Feels

A feel is a number from 0 to 1. A word can stand for a number: the words are the stops on the scale. The playground shows the words under each slider.

| Feel | 0 | Words | 1 | It changes |
|---|---|---|---|---|
| `spaciousness` | Dense | compact, cozy, comfortable, relaxed, spacious | Airy | How many grid squares padding, gaps, and line heights take. The grid itself is always 4 px. |
| `roundness` | Square corners | square, slight, rounded, round, pill | Pill shapes | The radius of each part, as a share of the most that part can round |
| `depth` | Flat | flat, low, raised, floating | Floating | How far parts float above the page: soft shadows, and how far buttons rise on hover |
| `solidity` | Clear | clear, frosted, tinted, solid | Solid | How see-through parts are. At 0, cards, tints, and quiet buttons are 10% opaque, fields 30%, and solid fills 95%; inverted fills 30%, and inverted cards and tints 95%. At 1, everything is opaque. |
| `shininess` | Matte | matte, satin, plastic, glassy | Glass | The shine on filled parts: a gradient, an edge band, and a glow, from the part's own ramp |

The other feels (`thickness`, `depth`, `softness`, `solidity`, `bounciness`, and `snappiness`) are removed for now. They will come back one at a time. Inputs that set them still load: the engine skips them, and the schema marks them deprecated. Until they come back, the tokens that they set have fixed values: 1 px borders, no shadows and no lift on hover, opaque parts with no blur, and motion with no overshoot.

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
- Shadows: elevation 1, 2, and 3 float `d × 2`, `d × 6`, and `d × 16` px below the part, and half that to the right, as if lit from the upper left. The key shadow's blur is `1 + 0.6 ×` that offset, and a wider ambient shadow blurs `2 + 1.5 ×` it. Buttons rise `d` px on hover, at most 1 px. The inset shadow of pressed and sunken parts is `max(1, 2 d)` px down.
- Opacity: each kind of part goes from its clearest opacity at solidity 0 to opaque at 1, evenly. Page-like parts (cards, fields, tints, quiet buttons) have their label on the far side of the page, so they can be very see-through; solid fills have their label on the page's side, so they stay at 95% or more. Inverted parts swap the two. The audit checks each label on its part as seen over the canvas and the surface, as a warning. Blur is not part of solidity: see `tm-over-media`.
- Text fading (off for now): the engine can move body text toward the page, to one notch (10 grade numbers) past the min-contrast text grade, and headings (`fg.base-heading-lg`, `-2xl`, `-3xl`) to the min-contrast grade for their size, where 24 px or more counts as large at any weight. No feel drives it yet; softness may. Until then the heading colors are the body text color.
- Shine: from the fill's own ramp, not white. A gradient (a lighter rim and top, a darker shadow and bottom), a thin edge band, and a soft glow at the top. The shininess is their opacity, from none at 0. Each state of a button has its own shine grades, so the shine follows hover and press.

</details>

More about the feels: the [Feel audit](../docs/feel-audit.md "feel-audit") lists where each feel's output jumps and what it changes outside its own domain, and the [Shine notes](../docs/shine-notes.md "shine-notes") have the hand-tuned gradients that the shine started from.

<details>
<summary>Why feels are numbers from 0 to 1</summary>

Words are easy to learn, but a slider needs numbers between the words. A number from 0 to 1 means the same thing for every feel, so a preset or another tool can set feels without knowing their units. The words are names for points on the scale. They do not limit the values.

</details>

## Type sizes

The type variance `v` sets every text size. Small text is `round(13 − 2v)` px: 13, then 12 at the default, then 11 at the most. Body text is 15 px, or 16 px in the top quarter. Each step above body text is the step below it times a ratio: 1.125 at `v = 0`, 1.2 at the default, and 1.5 at `v = 1`, even in log steps between. `xs` is one pixel under small text, and at least 11 px.

| `typeVariance` | `sm` | `md` | Ratio | h1 (`3xl`) |
|---|---|---|---|---|
| 0, flat | 13 | 15 | 1.125 | 24 |
| 0.5, classic | 12 | 15 | 1.2 | 31 |
| 1, dramatic | 11 | 16 | 1.5 | 81 |

Every line height is still a whole number of grid squares, so the grid holds at every size. Small text stays at 11 px or more, and body text at 15 px or more: smaller text is not safe to read.

## Presets

A preset is a set of feels with a familiar name. With only five feels for now, most presets set only roundness and shininess, and some look the same. Their names stay, so inputs that use them still load.

| Preset | Spaciousness | Roundness | Shininess |
|---|---|---|---|
| `balanced` | default | default | default |
| `flat` | default | 0.2 | 0 |
| `material` | default | 0.25 | 0 |
| `brutalist` | 0.4 | 0 | 0 |
| `neumorphic` | default | 0.6 | 0 |
| `glass` | default | 0.6 | 0.3 |
| `glossy` | default | 1 | 1 |
| `playful` | 0.65 | 0.9 | default |
| `dense` | 0 | 0.15 | default |

## Contrast

`contrast.method` is `wcag` or `apca`. APCA keeps the WCAG 2 minimums as a floor. `contrast.model` is the color model of the ramps: `oklch` (the default) or `hsl`. The [Grades and contrast](./grades.md "grades") page gives the thresholds. A child theme can change the contrast setting. Then it is a full theme.

Every theme ships both levels: the `standard` level, which readers get by default, and the `enhanced` level as a more-contrast variant, for readers who ask for more contrast. You do not choose a level: like dark mode, the variant comes with every theme. See [More contrast](./tokens.md "tokens"). Older inputs could set `contrast.level`. The engine now skips it, so those files still load, and the schema marks it deprecated.

## Light and dark

Each theme makes a light mode and a dark mode. You do not set the dark colors. The dark mode uses the mirror grade of each light token: grade `g` becomes grade `100 − g`. See [Grades and contrast](./grades.md "grades").

## Schema and version

[`inputs.schema.json`](./inputs.schema.json) is the JSON Schema of the inputs. It is a draft, and it changes with the inputs. The code makes it from the lists of fields, feels, presets, and settings, with `npm run spec`. A test checks that the schema and the engine accept and reject the same inputs. The schema cannot check across themes: that each parent exists, that the parents make no loop, and that only `default` has no parent. The engine checks those.

An inputs file can have two more fields:

- `version`: the version of the inputs format. Now `2`. A file without it is read as version 2. The engine stops with a message for any other version. The playground's Inputs download and share links include it.
- Version `1` still loads. In it, `neutral` was the base color, `color` was the action color only, and `fillLabel` flipped the labels on fills. The engine reads a version 1 file with those meanings. Without `"version": 1`, `neutral` is an error that names the new field.
- `feel.tone` is gone too, and so are the other removed feels. The engine skips them.
- `fillLabel` is gone in every version: every fill has light labels in light mode and dark labels in dark mode. The engine skips the field, so old files still load, and the schema marks it deprecated. To flip one part, put the class `tm-invert` on it.
- `$schema`: a path or URL to the schema, for editors. The engine ignores it.

## Checks

The engine checks all inputs before it makes a theme set. It reports every problem at once, one line for each, with the theme name, and makes no themes. For example:

- `themes.playful.feel.roundness: unknown word "curvy". Use a number from 0 to 1, or one of: square, slight, rounded, round, pill.`
- `themes.brand.action: "blue" is not a hex color, such as #1e66f5.`
- `themes.alerts.parent: no theme is named "alert".`

## Tasks

- [x] Change the engine and the playground to the theme tree
- [x] Write a JSON Schema for the inputs, so that editors can check and complete them
- [x] Start with the browser's own fonts, and add a Google font only when you choose one
- [ ] Let a theme load its own font files, not only Google Fonts
- [ ] Let a part override a feel, such as rounder buttons than cards. themetron-3 had this idea.
- [ ] Add the "embossed" feel from themetron-3: text shadow on raised parts
- [ ] Add a "vibrance" feel that sets the chroma of tints
- [ ] Suggest font pairs, and match the x-height of fallback fonts with `size-adjust`
