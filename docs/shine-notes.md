---
id: shine-notes
title: Shine notes
summary: Hand-tuned shine gradients for light and dark mode at maximum shine, and a shared version for both, with where the label does not pass.
parent: inputs
kind: reference
order: 2.6
code: [src/export.js, src/tokens.js]
tags: [system/inputs/shine-notes]
aliases: [Shine notes]
---
# Shine notes

Hand-tuned shine gradients for a solid button at maximum shine, and a shared version for both modes. These are notes for the shininess redo. They are not in the code yet.

In both modes, the button has these colors:

- Fill (`background-color`): `var(--tm-action-50)`. This is the min-contrast grade: the lightest grade where a white label passes in light mode, and the darkest grade where a black label passes in dark mode.
- Border: `var(--tm-action-50)`, the same as the fill.
- Label: white in light mode, black in dark mode.

## Light mode, as tuned

```css
background-image: linear-gradient(180deg in oklch, var(--tm-action-20) 0%, var(--tm-action-20) 0%, var(--tm-action-40) 5%, transparent 30%, transparent 60%, var(--tm-action-80) 70%, var(--tm-action-60) 100%);
background-color: var(--tm-action-50);
```

## Dark mode, as tuned

```css
background-image: linear-gradient(180deg in oklch, var(--tm-action-10) 0%, var(--tm-action-20) 2%, var(--tm-action-30) 2%, transparent 50%, transparent 70%, var(--tm-action-60) 90%, transparent 100%);
background-color: var(--tm-action-50);
```

## What the two have in common

Both use light from above. The top is lighter than the fill, and the bottom is darker, in both modes. So the shine follows lightness, not contrast. In light mode, the top moves toward the label, and the bottom moves away from it. In dark mode, it is the opposite.

| Part | Light mode | Dark mode | Shared version |
|---|---|---|---|
| Top rim | 20 at 0%, then 40 at 5% | 10 at 0%, 20 at 2%, then a hard step to 30 | 20 at 0%, 30 at 3% |
| Highlight fades out by | 30% | 50% | 40% |
| Plain fill (50) | 30% to 60% | 50% to 70% | 40% to 65% |
| Darkest shadow | 80 at 70% | 60 at 90% | 70 at 80% |
| Bottom edge | 60 at 100% | the fill at 100% | 60 at half opacity, at 100% |

## Shared version

```css
background-image: linear-gradient(180deg in oklch, var(--tm-action-20) 0%, var(--tm-action-30) 3%, transparent 40%, transparent 65%, var(--tm-action-70) 80%, color-mix(in oklch, var(--tm-action-60) 50%, transparent) 100%);
background-color: var(--tm-action-50);
border-color: var(--tm-action-50);
```

Each stop is the average of the two modes, rounded to a grade that exists. The grades are in steps of 10 here, so 70 is the midpoint between 80 and 60, and 30 is between 40 and 20.

## Where the label does not pass

The fill is the min-contrast grade, so any grade on the label's side of 50 fails under the label. In light mode, grades below 50 fail under white text. In dark mode, grades above 50 fail under black text.

- Light mode: the highlight (20 to 40) fails under white text, until it fades out.
- Dark mode: the shadow (60 and 70) fails under black text, from where it fades in.

At the default size, a button is 36 px high, and its 20 px text line is in the middle: from 22% to 78% of the height. The letters themselves fill about 32% to 68%. In the shared version, only the plain fill is in that band from 40% to 65%. The highlight is fading out above 40%, and the shadow fades in below 65%. These are the small slivers where the grade is not quite right. They are faint, because the gradient is almost transparent there. Small buttons (28 px, 16 px line) have the same band, from 21% to 79%.

To keep the label always passing, the gradient must be fully transparent across the text band: by about 30% at the top, and until about 70% at the bottom.
