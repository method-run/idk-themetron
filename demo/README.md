---
id: playground
title: Playground
summary: A web page where you change the inputs and see the components, palettes, tokens, and contrast audit change at once, in light and dark mode.
parent: idk-themetron
kind: feature
order: 6
code: [demo/, scripts/]
tags: [system/playground]
---
# Playground

<!-- idk-plans:progress:start (generated) -->
◐ 77% (7/9)
<!-- idk-plans:progress:end -->

The playground is a web page with the inputs on the left and the result on the right. Each change rebuilds the themes at once.

- **Themes:** one card for each theme, indented under its parent. The title bar shows the theme's name, kind, parent, and action ramp, with a remove button. Open a card to edit that theme, and the preview shows it. The Name field takes any text, such as "USA" or "Big Sale". The playground shows that text as the theme's label, and makes the theme's name for code from it: `usa`, `big-sale`. The hint under the field shows the class. A theme without its own label shows its name with a capital letter, such as "Warning". The Contrast section chooses WCAG 2 or APCA. Every theme ships both levels: the standard one, and the enhanced one for readers who ask for more contrast. The Contrast switch in the View menu shows the second. In order, a card has Contrast, Base color, Action color, Typography, and Feel, with a line between each. A child shows only the sections that it overrides: "Override" adds one, and × removes it, so the child takes it from its parent again. Fonts start as the browser's own sans-serif and monospace fonts, and the heading font is the same as the body font. Solid fills always have light labels in light mode, and dark labels in dark mode. The sample also shows inverted parts, with `class="tm-invert"`. A child that sets only colors is a color theme. In Typography, each font role is a Google font picker, and the Type variance slider sets how fast headings grow. Type variance is not a feel, so presets do not set it. An empty field shows, in gray, the font that the role uses now. × clears the theme's own font. "Browser default", the first suggestion, turns off a parent's web font in a child. "Apply a preset" is a one-time stamp: it opens a list of presets, and picking one sets every feel as the theme's own, and stores nothing else. The theme keeps no link to the preset. Then each feel is like a font or a color: it is bold with a × while it is the theme's own, and × takes it from the parent again (for the root, the default). The note under the button says "Matches Glass" when the feels match a preset exactly, and "Custom" when they do not, and the list marks the match with ✓. Brutalist with its parent's sizes is: apply Brutalist, then × on Spaciousness. Each section heading opens and closes the section, for every theme at once, and the page remembers it. "Override" adds a section, opens it, and scrolls to it. Each card shows in its own theme: its colors, its font, and its color on the choice controls, in the page's light or dark mode. Each card ends with "+ Add a child of *name*", which adds a child of that theme and opens it. The list is a tree: each theme's children come right after it.
- **View menu:** the View button above the output holds the mode (light, dark, or both), the contrast variant (base or more contrast), the themes that the preview shows, the grid, and the photo backdrop.
- **Preview:** the sample page, in the modes that the View menu picks. It shows the open theme. Under the buttons, two collapsible rows: "Inverted" shows the normal, soft, and exact buttons with `class="tm-invert"`, and "Descendant themes' buttons" shows the button of each theme below the open theme, in tree order, on its background. To compare other themes, pick more themes in the View menu, or All. "Photo backdrop" in the same menu puts a photo behind the samples, colored with each theme's ramps, so you can see what shows through see-through parts at high clarity. Its sliders set the hue (from the base ramp to the action ramp), the blur, the contrast, and the brightness. The samples then use `tm-over-media`: see-through parts blur the photo, and text gets a halo. Then a Compare section shows a button and a card in each theme, one row for each mode. "Side by side" puts the themes in a row. "Nested" puts each child's zone inside its parent's zone. Each zone has only its own theme class, as on a real page. A theme class sets every token from the tree, so a theme looks the same in its zone wherever the zone is. Below it, each theme has its own section with the whole sample. Each section can collapse. "Follow the open theme" goes back to one theme.
- **Motion:** in the sample, "Open a dialog" and "Open a sidebar" show the theme's motion: the enter curve, the exit curve, and the speed. Motion is the same in every theme for now.
- **Palettes:** each theme's ramps, in tree order: its own base ramp, if it sets one, then its action ramp. Also the grade gaps. There is one panel for each mode, on that mode's canvas. Each chip shows only its grade number. Point at it to see its hex value and the tokens that use it in that mode. Select two chips to compare them.
- **Tokens:** the themes as a ready-to-use **Stylesheet** (the tokens and the components in one file), CSS tokens, DTCG JSON, Tailwind, or **shadcn/ui** variables, and the inputs as JSON. A line under the formats says how to use each one. **Download** saves the format on screen as a file. In the Inputs view, **Open file…** loads inputs from a `.json` file. The Light, Dark, and Both switch does not apply here, because every format holds both modes. You can copy each one, and paste inputs to load them.
- **Copy share link**, at the top right, copies a link that holds the themes, compressed. Opening it loads them, and then takes them out of the address.
- **Audit:** every checked pair, with its WCAG ratio, APCA value, and result.

There are two ways to run it:

- `npm run dev` starts the Vite dev server at `http://localhost:4321/` and opens the playground. A change to the components shows at once. A change to the engine reloads the page.
- `npm run build` builds the documentation site with the playground in it. Then `npm run preview` serves it at `http://localhost:4321/`. `npm run plans:preview` does both. The playground is at `play/`.
- If port 4321 is in use, Vite tries the next port and prints the address. `npm run dev -- --port 5000` starts at another port.

**Grid ·** in the View menu, or the period key, shows the rhythm grid over the preview: faint lines every rhythm step, down and across. On wide screens, the inputs and the output scroll on their own. Drag the line between them to change the width of the inputs, or focus it and use the arrow keys. The chevron button at the top left of the output, labeled "Hide inputs" or "Show inputs" for screen readers, gives the output the whole width. The page remembers both in the browser.

<details>
<summary>How it works</summary>

- Vite serves and builds only the playground. Its settings are in `vite.config.js`. `demo/demo.js` imports the engine from `src/` and the styles from `components/`. The engine itself has no build step and no dependencies.
- `npm run build` builds the docs with idk-plans into `_site/`. Then `vite build` bundles the playground into `_site/play/`. Last, `scripts/build-site.js` adds links between the docs and the playground. Any static host can serve `_site/`.
- The page keeps your inputs in the browser's local storage. Nothing leaves the browser, except requests for Google Fonts.
- Links open a view: `#palettes`, `#tokens`, `#audit`. `?preset=glass` opens the page with a preset.

</details>

## Tasks

- [x] Show the inputs, the preview, the palettes, the tokens, and the audit
- [x] Show light and dark mode side by side
- [ ] Publish the playground on GitHub Pages
- [x] Share a theme as a link
- [x] Open and download the inputs as a file, and download each token format
- [x] Show several themes at once: side by side, and nested in their parents
- [x] Show the theme's motion: a dialog, a sidebar, and a sliding dot
- [x] Edit the tree as cards, one for each theme, with overrides that a child can add and remove
- [ ] Add sample pages for other kinds of sites, such as a blog and a dashboard
