---
id: components
title: Components
summary: A small CSS component library that reads only themetron tokens. It shows how each feel changes real parts, such as buttons, fields, and cards.
parent: idk-themetron
kind: module
order: 4
code: [components/components.css]
tags: [system/components]
---
# Components

<!-- idk-plans:progress:start (generated) -->
◐ 20% (1/5)
<!-- idk-plans:progress:end -->

The component library is one CSS file. It has no JavaScript. Each component reads only `--tm-*` tokens, so it follows any themetron theme and both modes.

```html
<link rel="stylesheet" href="components/components.css">
<div class="tm-theme">
  <button class="tm-button">Save</button>
  <button class="tm-button tm-button--soft theme-danger">Delete</button>
</div>
```

`.tm-theme` sets the canvas, the text color, and the body font. Put it on the element that holds your page, or on `body`. Put it on a full theme's element too, if you want that element to show the theme's own canvas.

## Parts

| Part | Classes | Variants |
|---|---|---|
| Button | `tm-button` | `--soft`, `--quiet`, `--outline`, `--ghost`, `--exact`; sizes `--sm`, `--lg` |
| Field | `tm-field`, `tm-label`, `tm-input`, `tm-select`, `tm-textarea`, `tm-hint`, `tm-error` | `aria-invalid="true"` |
| Checkbox and radio | `tm-check`, `tm-radio`, inside `tm-choice` | |
| Switch | `tm-switch` on a checkbox with `role="switch"` | |
| Card | `tm-card` | `--flat`, `--raised` |
| Badge | `tm-badge`: one body line, less the most whole grid squares of margin above and below that still leave room for its text, so it sits in the middle of the line beside it, on the grid | `--solid` |
| Alert | `tm-alert` | |
| Avatar | `tm-avatar` | |
| Progress | `tm-progress` with a `span`, and `--value` | |
| Tabs | `tm-tabs` with buttons that have `aria-selected` | |
| Segmented control | `tm-segmented` with buttons that have `aria-pressed`, and `role="group"` with an `aria-label`. One control tall, borders included. | `--sm` |
| Dialog | `tm-dialog` on a `<dialog>` | Pops in with the enter curve. See below. |
| Drawer | `tm-drawer` on a `<dialog>` | Slides in from the right. |
| Text | `tm-h1`, `tm-h2`, `tm-h3`, `tm-text`, `tm-muted`, `tm-small`, `tm-code`, `tm-link` | |
| Layout | `tm-stack`, `tm-row`, `tm-divider` | |

A part takes its color from the nearest theme class, such as `theme-danger`. `tm-invert` shows a part, and everything in it, in the other mode. A class for a theme that you did not define does nothing, so the part keeps the color around it.

## How the feels show

| Feel | Where you see it |
|---|---|
| Spaciousness | Padding, gaps, line heights, control height |
| Roundness | Every radius. At full roundness, buttons and badges are pills, and cards round a lot. |
| Depth | Shadows: solid, quiet, soft, and exact buttons rest on `elevation-1`, and fade in `elevation-2` on hover as they rise by `lift`. Outline and ghost buttons stay flat. Cards use `elevation-2`, raised cards and dialogs `elevation-3`, and fields, tracks, and pressed buttons `elevation-inset`. |
| Shininess | The shine on buttons, checks, radios, switches, badges, avatars, progress bars, and the segmented control: a gradient, an edge band, and a glow. Labels on buttons, badges, avatars, and pressed segments get a 1 px line that sets them into the surface (`text-shadow-*`). |

The other feels are removed for now. Until they come back, borders are 1 px, parts have no shadows and do not lift on hover, everything is opaque, and motion does not overshoot. The components still read the same tokens, so the effects come back without changes here.

<details>
<summary>How it works</summary>

