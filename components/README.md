---
id: components
title: Components
summary: A small CSS component library that reads only themetron tokens. It shows how each feel changes real parts, such as buttons, fields, and cards.
parent: idk-themetron
kind: module
order: 4
code: [components/components.css, components/looks.css, src/looks.js]
tags: [system/components]
---
# Components

<!-- idk-plans:progress:start (generated) -->
◐ 37% (3/8)
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

## Looks

A **look** gives your own element the appearance of a themetron part, without its layout. Your element keeps its size, padding, and markup. The look gives it the fill, edge, radius, shadows, shine, gradients, motion, and how they change on hover and press.

```html
<link rel="stylesheet" href="themetron.looks.css">  <!-- the "looks" export: the tokens and the looks -->
<button class="my-button tm-look-fill">Save</button>
<a class="nav-link tm-look-gradient-text" href="/docs">Docs</a>
<aside class="sidebar tm-look-surface">…</aside>
<div class="menu tm-look-surface tm-enter-pop" popover>…</div>
```

| Look | Gives | Worn by |
|---|---|---|
| `tm-look-fill` | A solid action fill, with the shine and the lift: a primary button | `tm-button` |
| `tm-look-tint` | A soft tint of the action color: a secondary button, or a selected item | `tm-button--soft` |
| `tm-look-quiet` | A quiet fill in the base color, for parts that are not the main action | `tm-button--quiet` |
| `tm-look-outline` | An edge in the action color, with a tint on hover | `tm-button--outline` |
| `tm-look-ghost` | Action text with no edge, and a tint on hover | `tm-button--ghost` |
| `tm-look-surface` | A card or panel: the panel color, edge, radius, elevation, and frost | `tm-card` |
| `tm-look-field` | A text field: the field color, edge, radius, and inset shadow | `tm-input`, `tm-select`, `tm-textarea` |
| `tm-look-gradient-text` | Action text, such as a link. In a gradient theme, the letters wear the gradient. | `tm-link` |
| `tm-look-ring` | An edge in the action color. In a gradient theme, the edge is the gradient. | |
| `tm-enter-pop` | Motion: pops in place as it appears, such as a menu | `tm-pop` |
| `tm-enter-arrive` | Motion: comes in from below with a spring, such as a toast | `tm-toast` |
| `tm-enter-fade` | Motion: fades in and out in place | |

A motion look plays when its element appears: when it is added to the page, loses `hidden`, or is a dialog or popover that opens. It plays out when the element gets `hidden`, or the dialog or popover closes. It needs no script.

Each look also comes as a Sass mixin and a Tailwind CSS v4 utility of the same name, so you can give a look to your own class without changing your markup. For the `pkg:` URL, Sass 1.71 or later needs its Node package importer, such as `--pkg-importer=node`.

```scss
@use "pkg:@method-run/idk-themetron/looks.scss" as tm;
.my-button { @include tm.look-fill; }
```

```css
@import "tailwindcss";
@import "@method-run/idk-themetron/looks.tailwind.css";
.my-button { @apply tm-look-fill; }
```

On Bootstrap, the `bootstrap-css` export can put the looks on Bootstrap's own classes, so you don't change your markup. Build it with `--looks`, or pick **Themetron looks** in the playground.

| Bootstrap class | Look |
|---|---|
| `.btn-primary`, and `.btn-danger`, `.btn-warning`, `.btn-success`, `.btn-info` when the theme set has that status theme | `fill`, in that status theme's colors |
| `.btn-secondary` | `quiet` |
| `.btn-outline-primary`, and the outline button of each status theme | `outline` |
| `.btn-link` | `ghost` |
| `.card` | `surface` |
| `.form-control`, `.form-select` | `field` |

<details>
<summary>How looks work</summary>

- `components/looks.css` is the one source. `components.css` imports it, and each look's rules also name the components that wear it, such as `.tm-look-tint, .tm-button--soft`. So the components and the looks cannot drift apart.
- `npm run looks` makes `components/_looks.scss` and `components/looks.tailwind.css` from `looks.css`. They name no components. A test fails when they are out of date. In a browser, the three forms of each look give the same computed styles, at rest, on hover, and on press.
- A look's rules have the specificity of one class, as a component's do. A class of your site that comes later wins, and an element rule, such as a reset of `button`, does not. The looks are not in a cascade layer: a site's unlayered reset of `button` would win over a layer, and wipe the looks.
- The token manifest lists each look under `looks`: what it gives, its states, the components that wear it, its Sass and Tailwind names, and the tokens it reads. All looks are experimental for now.
- `looksOn(looksCss, targets)` puts other classes in place of the looks, such as `{ fill: '.btn-primary' }`, with the same order and specificity. The Bootstrap export uses it. It also adds the tokens, with each status theme's rules naming its buttons, and makes the mode follow `data-bs-theme`, not the system setting.
- The shine of a fill is sized for a control. A taller part can set `--_shine-height` to its own height.

