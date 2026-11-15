---
id: shininess-flow
title: "How shininess becomes styles"
summary: The path of one feel, shininess, from the playground slider to the shine on a button. The build layer picks grades, the export defines one gradient for every element, and each component sets four colors for each state.
parent: how-it-works
kind: guide
order: 1
code: [src/inputs.js, src/tokens.js, src/export.js, components/components.css, demo/demo.js]
tags: [system/how-it-works/shininess-flow]
aliases: [How shininess becomes styles]
---
# How shininess becomes styles

There are four layers: inputs, build, export, and components. Each layer reads only what the layer before it makes:

- The build layer picks grades. It writes no CSS.
- The export layer turns grades and the shininess number into CSS. It defines the shape of the shine once.
- The components choose which grades each part uses in each state.

## Flow chart

```mermaid
flowchart TD
  slider["Playground slider<br/>demo/demo.js"] --> raw["Raw inputs<br/>feel.shininess: 0 to 1, or a word"]
  raw --> resolve["feelField() and resolveTheme()<br/>src/inputs.js"]
  resolve --> settings[("settings.feel.shininess")]

  subgraph build["Build layer: src/tokens.js"]
    settings --> prims["buildPrimitives()<br/>primitives.shininess"]
    mode["buildMode(), for each mode"] --> fills["Each fill and tint<br/>fill.action, tint.action-hover, …"]
    fills --> gloss["shine(): gloss grades<br/>gloss.action-rim, gloss.tint-action-hover-rim, …<br/>SHINE and TINT_SHINE distances"]
  end

  subgraph export["Export layer: src/export.js"]
    prims --> eShin["--tm-shininess"]
    gloss --> eGloss["--tm-gloss-…<br/>light-dark() of two grades"]
    gloss --> eHi["--tm-highlight-…, --tm-glow-…<br/>the resting rim, scaled by shininess"]
    shape["SHINE_SHAPE<br/>stops at 0, 3, 50, 80, 100%"] --> rule["shineRules()<br/>@property for four colors<br/>:where(*), ::before, ::after { --tm-shine-image }"]
  end

  subgraph comps["Components: components/components.css"]
    eGloss --> set["Each part and state sets<br/>--tm-shine-rim, -top, -shadow, -bottom"]
    set --> paint["background-image: var(--tm-shine-image)"]
    rule --> paint
    eShin --> paint
    eHi --> band["box-shadow: var(--_shine)<br/>the edge band and the glow"]
  end
```

## The four parts of the shine

| Part | Made from | CSS | What you see |
|---|---|---|---|
| Gradient | The gloss grades of the part's state, and `SHINE_SHAPE` | `--tm-shine-image`, painted by each part | A lighter rim and top, a clear middle, and a darker shadow and bottom |
| Edge band | The resting rim grade, at the shininess as its opacity (half in dark mode) | `--tm-highlight-…`, drawn by `--_shine` | A thin line along the top edge, and half as wide along the left |
| Glow | The resting rim grade, at a fifth of the shininess | `--tm-glow-…`, drawn by `--_shine` | A soft light inside the top of the part |
| Text line | The resting shadow grade (a dark line above and to the left of light text) or rim grade (a light line below and to the right of dark text) | `--tm-text-shadow-…`, as `text-shadow` | The label looks set into the surface |

## How a state change animates

1. On hover, a component sets the four colors to that state's gloss grades, such as `var(--tm-gloss-tint-action-hover-rim)`.
2. The four colors are registered with `@property` as `<color>`, and each part lists them in its `transition` (`--_shine-transition`). So the browser animates them.
3. `--tm-shine-image` is defined on every element, so it is built again from the current colors on every frame. The gradient fades along with the fill.

A browser without `@property` still follows each state, but changes the gradient at once.

## Settings that parts can change

- `--tm-shine-strength`: a factor on the opacity. Tints use 0.5.
- `--tm-shine-direction`: the gradient's angle. 180deg by default, light from above. A switch track sets 0deg, so it looks inset.

## Where to look in the code

**Build:** `SHINE`, `TINT_SHINE`, and the `shine()` helper in `buildMode()`, in [src/tokens.js](../src/tokens.js). The exact button counts its shine from the key color's own grade, in the exact-button block.

**Export:** `SHINE_SHAPE`, `shineGradient()`, and `shineRules()` in [src/export.js](../src/export.js). `semanticEntries()` writes the gloss, highlight, and glow tokens. `primitiveEntries()` writes `--tm-shininess`.

**Components:** the shared shine block near the top of [components/components.css](../components/components.css) defines `--_shine` and `--_shine-transition`. Each part sets its four colors.

## Buttons are different

Buttons do not paint `shine-image`. Two masked layers with backdrop filters brighten what is behind the button at the top, most along the top edge, and darken it at the bottom, by an amount set by `--tm-shininess`. So a button's shine adds no color: it shades the fill, and the page through a see-through fill. A soft button's shadow uses its tint's shadow grade, as darkening a faint wash makes gray. The colored edge band and glow are off on buttons; the brightest part of the top layer takes their place. See the button rules in [components/components.css](../components/components.css).

When parts are opaque (clarity 0), the backdrop behind the shine layers is only the fill, so the layers are painted in the fill's own color with a plain `filter: brightness()` instead, which looks the same and reads nothing behind the button. Darkening multiplies, so it shades a near-white fill much harder than a mid-tone one: the shadow layer's mask takes its strength from the fill's own lightness (full at or below 50% OKLCH lightness, 40% on white), on both paths. The theme picks the way with `--tm-shine-backdrop-*`, `--tm-shine-filter-*`, and `--tm-shine-paint`; at shininess 0 there are no filters at all. Buttons need resting gloss grades only, for the edge line of their labels, so the engine builds no hover or press gloss grades for action fills, quiet, or exact buttons.
