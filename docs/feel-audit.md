---
id: feel-audit
title: "Feel audit: steps, cross-effects, and mode asymmetries"
summary: For each of the nine feels, what it controls, where its output jumps, and where it changes something outside its own domain. Also the places where light and dark mode differ in kind, the jumps that the contrast solver makes, and leftovers from the removed cross-effects.
parent: inputs
kind: reference
order: 2.5
code: [src/tokens.js, src/export.js, components/components.css, src/inputs.js]
tags: [system/inputs/feel-audit]
aliases: ["Feel audit: steps, cross-effects, and mode asymmetries"]
---
# Feel audit

This audit lists what each feel still does that is not a smooth change in its own domain. The goal: each feel scales its own domain smoothly, with no breakpoints, and pokes no one-off properties. Effects come back later, one by one, as continuous effects.

## How we measured

- We swept each feel from 0 to 1 in steps of 0.01 with `buildThemes` from `src/index.js`. The other feels kept their defaults. We compared every primitive, every semantic token ref in both modes, every computed value, and the `gloss-<role>` CSS from `semanticEntries`.
- Key colors: `#0000ee` (the default), `#2456e8`, `#ffd43b`, `#3ddc97`, `#d6336c`, `#777777`, `#808080`.
- Contrast: WCAG 2, standard level, OKLCH, unless a line says otherwise. We also swept solidity with APCA and with the more-contrast variant.
- A "grade jump" is one step on the ramp, such as 60 to 70. Between neighbor grades the WCAG ratio is about 1.36:1. Two grades are about 1.84:1.
- We did not open a browser. Statements about blend modes come from the CSS blend formulas, not from screenshots.

> **Note: line numbers.** `src/tokens.js` now has a TEMPORARY block near `const labels` (lines 211 to 215). It makes fill labels pure 0 or 100, and picks the lightest (light mode) or darkest (dark mode) passing fill. It is a visual test and will be reverted. This audit describes the normal rule: labels `[5, 0]` (mirrored in dark mode) and `fill = near.find(fits)`. All measurements used the normal rule. The `src/tokens.js` line numbers below are for the file without the TEMPORARY block. In the current file, add 4 to every number after line 210.

## Spaciousness

**Controls (intended).**

- Rhythm: `round(2 + 4 s)` px (`src/tokens.js:59`). The space unit is `4 × rhythm`, and the space scale is a set of multiples of it (`src/tokens.js:60-61`).
- Body text size: `round(14 + 2.5 s)`, with a 1.2 ratio between sizes (`src/tokens.js:63-64`).
- Line height ratios: body `1.35 + 0.25 s`, tight `1.15 + 0.1 s` (`src/tokens.js:65-66`). Each line height snaps to the rhythm (`src/tokens.js:69`).
- Control padding and heights are whole rhythm steps (`src/tokens.js:75-90`).

**Step changes.**

- Rhythm steps at s = 0.13, 0.38, 0.63, 0.88 (2 → 3 → 4 → 5 → 6 px). Every space step, padding, and control height jumps with it. By design: this is the whole-pixel rhythm grid.
- Font sizes step at s = 0.2, 0.6, 1 (md: 14 → 15 → 16 → 17). By design: whole pixels.
- **Artifact: line heights go down as spaciousness goes up.** Measured `font.leading.md`: 18 (s 0) → 20 (0.02) → 18 (0.13) → 21 (0.18) → 20 (0.38) → 24 (0.46) → 25 (0.63) → 24 (0.88) → 30 (1). `leadingTight.md` (the button text line): 16 → 15 → 18 → 16 → 20 → 18 → 24. `leadingTight.xs`: 15 → 12 at s = 0.88. Cause: `snap()` rounds `size × ratio` to the nearest multiple of the rhythm (`src/tokens.js:69`). When the rhythm grows, the nearest multiple can be lower. The ratio and the size grow, but the snapped value can still fall. Suggestion: round up (`ceil`) instead of to the nearest, or keep the snapped value monotonic.
- Control height stays monotonic (24 → 27 → 30 → 32 → 36 → 40 → 42 → 48), because padding absorbs the line height change.

**Out of domain.**

- `radius.control` is `r × control.height / 2` (`src/tokens.js:96`). So the control radius jumps when the control height jumps (measured 4.2 → 8.4 px at the default roundness). By design: the spec defines roundness as a share of the most a part can round (`spec/inputs.md:148`).
- None else.