</details>

## Parts

| Part | Classes | Variants |
|---|---|---|
| Button | `tm-button` | `--soft`, `--quiet`, `--outline`, `--ghost`, `--exact`; sizes `--sm`, `--lg`; `--icon` for a square button with only an icon (give it an `aria-label`). Put the label in a `<span>` to center it on its capital letters, in browsers with `text-box`. |
| Field | `tm-field`, `tm-label`, `tm-input`, `tm-select`, `tm-textarea`, `tm-file` (on `<input type="file">`: its button is a quiet button), `tm-input-icon` (a `<span>` around a `tm-icon` and then a `tm-input`, for an icon at the field's start, such as a search field), `tm-hint`, `tm-error` | `--soft` (the action tint and edge, for a state such as an error), `--quiet` (the base tint, with the usual edge), such as `tm-input--soft`; `aria-invalid="true"` |
| Checkbox and radio | `tm-check`, `tm-radio`, inside `tm-choice` | `--soft`, `--quiet`: the tint shows while it is not checked |
| Switch | `tm-switch` on a checkbox with `role="switch"` | |
| Card | `tm-card` | `--flat`, `--raised` |
| Badge | `tm-badge`: one body line, less the most whole grid squares of margin above and below that still leave room for its text, so it sits in the middle of the line beside it, on the grid | `--solid` |
| Alert | `tm-alert` | |
| Avatar | `tm-avatar` | |
| Progress | `tm-progress` with a `span`, and `--value` | |
| Tabs | `tm-tabs` with buttons that have `aria-selected` | |
| Segmented control | `tm-segmented` with buttons that have `aria-pressed`, and `role="group"` with an `aria-label`. One control tall, borders included. | `--sm` |
| Icon | `tm-icon` on a `<span>` with the icon's name, such as `<span class="tm-icon" aria-hidden="true">star</span>`. The names are in `ICONS` in `src/icons.js`. | `--filled`, `--outline` set the fill of one icon, such as a chosen star. |
| Menu | `tm-menu` with `tm-menu-item` rows, `tm-menu-group` and `tm-menu-label` for groups, `tm-menu-note` for a note at the end of a row, and `tm-menu-empty` | The active row has `is-active`, and the chosen row `aria-selected="true"`, which shows a check. Set `--menu-item-font` on a row to give it its own font. A `tm-icon` in a row sits before its name. See below. |
| Dialog | `tm-dialog` on a `<dialog>` | Pops in with the enter curve. On a short screen, it scrolls inside. See below. |
| Drawer | `tm-drawer` on a `<dialog>` | Slides in from the right. |
| Text | `tm-h1`, `tm-h2`, `tm-h3`, `tm-text`, `tm-muted`, `tm-small`, `tm-code`, `tm-link` | |
| Layout | `tm-stack`, `tm-row`, `tm-divider` | |

A part takes its color from the nearest theme class, such as `theme-danger`. `tm-invert` shows a part, and everything in it, in the other mode. A class for a theme that you did not define does nothing, so the part keeps the color around it.

## How the feels show

| Feel | Where you see it |
|---|---|
| Roundness (Round) | Every radius. At full roundness, buttons and badges are pills, and cards round a lot. |
| Spaciousness (Space) | Padding, gaps, line heights, control height |
| Depth (Depth) | Shadows: solid, quiet, soft, and exact buttons rest on `elevation-1`, and change to `elevation-2` on hover as they rise by `lift`. Outline and ghost buttons stay flat. Cards use `elevation-2`, raised cards and dialogs `elevation-3`, text fields, checks, and radios `elevation-field`, and tracks and pressed buttons `elevation-inset`. |
| Softness (Soft) | How blurry the shadows are, and how far headings lighten. Below 0.5, shadows get darker and sharper, and card and dialog edges (`panel-border`) move toward the text color. At the top of the range, a light shadow up and to the left, button and card edges fade to half (`edge-alpha`), and text fields, checks, and radios look pressed into the page (`elevation-field`, `border-base-field`), for a neumorphic look |
| Thinness (Thin) | How wide edges are (`border-width`, `panel-border-width`). Fields, checks, radios, switches, segmented controls, outline buttons, dividers, tabs, and links keep at least 1 px. The edges of cards, dialogs, other buttons, badges, alerts, avatars, and progress bars can go away. |
| Shininess (Shine) | Buttons get a brighter top and a darker bottom. Checks, radios, switches, badges, avatars, progress bars, and the pressed segment get a gradient, an edge band, and a glow. Labels on buttons, badges, avatars, and pressed segments get a 1 px line that sets them into the surface (`text-shadow-*`). |
| Clarity (Clear) | How see-through cards, fields, tints, quiet buttons, and solid fills are. Labels on fading solid fills get a halo of the fill's color. |

Energy and Play set the motion: how fast parts move, and how far they travel and bounce. The theme's animation input can turn travel off (`fade`) or all motion off (`none`). See [Motion](../spec/inputs.md#motion "inputs").

<details>
<summary>How it works</summary>

- Parts that you act on read the action role: `--tm-fill-action`, `--tm-fg-action`, and the rest. Everything else reads the base role. A theme class on the part, or around it, sets both.
- A button uses `fill-action` and `on-fill-action`. Hover uses `fill-action-hover`, and press uses `fill-action-active` with `elevation-inset`. The soft variant uses `tint-action` and `on-tint-action`. The quiet variant is a solid button with the polarity flipped, for buttons that are not the main action: `fill-quiet` (a light base fill in light mode, a dark one in dark mode), the label `on-fill-quiet` in the text color, the same shine as a solid button, and `fill-quiet-active` as its edge. It floats like a solid button, and fades with the tints. The exact variant uses `fill-action-exact`, `on-fill-action-exact`, and `border-action-exact`: the key color itself, with white or black. As for every button, light mode puts the lighter color on the darker one: a navy fill with a white label, or a yellow label on a black fill. Dark mode mirrors it, and `tm-invert` shows the other version. At rest it is the key color exactly. Hover and press use `fill-action-exact-hover` and `fill-action-exact-active`: the nearest grade at least 5 grade numbers lighter on hover, and at least 5 darker on press. A white fill stays white on hover, and only its label gets lighter. A black fill stays black when pressed, and only its label gets darker. The edge is always the key color. Outline and ghost use `fg-action` and `border-action`, with `tint-action-hover` and `tint-action-active` on hover and press. Every state has its own label, such as `on-fill-action-hover`: it moves as far as its background, so the contrast stays the same.
- A button with `tm-invert` is turned inside out instead of shown in the other mode: it stays in the page's mode, its label color becomes its fill and its fill color its label (for each state), its new fill fades like a tint, and its edge stays solid. A default button becomes a white button with an action-colored label and edge in light mode, and a black one in dark mode. For an exact button this is the same as the other mode's button, as both modes use the same pair. Exact buttons fade with clarity half as far as other buttons (to 75%, or 55% inverted, at clarity 1), and their edge is always the key color, at the button's opacity. Each variant sets only its colors (`--_bg`, `--_fg`, `--_edge`, `--_alpha`, `--_line`), and one rule paints them and one rule exchanges them, so every button inverts the same way. Quiet and soft buttons are not meant to be inverted: they are built to sit one step off their own page.
- Buttons shine without adding color: two layers brighten the backdrop at the top (most along the top edge) and darken it at the bottom, as far as the shininess allows. The backdrop is the fill, and the page through a see-through fill, so a nearly clear button still shows its highlight and shadow, like glass. A soft button's shadow is its tint's own shadow grade instead, as darkening a faint wash makes gray. Both pseudo-elements hold these layers, so the raised shadow on hover is the button's own `box-shadow`. Only when parts are see-through are the layers backdrop filters, which cost a layer and a read of what is behind them; when parts are opaque they are painted in the fill's color with a plain filter, which looks the same. Other parts (checks, radios, switches, badges, avatars, the progress bar, the pressed segment) paint the shared gradient, `shine-image`, from their state's gloss grades. A switch track that is on sets `--tm-shine-direction: 0deg`, so it looks inset.
- Focus shows a ring of `border-focus` at `focus-width`, with `:focus-visible`.
- A dialog or drawer moves only while it has the class `is-open`. To open it, call `showModal()`, then add `is-open` on the next frame. To close it, remove `is-open`, then call `close()` when the transition ends. The playground's `openDialog` and `closeDialog` in `demo/demo.js` do this.
- Dialogs and drawers are opaque, so their text contrast is the checked contrast on `bg.surface`. As clarity rises, cards (`bg-panel`), fields (`field-alpha`), tints and quiet buttons (`tint-alpha`), and solid fills (`fill-alpha`) turn see-through, each down to its own limit, and inverted parts use the `-inverted` opacities. A button's shine is in layers behind the label, and fades less than the fill, so a nearly clear button still shows it. A label whose polarity matches the page behind it gets a halo of its part's fill color as the part fades: solid fills normally, and tints and quiet buttons when inverted. The audit warns where a label would fall short on its part as seen over the canvas or the surface. Over photos, put `tm-over-media` on the area: see-through parts then blur what is behind them, and text gets a halo.
- **Rhythm grid.** Every part's outer edges, borders included, start and end on the rhythm grid, and so do text lines. Padding has the border width taken off it, down and across, so left edges line up too. Buttons, badges, tabs, and segmented controls round their width up to whole steps with `calc-size()`, so their right edges line up as well; browsers without it (before Chrome and Edge 129) keep the natural width. Parts that fill their container take its width, so their right edge follows the page. Line heights are fixed px values on the grid. Inline code and small print get `line-height: 0`, so they cannot stretch a line. A switch that is taller than its line is rounded up to whole steps. Native selects get a fixed height, because browsers size them by their own rules.
- Icons are Material Symbols, a variable icon font from Google Fonts. The theme's CSS loads only the icons in `ICONS`, about 25 KB for each style, and only when a page shows one. The `@import` of the font's CSS still costs a request on every page: `toCss(built, { icons: false })`, or `--no-icons`, leaves it out, for a site without icons, or one that loads the font itself. The icon tokens stay. The theme's `icons` input sets the style (`font-icon`), the fill (`icon-fill`), and the line weight (`icon-weight`), and `tm-icon` sets the font's axes from them. The feels do not change icons. The font picks its optical size from the icon's size. An icon is decoration, so give it `aria-hidden="true"`, and put its meaning in text or in an `aria-label`.
- **Action gradient.** Solid fills, soft buttons, and badges paint the action color as a gradient layer under their shine, from the `-from` and `-to` tokens, blended in OKLCH. Without a gradient both ends are the same color, so the parts look as before. The halo and the label's edge line stay the solid color. A button's two ends are registered colors (`@property`), so hover and press fade, as a solid fill does.
- **Gradient text and edges.** Only where `--tm-action-gradient` is `on`, through a style query, so solid themes are unchanged. Text: links, error messages, the selected tab, and the labels of soft, outline, and ghost buttons and badges are painted with the gradient, clipped to the letters (`background-clip: text`), one line tall, and without a text shadow. On buttons, the gradient is on the label's `<span>` and the icon, so the button's shine does not wash it out. A button label without a span stays solid. Underlines and selected text stay solid. Edges: outline buttons and badges draw a ring on `::before`, cut out with a mask; the selected tab's underline is a border image; a checked check or radio drops its edge. Text fields, alerts, and focus rings keep solid edges. Browsers without style queries for custom properties (Firefox, for now) show the solid color.
- A menu is opaque, like a dialog, so its text contrast is the checked contrast on `bg.surface`. The active row uses `tint-action` and `on-tint-action`. A row's note keeps the menu's font when the row has its own. The CSS has no behavior: the page opens the menu, places it, and moves the active row. The playground's font fields do this with `combobox()` in `demo/combobox.js`: a text field with a menu that it filters as you type, with keys and ARIA roles. The menu is a popover, so it shows over panels that scroll.
- With `prefers-reduced-motion`, transitions take no time.
- **Performance.** Cards and controls read their blur from `--tm-backdrop` and `--tm-backdrop-control`, which are `none` when the clarity has no blur. Any `backdrop-filter`, even `blur(0px)`, gives a part its own layer that re-captures what is behind it. On many parts at once that costs memory, and can show blank rectangles for a moment on hover.
- A test checks that every token that the CSS reads is in the theme's CSS.

</details>

## Tasks

- [x] Add a dialog and a drawer
- [x] Add a menu
- [x] Add icons: Material Symbols, with a style, a fill, and a weight for each theme
- [ ] Add a tooltip, a table, and a toast
- [ ] Add a component test page with screenshots of each preset, to find visual regressions
- [ ] Make a neumorphic variant for alerts and badges, which now use a flat tint
- [ ] Publish the components as a separate package
- [ ] Let a part pick an ancestor theme for each of its pieces: the fill, the label, the border, and the focus ring. For example, a button with the fill of `brand` and the label of `default`. This is finer than the roles, and it stays in the components, so the token contract does not change. The audit checks each pair that it makes.
