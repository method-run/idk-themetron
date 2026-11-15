---
id: consumers
title: Using themetron in a site or library
summary: The contract between themetron and the sites and libraries that use its stylesheets. Which tokens are stable, which color pairs pass, how theme classes and modes work, and how to check a stylesheet. Written so that a tool such as idk-plans can adopt themetron themes with little work.
parent: idk-themetron
kind: reference
order: 3.5
code: [src/manifest.js, bin/themetron.js, spec/tokens.manifest.json]
tags: [system/consumers]
aliases: [Using themetron in a site or library]
---
# Using themetron in a site or library

<!-- idk-plans:progress:start (generated) -->
◐ 66% (4/6)
<!-- idk-plans:progress:end -->

> **Status:** contract 0.1.0, not released yet. Until 1.0, a minor version can change stable tokens. Each change is listed in the [changelog](#changelog).

A **consumer** is a site, a doc generator, or a component library that reads a themetron stylesheet. This page says what a consumer can depend on, and what it must do. If a consumer follows it, every themetron theme set works with it, and you can change themes without changing the consumer.

The contract is in three files. The code makes them, and a test fails when they differ from the code.

| File | What it holds |
|---|---|
| [`spec/tokens.manifest.json`](./tokens.manifest.json) | Every CSS token: its tier, type, whether it holds both modes, its role, whether it is stable, and what it means. Also the color pairs that pass, and the classes and attributes. |
| [`spec/inputs.schema.json`](./inputs.schema.json) | The JSON Schema of the inputs. A draft. See [Inputs](./inputs.md "inputs"). |
| [`components/components.css`](../components/components.css) | The reference components. They follow this contract. |

From the package: `idk-themetron/spec/tokens.manifest.json` and `idk-themetron/spec/inputs.schema.json`.

The site also publishes them at fixed URLs:

- **Latest:** <https://method-run.github.io/idk-themetron/schema/tokens.manifest.json> and <https://method-run.github.io/idk-themetron/schema/inputs.schema.json>. These always hold the files from `main`.
- **One version:** put the contract version in the path, such as <https://method-run.github.io/idk-themetron/schema/0.6.0/inputs.schema.json>. Use this URL to pin a version. The files of the current version can still change until the next version. After that, they do not change.

Each schema's URL is also its `$id`. The manifest has no `$id`, because it is data, not a schema. You get the same file without it. The repository keeps each version's files in `spec/versions/`.

## The rules

1. **Load the theme stylesheet, then your own.** The theme stylesheet holds only custom properties, the mode rules, and a font `@import`. It does not style elements.
2. **Read tokens only with `var()`.** Do not define a `--tm-*` property yourself. The theme rules would fight yours.
3. **Read stable tokens.** Experimental tokens can change in any version. If you read one, give it a fallback: `var(--tm-glow-action, transparent)`.
4. **Take colors from semantic tokens when one fits.** Semantic tokens such as `--tm-fg-base` hold both modes and pass contrast. A ramp grade such as `--tm-base-90` is stable too, but it holds one value for both modes, and you must check its pairs yourself with the `gap-*` tokens. See [Grades and contrast](./grades.md "grades").
5. **Choose a role for each part.** Use the action role (`*-action`) for parts that you act on, or that show their state: links, primary buttons, checks, selected tabs. Use the base role for everything else. The theme chooses the colors. See [Roles](#roles).
6. **Use only the pairs that pass.** Put a text token only on a background that the pair table lists for it. See [Pairs that pass](#pairs-that-pass).
7. **Change color with theme classes.** Put `class="theme-success"` on the element, and read the normal tokens inside it. Do not read a theme's colors from outside its class. Put one theme class on an element.
8. **Leave the mode to the stylesheet.** Do not set `color-scheme` on a theme class. Use `data-tm-mode` to force a mode, and `tm-invert` to flip one.
9. **Work without a theme.** A theme class that the theme set does not define does nothing, so the element keeps the colors around it. A site with no themetron stylesheet at all can work too, with fallbacks: `var(--tm-bg-canvas, Canvas)`.

## Stable tokens

The manifest marks each token `stable` or `experimental`. These groups are stable:

| Group | Tokens | Type |
|---|---|---|
| Backgrounds | `bg-canvas`, `bg-surface`, `bg-sunken`, `bg-field` | color, both modes |
| Text | `fg-base`, `fg-base-muted`, `fg-base-subtle` | color, both modes |
| Borders | `border-base`, `border-base-strong`, `border-base-field`, `border-focus` | color, both modes |
| Ramp grades | `base-0` … `base-100`, `action-0` … `action-100`: 21 grades each, 5 apart | color, one value |
| Gaps | `gap-text`, `gap-large`, `gap-ui`: the grade distance that each use needs | number |
| Shadows | `elevation-1`, `elevation-2`, `elevation-3`, `elevation-inset`, `elevation-field` | shadow, both modes |
| Fonts | `font-body`, `font-heading`, `font-mono`, `font-size-*`, `font-weight-*` | font family, dimension, number |
| Rhythm | `rhythm`, `leading-*`, `leading-tight-*`, `space-*` | dimension |
| Controls | `control-height`, `control-height-sm`, `control-height-lg`, `control-padding-x`, `control-padding-y` | dimension |
| Shape | `radius-*`, `border-width`, `focus-width` | dimension |

Each name has the prefix `--tm-` in CSS. The font size, leading, and space scales are `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, and `3xl`. The manifest has the full list, and what each color is for.

Experimental tokens include the action set (`fg-action`, `border-action`, the `fill`, `tint`, `on-fill`, and `on-tint` tokens of both roles, the exact button's tokens, and `base-key` and `action-key`), the heading colors (`fg-base-heading-*`), motion (`duration-*`, `ease-*`), `line-height-*`, the gloss, `highlight-*`, `glow-*`, `text-shadow-*`, and `shine-*` tokens, `text-halo`, the panel tokens, `lift`, and the opacity tokens (`fill-alpha`, `tint-alpha`, `field-alpha`, and their twins). The reference components use some of them, because they ship with themetron and change with it.

<details>
<summary>Why the fills and tints are experimental</summary>

The names and the jobs of the fill and tint tokens can change when colors for each part of a control come. See the [Components](../components/README.md "components") tasks. Until then, read them with a fallback, such as `var(--tm-fg-action, LinkText)`. The pairs below still pass, and the test suite still checks them.

</details>

## Pairs that pass

These pairs pass the theme's contrast setting, in both modes and in every theme. The action, fill, and tint tokens in them are experimental, but while a token exists, its pairs pass. The test suite checks them for every preset, contrast setting, and label color. "Text" passes for body text (4.5:1 in WCAG 2 at the standard level). "UI" passes for controls and their edges (3:1).

| Foreground | On | Passes for |
|---|---|---|
| `fg-base`, `fg-base-muted`, `fg-action` | `bg-canvas`, `bg-surface`, `bg-sunken`, `bg-field` | text |
| `fg-base-subtle`, `border-base-strong`, `border-base-field`, `border-action` | `bg-canvas`, `bg-surface`, `bg-sunken`, `bg-field` | UI |
| `fill-action` | `bg-canvas` | UI: a solid button's shape shows on the page |
| `on-fill-action`, `on-fill-action-hover` | `fill-action`, `fill-action-hover` (each label on its own state) | text |
| `on-fill-quiet`, `on-fill-quiet-hover` | `fill-quiet`, `fill-quiet-hover` | text |
| `on-tint-base`, `on-tint-action`, and their `-hover` forms | `tint-base`, `tint-action`, and their `-hover` forms (each label on its own role and state) | text |

Other pairs can pass, but the contract does not promise it. `border-base` is decoration: it can be too faint for a control's edge. The exact button's pair (`on-fill-action-exact` on `fill-action-exact`) is the one checked pair without a promise: it uses the key color exactly, and a mid-tone key color has no partner that passes every setting. The audit marks it "warn" where it misses. The `*-active` fills show for a moment while you press, so their pairs are not promised: the audit warns where a label has no room left to follow its fill.

The pairs are in the manifest as `pairs`, so a tool can check its own pairs.

## Roles

Each theme has a color for each of two roles. A component chooses the role, and the theme chooses the color.

| Role | For | Tokens |
|---|---|---|
| **Base** | Backgrounds, body text, borders, and quiet controls, such as a secondary button or a tag | `bg-*`, `fg-base*`, `border-base*`, `fill-quiet*`, `tint-base*` |
| **Action** | Parts that you act on, or that show their state: links, primary buttons, checks, switches, selected tabs, focus rings | `fg-action`, `border-action`, `border-focus`, `fill-action*`, `tint-action*` |

In a gray theme with a blue action color, links and primary buttons are blue, and everything else is gray. In a theme that sets one color for both roles, such as a danger theme, everything is that color: a pink box, dark red text, a red link, and a red button.

<details>
<summary>Why roles, and not single tokens or elements</summary>

- **Not single tokens.** If a part takes one token, such as `fill`, from another theme, it breaks that token's pairs: the engine chose the label for a different fill.
- **Not elements.** Tokens by element, such as `link` or `button`, would put the list of components in the contract.
- **Roles.** A role is the smallest group that keeps its pairs together. The component chooses the role.

</details>

## Theme classes and theme names

Each theme in the tree is a class, `theme-<name>`. The root theme, `default`, is also on `:root`. Custom properties inherit, so the nearest theme class around an element wins. Each theme class sets every token, from the theme's place in the tree, so a theme looks the same in any section of a page.

themetron has no built-in theme names. A consumer chooses the names it uses, says so in its docs, and keeps working when a name is missing. Use these names when they fit, so that one theme set works with many consumers:

| Name | Use |
|---|---|
| `default` | Everything. Always present. |
| `success` | Done, passed, saved |
| `warning` | In progress, needs attention |
| `danger` | Blocked, failed, destructive actions |
| `info` | Notes and highlights |

<details>
<summary>Why a theme's colors come only from inside its class</summary>

A theme class sets the normal token names, such as `--tm-fg-action`, on its element. So the success color is `--tm-fg-action` inside `class="theme-success"`, and there is no `--tm-success-text` at the top level.

This keeps one set of names for every theme, so a component that reads `--tm-fill-action` works in every theme with no changes.

To show a status color in a small part, such as a dot or a badge, put the class on that part:

```html
<span class="status theme-success">Done</span>
```

```css
.status { color: var(--tm-fg-action, currentColor); }
```

</details>

## More contrast

Every theme ships a more-contrast variant at the enhanced level, with the same token names. The reader's `prefers-contrast: more` setting turns it on. A switch on the page uses `data-tm-contrast="more"` or `"base"` on `<html>`. A consumer needs to do nothing else. A consumer must not read a different token for more contrast. The tokens already change.

## Light and dark mode

Every color token holds both modes, with `light-dark()`. The browser picks one from the `color-scheme` where the token is used.

- `:root` gets `color-scheme: light dark`, so a page follows the system setting.
- `data-tm-mode="light"` or `"dark"` on an element forces that mode on it and everything in it. Put it on `<html>` for a mode switch.
- `class="tm-invert"` shows an element, and everything in it, in the other mode. Use it for chrome, such as a dark sidebar beside light content. An invert inside an invert is not supported. One exception in the reference components: a button with `tm-invert` stays in the page's mode and exchanges its fill and label, so it reads as the same button turned inside out (a white button with an action-colored label in light mode). For the exact button that is the same as the other mode's button. Quiet and soft buttons are not meant to be inverted.

A consumer must not set `color-scheme` on a theme class, or on an element that holds theme classes, except through these selectors.

## Shine

The stylesheet defines one shine gradient, `--tm-shine-image`, on every element. Each element builds it from four colors that it sets itself. To give a part the theme's shine:

```css
.my-chip[aria-selected="true"] {
  --tm-shine-rim: var(--tm-gloss-action-rim);
  --tm-shine-top: var(--tm-gloss-action-top);
  --tm-shine-shadow: var(--tm-gloss-action-shadow);
  --tm-shine-bottom: var(--tm-gloss-action-bottom);
  background: var(--tm-shine-image), var(--tm-fill-action);
}
```

- Use the gloss grades of the part's fill: `gloss-action-rim` on an action fill, `gloss-tint-<role>-rim` on a tint, and so on. Tints have grades for each state, such as `gloss-tint-action-hover-rim`. Action fills, quiet buttons, and exact buttons have resting grades only.
- The four colors are registered with `@property`, so add them to the part's `transition` and the shine fades with the fill.
- The opacity is `--tm-shininess`, times `--tm-shine-strength` (1 unless you set it; tints look right at 0.5). At shininess 0 the gradient is clear.
- An element that sets no colors has a clear gradient. Children inherit the colors, so a nested part sets its own.
- The reference buttons do not paint `shine-image`. They shade their top and bottom with filters that the `shine-backdrop-*`, `shine-filter-*`, and `shine-paint` tokens pick. See [Components](../components/README.md "components").

## Fonts

The theme stylesheet starts with an `@import` from Google Fonts when a theme names a web font. Read the fonts with `var(--tm-font-body)`, `var(--tm-font-heading)`, and `var(--tm-font-mono)`. Each one ends with a CSS generic family, so text shows before the font loads, and without it.

## Check a stylesheet

`themetron check` lists the tokens that a stylesheet reads. It ignores token definitions, so you can run it on a file that holds the theme too.

```sh
npx themetron check site.css            # fails on tokens that the contract does not have
npx themetron check site.css --strict   # also fails on experimental tokens
```

Add `--prefix <p>` for CSS made with another prefix. From code, `checkCss(css)` in `src/manifest.js` returns the same lists.

## A worked example: idk-plans

idk-plans makes doc sites with its own variables. This is a mapping that follows the contract. `themetron check` gives 12 stable tokens, 2 experimental, and 0 unknown. The experimental ones are `fg-action` and `tint-action`, and each has a fallback.

| idk-plans variable | themetron token | Notes |
|---|---|---|
| `--bg` | `--tm-bg-canvas` | |
| `--bg-raised` | `--tm-bg-surface` | |
| `--bg-sunken` | `--tm-bg-sunken` | |
| `--text` | `--tm-fg-base` | |
| `--text-muted` | `--tm-fg-base-muted` | |
| `--text-faint` | `--tm-fg-base-subtle` | Passes for UI only. Use it for hints, not for body text. |
| `--border` | `--tm-border-base` | |
| `--accent` | `--tm-fg-action` | |
| `--accent-soft` | `--tm-tint-action` | |
| `--radius` | `--tm-radius-md` | |
| `--font`, `--mono` | `--tm-font-body`, `--tm-font-mono` | Headings: `--tm-font-heading`. |
| `--done`, `--doing`, `--blocked` | `--tm-fg-action`, inside `theme-success`, `theme-warning`, and `theme-danger` | Put the class on the status element. See [Theme classes and theme names](#theme-classes-and-theme-names). |
| `--todo` | `--tm-border-base-strong` | |

For a dark sidebar beside light content, put `tm-invert` on the sidebar. In dark mode, the sidebar turns light, so a site that wants it dark in both modes uses `data-tm-mode="dark"` on the sidebar instead.

Map the variables with fallbacks, so the site still works without a theme:

```css
:root {
  --bg: var(--tm-bg-canvas, #fff);
  --text: var(--tm-fg-base, #1b1d22);
  --accent: var(--tm-fg-action, #0b57d0);
}
```

## Versions

The contract has its own version, `contract` in the manifest. It is not the package version.

- **Major:** a stable token is removed or renamed, or its type or meaning changes. Before 1.0, a minor version can do this too.
- **Minor:** a token is added, or an experimental token becomes stable.
- **Patch:** values change, but the names, types, and meanings stay the same. For example, better grades or new feels.

The package version goes up each time the contract version goes up, by at least as much. A breaking change to the contract is a breaking change to the package. The package can also go up alone, for example for a bug fix or a new export.

Change the versions only when you release. Until then, list the changes under **Unreleased** in the changelog.

## Changelog

- **Unreleased:** the first contract, 0.1.0.

The contract started again at 0.1.0. The versions before it were drafts, and no one used them. Their notes are in the git history of this file.

## Tasks

- [x] A token manifest made from the code, with a test that keeps it current
- [x] The color pairs that pass, in the manifest, with a test for every preset
- [x] `themetron check`, for consumers
- [ ] A test that fails when a stable token goes away and the major version stays the same
- [x] Publish the manifest and the schema at a fixed URL, so `$schema` links work in editors
- [ ] Change idk-plans to read themetron tokens, with the mapping above