## Roundness

**Controls (intended).** `radius.sm = 6 r`, `md = 12 r`, `lg = 24 r`, `control = r × control.height / 2` (`src/tokens.js:92-98`). Rounded to 0.01 px.

**Step changes.** None. Every radius changed at every 0.01 step. Component CSS uses `min()` and `max()` on radii (`components/components.css:131`, `:278`, `:357-358`). These make kinks, not jumps.

**Out of domain.** None.

## Thickness

**Controls (intended).** `border.width = round(4 t)` (`src/tokens.js:73`). `panelBorderWidth` is the same value (`src/tokens.js:145`). The focus width is `max(2, width + 1)` (`src/tokens.js:130`). Control padding loses the border width, so outer edges stay on the grid (`src/tokens.js:81-82`).

**Step changes.**

- Border width steps at t = 0.13, 0.38, 0.63, 0.88 (0 → 1 → 2 → 3 → 4 px). Padding steps down by 1 px at the same points. By design: whole pixels.
- Focus width steps at t = 0.38, 0.63, 0.88 (2 → 3 → 4 → 5). By design.
- **Artifact: at t = 0.13 a contrasting border appears on every solid fill.** Buttons, solid badges, avatars, and checked switches use `fill-action-active` for their edge (`components/components.css:69`, `:208`, `:254`, `:277`). That grade is two grades from the fill (about 1.84:1). So the step from 0 to 1 px adds a visible ring, not a faint edge. See also [Mode asymmetries](#mode-asymmetries).
- **Artifact: small controls grow by two rhythm steps at high thickness on a tight grid.** `heightSm` grows while it is less than `leadingTight.sm + 2 × border width` (`src/tokens.js:88`). Measured at s = 0: `heightSm` is 20 px for t < 0.88, and 24 px at t = 1. At s = 0.13: 21 → 27 px.

**Out of domain.**

- **Field color.** `bg.field` is the surface grade when there is a border, and the sunken grade when the border width is 0 (`src/tokens.js:184`). So fields change color at t = 0.13: light base.10 → base.0, dark base.100 → base.90. This is a color switch at a threshold.
- **Badge text line.** The badge line height is `leading.md − 2 × rhythm − 2 × border width` (`components/components.css:247`). Thickness takes this from the text. Measured at s = 0.5: 16 px at t = 0, 8 px at t = 1, for 13 px text. At s = 0.13 and t = 1 it is 4 px. The text then overflows its line.
- **Padding clamps.** Small button and badge padding is `max(0, 2 × rhythm − border width)` (`components/components.css:117`, `:237`). Tab padding is `2 × rhythm − max(2px, border width)` (`:310`). At s ≤ 0.12 and t = 1, these reach 0. Edges stay on the grid, but the text touches the border.

## Depth

**Controls (intended).** Shadow offset `y = d × [2, 6, 16]` px for elevation 1, 2, 3 (`src/tokens.js:331`). Hover lift `2 d` px (`src/tokens.js:143`).

**Step changes.** None that show. `d = 0` returns an empty shadow (`src/tokens.js:330`), but at `d = 0.01` the shadow is already `0px 0px 0px`, so the change is smooth. Values round to 0.1 px.

**Out of domain.** None.

Mode note: the shadow alpha is 1.8 times higher in dark mode (`src/tokens.js:334`). See [Mode asymmetries](#mode-asymmetries).

## Shininess

**Controls (intended).**

- `effect.gloss`: a white overlay. Top alpha `0.55 sh`, middle `0.12 sh`, clear at `50 + 50 (1 − sh)` %, bottom black `0.1 sh` (`src/tokens.js:134`). Soft and quiet buttons and the switch thumb use it with `soft-light` (`components/components.css:99`, `:101`, `:202-204`).
- `highlight`: an inset 1 px white line, alpha `0.6 sh` (`src/tokens.js:135`, `:324`).
- The ramp gloss on solid fills: `gloss.<role>-top` and `-bottom` grades (`src/tokens.js:239-246`), drawn by `gloss-<role>` (`src/export.js:80-87`).

**Step changes.**

- `effect.gloss` and `highlight`: smooth. They changed at every step.
- **Artifact: the ramp gloss turns on at full strength.** At sh = 0.01, the top grade moves one grade lighter and the bottom one grade darker (measured for every key color). The gradient in `glossGradient` has no alpha that scales with shininess (`src/export.js:84-86`). So 0.01 looks like 0.33. Shininess sets only how many grades the gloss may reach, not how strong it is.
- **Artifact: the reach steps at 0.34.** `reach` is 0, 1, or 2 grades at sh = 0, < 0.34, ≥ 0.34 (`src/tokens.js:240`). Measured: dark top moves a second grade at 0.34 (for `#0000ee`: action.40 → action.30). In light mode the label check usually stops the top at one grade or at the fill, so light mode often does not change at 0.34.
- **Artifact: the gradient shape switches at 0.6.** Below 0.6 the top fades to clear at 60 %. At 0.6 and above, the top holds at 60 % strength to 48 %, then drops to clear at 50 % (`src/export.js:84-86`). This adds a hard edge at the middle in one step.
- Only the hard edge in `effect.gloss` moves smoothly with shininess (`src/tokens.js:134`). The ramp gloss has three steps.

**Out of domain.** None. But the ramp gloss strength depends on the label contrast, so it is different in kind between modes. See [Mode asymmetries](#mode-asymmetries). Suggestion: scale the gloss layer opacity with shininess, and give the reach and the shape a smooth blend.

## Softness

**Controls (intended).** For each shadow (`src/tokens.js:328-336`):

- Blur `y × 3 f`.
- Side offset `y × (1 − f)²`.
- Alpha `(1 − f) × 0.85 + 0.12`, times 1.8 in dark mode, at most 1.

**Step changes.** No jumps. Values round to 0.1 px and 0.01 alpha.

- **Kink in dark mode.** The dark alpha reaches its limit of 1 at f ≤ 0.49 (measured: 1.000 at f = 0.48, 0.996 at 0.49, 0.828 at 0.6). So in dark mode, softness from 0 to 0.49 does not change shadow darkness. In light mode the alpha goes from 0.97 to 0.12 over the whole range.
- With depth 0, softness has no effect. Presets `flat` set softness with depth 0 (`src/inputs.js:21`).

**Out of domain.** None. The side offset is in the spec (`spec/inputs.md:150`).

## Solidity

**Controls (intended).**

- Card opacity `0.15 + 0.85 so` (`src/tokens.js:136`).
- Fill opacity `0.75 + 0.25 so` (`src/tokens.js:139`). Inverted fill opacity `0.05 + 0.95 so` (`src/tokens.js:141`).
- Tint opacity starts from the card opacity (`src/tokens.js:38`).
- Backdrop blur `round((1 − so) × 20)` px (`src/tokens.js:142`). Controls get a quarter of it (`src/export.js:37`).

**Step changes.**

- Opacities: smooth (0.01 steps). Blur: whole pixels, by design. `backdrop` is `none` at blur 0 (so ≥ 0.98), which looks the same as `blur(0px)`.
- **Artifact: fill grades jump.** The engine picks the fill so that its label passes over the canvas at the fill opacity (`src/tokens.js:219-231`). As solidity changes, the fill moves a whole grade. Hover, active, and both gloss grades move with it. See [Contrast-driven jumps](#contrast-driven-jumps) for the values.
- **Artifact: the label flips between 5 and 0.** `labelFor` takes the first label that passes, 5 then 0 (`src/tokens.js:211`, `:221`). As the fill moves, the label goes back and forth. Measured for `#ffd43b` in light mode: 5 → 0 (0.02) → 5 (0.26) → 0 (0.42) → 5 (0.7) → 0 (0.94). Dark mode `#0000ee`: 95 → 100 (0.22) → 95 (0.58) → 100 (0.94). The change is small, but it is not monotonic.
- **Artifact: the opacity searches use a 0.05 grid that starts at the solidity.** `seeThrough` and `panelSeeThrough` try `start, start + 0.05, …` and return 1 if none passes below 1 (`src/tokens.js:356`, `:369`). So the result depends on where the grid lands. Measured: `tintAlphaInverted` and `panelAlphaInverted` flicker between 0.99 and 1 as solidity changes (34 flips for `#ffd43b`). The flicker is not visible, but a raised opacity can jump by up to 0.05.
- For the tested colors, `fillAlpha` and `tintAlpha` were never raised. `tintAlphaInverted` and `panelAlphaInverted` were always about 1. So inverted tints and inverted cards are solid at every solidity, as the spec says (`spec/tokens.md:163-164`).

**Out of domain.**

- **Solid parts change color with solidity.** Checkboxes, radios, switches, avatars, progress bars, pressed segments, and solid badges use `fill-action` at full opacity (`components/components.css:174`, `:208`, `:279`, `:299`, `:361`, `:254`). They do not become see-through. But their grade still moves when solidity moves, because the fill is chosen for the see-through button. Suggestion: a separate opaque fill token, or let these parts use `fill-alpha` too.
- The white sheen on soft and quiet buttons (`--tm-gloss`) is not scaled by `tint-alpha` (`components/components.css:99`, `:101`). The ramp shine on solid buttons is scaled by `fill-alpha` (`:97`). So at low solidity, soft buttons keep a full-strength sheen on a faint tint.

## Bounciness

**Controls (intended).** The `enter` easing overshoots to `1 + 0.9 b` (`src/tokens.js:109`). The spec says bounciness is "the easing curve for parts that move in" (`spec/inputs.md:121`).

**Step changes.** None. Values round to 0.01.

**Out of domain.**

- The `standard` easing also overshoots: its second control point is `(0.6 − 0.3 b, 1 + 0.6 b)` (`src/tokens.js:108`). At the default b = 0.2 it is 1.12. Components use `standard` for color, background, border, and shadow transitions (`components/components.css:84-86`, `:137`, `:164`, `:191`, `:206`, `:319`, `:354`, `:388`). So a hover color goes past its target and comes back. This is a bounciness effect on colors, outside its domain.

## Snappiness

**Controls (intended).** Base duration `round(420 − 340 n)` ms, fast 0.6 times, slow 1.7 times (`src/tokens.js:104-106`). The first control point of `standard` and `enter` moves left as n grows (`src/tokens.js:108-109`).

**Step changes.** None. Whole milliseconds.

**Out of domain.** None.

## Mode asymmetries

These make light and dark mode look different in kind, not only mirrored.

1. **The ramp gloss is a bottom shade in light mode and a top shine in dark mode.** Cause: the gloss grades stop where the label fails (`src/tokens.js:241-244`). In light mode the label is white, so a lighter top grade often fails. In dark mode the label is black, so lighter grades pass. Measured at sh = 1:

   | Key | Light: top, fill, bottom | Dark: top, fill, bottom |
   |---|---|---|
   | `#0000ee` | 60, 70, 80 (1.36:1 each way) | 30, 50, 50 (top 1.83:1, no bottom) |
   | `#d6336c`, `#777777`, `#2456e8` | 50, 50, 60 (no top) | 30, 50, 50 (top 1.83:1, no bottom) |
   | `#ffd43b` | 50, 50, 60 (no top) | 5, 10, 20 |

   So for most mid-tone keys, light buttons get only a darker bottom, and dark buttons get only a strong lighter top.
2. **The hard edge at shininess ≥ 0.6 shows mainly in dark mode.** The edge is the top color at 60 % strength, cut at 48–50 % (`src/export.js:86`). In dark mode the top is two grades from the fill. In light mode the top is often the fill itself, so the edge is invisible. This is the harsh dark-mode edge. It comes from item 1 plus the shape switch.
3. **Fill edges: darker in light mode, lighter in dark mode.** Buttons, solid badges, avatars, and checked switches use `fill-action-active` for the edge (`components/components.css:69`, `:208`, `:254`, `:277`). Active moves away from the label (`src/tokens.js:233-235`): two grades darker in light mode, two grades lighter in dark mode (measured 1.83:1 to 1.85:1 for every mid-tone key). So dark buttons get a light ring, and light buttons get a dark outline. The checkbox uses `fill-action` for its edge (`:174`), so it has no ring.
4. **Hover lightens in dark mode and darkens in light mode.** Same rule (`src/tokens.js:233-234`). This is by design for contrast, but dark buttons seem to glow on hover, and light buttons seem to sink.
5. **Shadows are 1.8 times darker in dark mode and reach the limit at softness ≤ 0.49** (`src/tokens.js:334`). Shadows are black in both modes. See [Softness](#softness).
6. **The highlight is half as strong in dark mode** (`src/tokens.js:324`): `0.3 sh` against `0.6 sh`.
7. **The white `soft-light` sheen lifts dark tints much more than light tints.** Soft and quiet buttons and the switch thumb blend `--tm-gloss` with `soft-light` (`components/components.css:99`, `:101`, `:204`). With the W3C formula, a white layer on a channel near 0.95 adds about 0.025. On a channel near 0.1 it adds about 0.2. So the sheen is almost invisible in light mode and clear in dark mode. (Estimate from the formula, not a screenshot.)
8. **The exact button's edge can change source between modes** (`src/tokens.js:303`). It is the key color when the key passes 3:1 on the canvas, else `border.base`. Measured for `#0000ee`: light `action.key`, dark `base.80`. For `#ffd43b`: light `base.20`, dark `action.key`. Not feel-driven.

## Contrast-driven jumps

The contrast solver moves a whole grade when a check starts or stops passing. Each jump is about 1.36:1. These are needed for accessibility, but they show as steps.

**Solidity → fill grade** (`src/tokens.js:219-231`). The fill, hover, active, and both gloss grades move together. Values of solidity where the fill changes, WCAG standard:

| Key | Light mode | Dark mode |
|---|---|---|
| `#0000ee` | none (70) | 30 → 40 at 0.22, 40 → 50 at 0.94 |
| `#ffd43b` | 80 → 70 at 0.02, 70 → 60 at 0.42, 60 → 50 at 0.94 | none (10) |
| `#3ddc97` | 80 → 70 at 0.02, 70 → 60 at 0.38, 60 → 50 at 0.94 | none (20) |
| `#777777`, `#808080` | 80 → 70 at 0.06, 70 → 60 at 0.46, 60 → 50 at 0.94 | 30 → 40 at 0.22, 40 → 50 at 0.98 |
| `#d6336c` | 70 → 60 at 0.18, 60 → 50 at 0.94 | 30 → 40 at 0.18, 40 → 50 at 0.94 |

- The worst one is near full solidity. From solidity 1 to 0.93, the fill opacity goes only from 1 to 0.98, but the fill moves a whole grade. Cause: at full solidity the fill is the grade where the label only just passes. Any see-through makes it fail. Suggestion: start the search from a margin, or blend the fill opacity in before the grade moves.
- With APCA, `#0000ee` dark mode is not monotonic: 10 → 5 at 0.34, then 5 → 10 at 0.62.
- The more-contrast variant has other thresholds. For `#0000ee`: light 90 → 80 at 0.18, 80 → 70 at 0.58; dark 10 → 20 at 0.02, 20 → 30 at 0.58.
- The label flips between 5 and 0 (or 95 and 100) at many of these points. See [Solidity](#solidity).

**Shininess → gloss grades** (`src/tokens.js:241-244`). The label check limits how far the top and bottom grades go. That limit makes the mode asymmetry in [Mode asymmetries](#mode-asymmetries) item 1. It does not move the fill.

**Thickness, depth, softness, spaciousness, roundness, bounciness, snappiness.** No contrast-driven jumps. The contrast tests do not depend on text size.

## Leftovers

**Code.**

- `elevation.inset` is always empty (`src/tokens.js:323`). Components still read it in six places (`components/components.css:90`, `:136`, `:162`, `:189`, `:291`; `demo/index.html:226`). It was the inset shadow of the removed relief. `spec/tokens.md:92` says "empty for now".
- `panel.border` is always the `border.base` grade (`src/tokens.js:194`). `panelBorderWidth` is always `border.width` (`src/tokens.js:145`, `src/export.js:38`, `:258`). These were separate for the removed card-edge effect. They are harmless, but they are duplicates.
- `test/tokens.test.js:121` checks that the canvas stays base.5 for `neumorphic` and `glass`. This guarded against the removed off-white canvas. It now passes for any preset.

**Comments and spec text.**

- `spec/inputs.md:152`: "Panel opacity: `0.3 + 0.7 so`". The code is `0.15 + 0.85 so` (`src/tokens.js:136`). The line does not list fill and tint opacity.
- `spec/inputs.md:151`: "Gloss: a white gradient whose strength is the shininess. Above about 0.6 it has a hard edge at the middle". The white gradient (`effect.gloss`) is smooth. The 0.6 switch is in the ramp gloss (`src/export.js:84`), which is not white and whose strength does not scale with shininess.
- `spec/inputs.md:173`: brutalist has "heavy ink borders". Ink borders at thickness ≥ 0.6 are removed. Borders are now `border.base-strong`.
- `components/README.md:57`: "Heavy borders are ink-colored." Removed.
- `components/README.md:61`: "Solidity | See-through cards with background blur". Solidity also makes fills and tints see-through and moves fill grades.
- `components/README.md:85`: task "Make a neumorphic variant for alerts and badges". This depends on the removed relief.
- `spec/consumers.md:203`: the 0.4.0 changelog mentions "dark neumorphic and glass themes". This is history, so it can stay, but neumorphic is no longer special.
- `spec/tokens.md:100` has a double period ("100..").

**Presets** (`src/inputs.js:20-28`).

- `glass` softness 0.85 was lowered to avoid the neumorphic switch. The switch is gone, so it can go back to its first value.
- `neumorphic` (roundness 0.6, thickness 0, depth 0.7, softness 1) is now close to `material` (0.25, 0, 0.5, 0.8). Without the relief, it is only "deeper, softer material". The spec says so (`spec/inputs.md:174`).
- `brutalist` thickness 0.75 was set to get ink borders. Now it gives 3 px gray borders and the badge squeeze from [Thickness](#thickness).
- `flat` sets softness 0.5 with depth 0. Softness has no effect there. If its value was chosen for a removed effect, it is now arbitrary.
- `glossy` (shininess 1) depends on the 0.6 shape switch.

## Playground only

- The stage glows behind the sample fade in as solidity drops: `opacity: min(1, (1 − so) × 1.5)` (`demo/index.html:208`, set from `demo/demo.js:625`). Full at so ≤ 0.33, gone at 1. Smooth with a kink. It changes the backdrop, so cards look different with no token change. This is fine for a playground, but keep it in mind when you compare screenshots.
- The first glow uses `fill-action` (`demo/index.html:205`). That grade differs between modes and moves with solidity, so the backdrop moves too.
- `FEEL_HINTS.solidity` says "See-through panels with blur" (`demo/demo.js:25`). It does not mention fills and tints.

## Summary

| Feel | Clean | Has steps | Out of domain |
|---|---|---|---|
| Spaciousness | | Yes: rhythm and font px (by design); line heights not monotonic (artifact) | Radius follows control height (by design) |
| Roundness | Yes | | |
| Thickness | | Yes: whole px (by design); fill ring appears at 0.13; `heightSm` bump | Field color at 0.13; badge line height; padding clamps |
| Depth | Yes | | |
| Shininess | | Yes: full gloss at 0.01; reach at 0.34; shape at 0.6 | No, but strongly mode-asymmetric |
| Softness | Mostly | Dark alpha flat for f ≤ 0.49 (kink) | |
| Solidity | | Yes: fill grade jumps, label flips, 0.05 search grid | Solid parts change grade; sheen not faded |
| Bounciness | | | `standard` easing overshoots color transitions |
| Snappiness | Yes | | |

What to address first:

1. **Ramp gloss** (`src/tokens.js:239-246`, `src/export.js:80-87`). Scale its strength with shininess, remove the 0.34 and 0.6 steps, and make light and dark reach the same distance. This is the dark-mode harsh edge.
2. **Fill edge color** (`components/components.css:69`, `:208`, `:254`, `:277`). An edge that is darker than the fill in both modes, or the fill itself, removes the dark-mode ring and the sudden ring at thickness 0.13.
3. **Solidity fill jumps** (`src/tokens.js:219-231`). Especially the one-grade jump between solidity 1 and 0.93, and the solid parts that inherit it.
4. **Thickness → field color** (`src/tokens.js:184`) and the badge line height (`components/components.css:247`).
5. **Spaciousness line heights** (`src/tokens.js:69`). Make the snap monotonic.
6. **Dark shadow and sheen** (`src/tokens.js:324`, `:334`; `components/components.css:99`, `:101`, `:204`). The 1.8 factor with its limit, the half highlight, and the `soft-light` sheen.
7. **Bounciness in `standard`** (`src/tokens.js:108`).
8. **Leftovers**: spec text, `elevation.inset`, `panel.border`, and the preset values above.
