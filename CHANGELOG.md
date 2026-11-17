---
id: changelog
title: Changelog
summary: What changed in each version of the npm package. The token contract has its own changelog, in the consumers spec.
parent: idk-themetron
kind: reference
order: 9
aliases: [Changelog]
tags: [system/changelog]
---
# Changelog

This file lists the changes to the npm package, `@method-run/idk-themetron`. The token contract has a version of its own, and its own [changelog](./spec/consumers.md#changelog "consumers"). The package version goes up each time the contract version goes up. It can also go up alone, for example for a bug fix or a new export.

Each version has a git tag, such as `v0.2.0`, and a GitHub release with these notes. List new changes under **Unreleased**. At a release, move them under the new version. See "Publish a new version" in the [README](./README.md "idk-themetron").

## Unreleased

- **New color model: `okhsl`.** Set `contrast.model` to `okhsl`, and each grade keeps the key color's share of the most color that fits, with true OKLCH hues. A muted key color gives a muted ramp from light to dark. Contrast does not change: each grade keeps its luminance. The playground shows OKLCH and OKHSL, and HSL only in debug mode or for a theme that uses it. See [Grades and contrast](./spec/grades.md "grades").

## 0.2.2

Contract 0.2.0, unchanged.

- **Exports name their token contract.** Every export but MUI starts with a line such as `/* Made by themetron, token contract 0.2.0: <manifest URL> */`, so a tool can tell which contract made a theme. DTCG JSON has it in `$extensions.themetron`.
- **New option: `set`.** The theme set's name, such as `"Admin app"`. The first line names it as `admin-app`, and it is the daisyUI theme's name unless `name` sets one. The CLI flag is `--set <name>`.
- **New option: `icons: false`** for `toCss`, and `--no-icons` for the CLI. It leaves out the `@import` of the icon font, for pages without icons, or a site that loads the font itself. The icon tokens stay.
- **New page: [Recipes for common parts](./spec/recipes.md "recipes").** CSS for buttons, badges, cards, fields, and other parts, so that a site takes the theme's feels and not only its colors.

## 0.2.1

Contract 0.2.0, unchanged.

- **Fix: label text shadows over media.** In `tm-over-media`, a button label in a `<span>` took the page's halo instead of the button's own text shadow, so its edge line went away. Elements inside buttons, badges, avatars, and pressed segmented buttons now inherit the part's text shadow.
- **New export: `SEMANTIC_THEMES`.** The child themes that most theme systems have, in the order to add them: `danger`, `warning`, `success`, `info`, and `secondary`. Each has other systems' names for the same job, a suggested color, and its use. See [Theme names to start with](./spec/inputs.md#theme-names-to-start-with "inputs").
- **New icon: `drag_indicator`.** The six-dot grip joins the icons that the CSS loads.

## 0.2.0

Contract 0.2.0.

- **Icons.** A theme's new `icons` input sets the style (sharp, standard, or rounded), the fill, and the line weight of Material Symbols icons. New experimental tokens: `font-icon`, `icon-fill`, and `icon-weight`. The CSS loads the icon font with a second `@import`. Components have a `tm-icon` class.
- **Action gradients.** A theme's `action` input can be a two-color gradient: `{ color, to, solid, angle }`. Fills, tints, text, and edges of the action color use it, at the same grades as the solid tokens, so they pass contrast as the solid tokens do. New experimental tokens for the gradient's ends, `-image` tokens, `action-angle`, and `action-gradient`. Without a gradient, the ends are the solid color.
- See the [contract changelog](./spec/consumers.md#changelog "consumers") for every new token.

## 0.1.0

Contract 0.1.0. The first release.

- **The engine.** `buildThemes` makes a tree of themes from a few inputs: a base color, an action color, fonts, feels, presets, and a contrast standard (WCAG 2, or APCA with the WCAG 2 minimums as a floor). Every text and background pair passes, and an audit lists each pair.
- **Exports.** CSS custom properties, DTCG JSON, Tailwind, shadcn/ui, Bootstrap (Sass and CSS), Material UI, and daisyUI.
- **The CLI.** `npx themetron build` makes the tokens from an inputs file.
- **Components.** `components/components.css`, a set of parts that read only the tokens.
- **The spec.** The token contract, the inputs schema, and the token manifest, with types for TypeScript.