- Parts that you act on read the action role: `--tm-fill-action`, `--tm-fg-action`, and the rest. Everything else reads the base role. A theme class on the part, or around it, sets both.
- A button uses `fill-action` and `on-fill-action`. Hover uses `fill-action-hover`, and press uses `fill-action-active` with `elevation-inset`. The soft variant uses `tint-action` and `on-tint-action`. The quiet variant is a solid button with the polarity flipped, for buttons that are not the main action: `fill-quiet` (a light base fill in light mode, a dark one in dark mode), the label `on-fill-quiet` in the text color, the same shine from the `gloss-quiet-*` grades, `highlight-quiet` and `glow-quiet`, and `fill-quiet-active` as its edge. The exact variant uses `fill-action-exact`, `on-fill-action-exact`, and `border-action-exact`: the key color itself, with white or black. As for every button, light mode puts the lighter color on the darker one: a navy fill with a white label, or a yellow label on a black fill. Dark mode mirrors it, and `tm-invert` shows the other version. At rest it is the key color exactly. Hover and press use `fill-action-exact-hover` and `fill-action-exact-active`: the nearest grades at least 10 and 20 grade numbers from the key color, away from the label. When the fill is white or black, they move toward the label instead, to 90 and 80 (or 10 and 20). Outline and ghost use `fg-action` and `border-action`, with `tint-action-hover` and `tint-action-active` on hover and press. Every state has its own label, such as `on-fill-action-hover`: it moves as far as its background, so the contrast stays the same.
- Buttons shine without adding color: two layers brighten the backdrop at the top (most along the top edge) and darken it at the bottom, as far as the shininess allows. The backdrop is the fill, and the page through a see-through fill, so a nearly clear button still shows its highlight and shadow, like glass. A soft button's shadow is its tint's own shadow grade instead, as darkening a faint wash makes gray. Both pseudo-elements hold these layers, so the raised shadow on hover is the button's own `box-shadow`. Each layer is a backdrop filter: it costs a layer and a read of what is behind it. Other parts (checks, radios, switches, badges, avatars, the progress bar, the pressed segment) paint the shared gradient, `shine-image`, from their state's gloss grades. A switch track that is on sets `--tm-shine-direction: 0deg`, so it looks inset.
- Focus shows a ring of `border-focus` at `focus-width`, with `:focus-visible`.
- A dialog or drawer moves only while it has the class `is-open`. To open it, call `showModal()`, then add `is-open` on the next frame. To close it, remove `is-open`, then call `close()` when the transition ends. The playground's `openDialog` and `closeDialog` in `demo/demo.js` do this.
- Dialogs and drawers are opaque, so their text contrast is the checked contrast on `bg.surface`. As solidity drops, cards (`bg-panel`), fields (`field-alpha`), tints and quiet buttons (`tint-alpha`), and solid fills (`fill-alpha`) turn see-through, each down to its own limit, and inverted parts use the `-inverted` opacities. A button's shine is in a layer behind the label, at the same opacity. The audit warns where a label would fall short on its part as seen over the canvas or the surface. Over photos, put `tm-over-media` on the area: see-through parts then blur what is behind them, and text gets a halo.
- **Rhythm grid.** Every part's outer edges, borders included, start and end on the rhythm grid, and so do text lines. Padding has the border width taken off it, down and across, so left edges line up too. Buttons, badges, tabs, and segmented controls round their width up to whole steps with `calc-size()`, so their right edges line up as well; browsers without it (before Chrome and Edge 129) keep the natural width. Parts that fill their container take its width, so their right edge follows the page. Line heights are fixed px values on the grid. Inline code and small print get `line-height: 0`, so they cannot stretch a line. A switch that is taller than its line is rounded up to whole steps. Native selects get a fixed height, because browsers size them by their own rules.
- With `prefers-reduced-motion`, transitions take no time.
- **Performance.** Cards and controls read their blur from `--tm-backdrop` and `--tm-backdrop-control`, which are `none` when the solidity has no blur. Any `backdrop-filter`, even `blur(0px)`, gives a part its own layer that re-captures what is behind it. On many parts at once that costs memory, and can show blank rectangles for a moment on hover.
- A test checks that every token that the CSS reads is in the theme's CSS.

</details>

## Tasks

- [x] Add a dialog and a drawer
- [ ] Add a menu, a tooltip, a table, and a toast
- [ ] Add a component test page with screenshots of each preset, to find visual regressions
- [ ] Make a neumorphic variant for alerts and badges, which now use a flat tint
- [ ] Publish the components as a separate package
