// Build the themes: for each theme, primitive tokens from its settings, then semantic tokens for each mode.
import { GRADES, contrastTest, gradeGaps, makePalette, measure, purposeName } from './palette.js';
import { normalizeInputs, ROLES, GRADIENT_DEFAULTS } from './inputs.js';
import { iconStyle } from './icons.js';
import { mixOklch, parseHex, toHex } from './color.js';

export const MODES = ['light', 'dark'];

// Returns { inputs, order, themes }. `order` lists each parent before its children.
export function buildThemes(rawInputs) {
  const inputs = normalizeInputs(rawInputs);
  const themes = {};
  for (const name of inputs.order) themes[name] = buildTheme(inputs.resolved[name]);
  return { inputs, order: inputs.order, themes };
}

// One theme from its resolved settings. It has one palette for each role: base and action.
export function buildTheme(settings) {
  // Copies, so the two stay apart when both roles have the same hex.
  const { model } = settings.contrast;
  const palettes = Object.fromEntries(ROLES.map((role) => [role, { ...makePalette(settings[role], model) }]));
  // An action gradient has a ramp for each end, beside the solid action ramp. The gradient's
  // tokens take the solid tokens' grades from these ramps. See gradientTokens.
  const stops = settings.gradient && { from: { ...makePalette(settings.gradient.from, model) }, to: { ...makePalette(settings.gradient.to, model) } };
  // Every theme also ships a "more contrast" variant at the enhanced level, for readers who
  // ask for it. The ramps are the same; only the grades that the tokens pick can change. A
  // theme that is already at the enhanced level has no variant.
  const more = settings.contrast.level === 'enhanced' ? null : buildLevel({ ...settings, contrast: { ...settings.contrast, level: 'enhanced' } }, palettes, stops, true);
  return { name: settings.name, parent: settings.parent, kind: settings.kind, settings, palettes, stops, ...buildLevel(settings, palettes, stops), more };
}

// The tokens of one theme at one contrast setting: { settings, gaps, primitives, modes }.
// `variant` is true for the more-contrast variant.
function buildLevel(settings, palettes, stops, variant = false) {
  const test = contrastTest(settings.contrast);
  const gaps = gradeGaps(Object.values(palettes), test);
  const primitives = buildPrimitives(settings, palettes, gaps, stops);
  const modes = {};
  for (const mode of MODES) modes[mode] = buildMode(mode, settings, palettes, primitives, test, variant, stops);
  return { settings, gaps, primitives, modes };
}

// ---- Primitives: values that do not change with the mode.

// Fixed values for the parts that the removed feels (bounciness, snappiness) used to set. The
// tokens stay, so components still work: no blur outside tm-over-media, and calm motion with no
// overshoot.
// The grid square, in px.
const GRID = 4;
const MOTION = {
  duration: { fast: 130, base: 220, slow: 370 },
  easing: { standard: [0.3, 0, 0.45, 1], enter: [0.25, 1, 0.64, 1], exit: [0.4, 0, 1, 1] },
};
// How far hover moves a fill or a tint, in grade numbers. Press moves twice as far. The label
// moves with it, so the pair keeps its contrast.
const STATE_GRADES = 10;
// How far text fades toward its min-contrast grades, from 0 to 1: off for now. See the text
// colors in buildMode.
const TEXT_FADE = 0;
const STATES = ['', '-hover', '-active'];
// The shine's grades, in grade numbers from the fill: a rim and a top lighter than it, and a
// shadow and a bottom darker. Lighter is a lower number in both modes. Tints get half the
// distances, and the components draw them at half the opacity.
const SHINE = { rim: -30, top: -20, shadow: 20, bottom: 10 };
const TINT_SHINE = { rim: -15, top: -10, shadow: 10, bottom: 5 };
// The grades that the rules other than states choose from: 10 apart, and 5 apart near white
// and black. States use every grade in GRADES, 5 apart, so a tint at 5 has neighbors at 15
// and 25.
const STOPS = [0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
const FLAT = { blur: 0, lift: 0 };
// The opacity of each kind of part at clarity 1. Clarity 0 makes every part opaque, and the
// opacity grows evenly between. Page-like parts (cards, fields, tints, quiet buttons) have
// their label on the far side of the page, so the page showing through keeps their contrast:
// they can be very see-through. Solid fills have their label on the page's side, so they stop at
// half, and their labels get a halo of the fill's color as they fade (see components.css). An inverted part (tm-invert) has the other mode's page behind it, so the two
// kinds swap: inverted fills can be see-through, and inverted cards and tints stay nearly opaque.
const CLEAREST = { panel: 0.1, panelInverted: 0.95, fill: 0.5, fillInverted: 0.3, tint: 0.1, tintInverted: 0.95, field: 0.3 };

export function buildPrimitives(settings, palettes, gaps, stops = null) {
  const { spaciousness: s, roundness: r, depth: d, shininess: sh, clarity } = settings.feel;
  // Clarity is how see-through parts are: each opacity goes from 1 at clarity 0 to its CLEAREST
  // at 1.
  const solid = (min) => round(min + (1 - min) * (1 - clarity));
  const v = settings.typeVariance;

  // The grid: an invisible grid of GRID px squares, down and across. Its size never changes.
  // Space steps, line heights, and the heights of parts (with their borders) are whole
  // multiples of it. Spaciousness sets how many squares each step takes, so a compact theme
  // lines up with fewer grid lines, and a spacious one with more.
  const rhythm = GRID;
  // The space unit, in squares: 2 (8 px) at spaciousness 0, to 6 (24 px) at 1. Each space step
  // rounds on its own, so the steps change at different points along the slider. xs is 0.32 of
  // a unit, not a quarter, so that it grows in the middle of the slider, not only at the end.
  const unit = 2 + 4 * s;
  const squares = (x) => Math.max(1, Math.round(x));
  const space = Object.fromEntries(Object.entries({ xs: 0.32, sm: 0.5, md: 1, lg: 1.5, xl: 2, '2xl': 3, '3xl': 4 }).map(([k, x]) => [k, squares(unit * x) * GRID]));

  // Text sizes come from the type variance (a typography setting), not from spaciousness. Small and body text barely
  // move: small text is 13, 12, then 11 px, and body text is 16 px, then 17 px in the top
  // quarter. Larger text grows by a ratio for each step, from 1.125 through 1.2 (the default)
  // to 1.5, so headings spread out as the variance grows.
  const fontSize = typeSizes(v);
  const bodyRatio = round(1.4 + 0.25 * s);
  const tightRatio = round(1.15 + 0.1 * s);
  // A line height for each size: the nearest whole number of squares, and never less than the
  // size. The grid does not change, and the ratios only grow with spaciousness, so line heights
  // never get smaller as spaciousness grows.
  const snap = (size, ratio) => Math.max(Math.ceil(size / GRID), Math.round((size * ratio) / GRID)) * GRID;
  const leading = Object.fromEntries(Object.entries(fontSize).map(([k, v]) => [k, snap(v, bodyRatio)]));
  const leadingTight = Object.fromEntries(Object.entries(fontSize).map(([k, v]) => [k, snap(v, tightRatio)]));

  // Thinness sets the edge width: 4 px at 0, 1 px (a hairline) at the default 0.8, and none at
  // 1. Whole px. Parts that must keep an edge (fields, checks, outline buttons, the focus ring)
  // never go below 1 px in the CSS.
  const borderWidth = Math.round((1 - settings.feel.thinness) * 4);
  // A control is a tight line plus padding and border that add up to whole squares: a bit less
  // than half a space unit down, and about one unit across. The factors are not the space
  // steps' factors, so that the padding and the space steps grow at different points along the
  // slider, not all at once.
  const padY = Math.max(squares(unit * 0.45), Math.ceil(borderWidth / GRID));
  const padX = Math.max(squares(unit * 0.95), Math.ceil(borderWidth / GRID));
  const control = {
    paddingY: padY * GRID - borderWidth,
    paddingX: padX * GRID - borderWidth,
  };
  control.height = leadingTight.md + 2 * padY * GRID;
  // Small and large controls differ from the default by whole pairs of squares, so that a mix
  // of sizes centered in one row still starts and ends on grid lines: about half the padding on
  // each side. A small control is never shorter than its text line and border, so in the most
  // compact themes it is as tall as the default.
  const sizeStep = 2 * squares(padY / 2) * GRID;
  control.heightSm = control.height - sizeStep;
  while (control.heightSm < leadingTight.sm + 2 * borderWidth) control.heightSm += 2 * GRID;
  control.heightLg = control.height + sizeStep;

  // Roundness is a share of the most that each part can round. A control can round to half its
  // height, so at roundness 1 every control size is a pill. Other parts can round as far as
  // their padding, so a corner never cuts into the content: cards (padding lg), alerts and text
  // areas (padding md), and small parts such as checks and code (space xs).
  const radius = {
    sm: round(r * space.xs),
    md: round(r * space.md),
    lg: round(r * space.lg),
    control: round((r * control.height) / 2),
    controlSm: round((r * control.heightSm) / 2),
    controlLg: round((r * control.heightLg) / 2),
    full: 9999,
  };

  const font = {};
  const fonts = { body: settings.font, heading: settings.headingFont, mono: settings.monoFont };
  for (const [role, { family, fallback }] of Object.entries(fonts)) font[role] = [family, ...fallback.split(',').map((x) => x.trim())].filter(Boolean);


  // The gradient's ramps are named after the action role: action-from and action-to.
  const ramps = { ...palettes, ...gradientRamps(stops) };
  return {
    color: Object.fromEntries(Object.entries(ramps).map(([name, p]) => [name, { ...p.steps }])),
    keys: Object.fromEntries(Object.entries(ramps).map(([name, p]) => [name, { hex: p.key, grade: p.keyGrade }])),
    // The direction of the action gradient, in degrees. Every theme has one, so parts can always
    // draw the gradient: without one, its ends are the same color.
    gradientAngle: settings.gradient?.angle ?? GRADIENT_DEFAULTS.angle,
    // Whether the action color is a gradient, so CSS can turn on what only a gradient needs.
    gradient: Boolean(stops),
    gap: gaps,
    font: {
      family: font,
      size: fontSize,
      weight: { regular: 400, medium: 500, bold: 700 },
      lineHeight: { body: bodyRatio, heading: tightRatio, control: 1.25 },
      leading,
      leadingTight,
    },
    rhythm,
    space,
    control,
    radius,
    // The roundness itself, so that a part can round as a share of its own size in CSS.
    roundness: r,
    shininess: sh,
    border: { width: borderWidth, focus: Math.max(2, borderWidth + 1) },
    // Material Symbols, from the theme's icons input. See icons.js.
    icon: iconStyle(settings.icons),
    motion: MOTION,
    effect: {
      ...FLAT,
      // Buttons rise on hover: up to 1 px, with depth. More is distracting.
      lift: round(d * 1, 1),
      // The edges of buttons and cards fade to half over the top tenth of softness (0.9 to 1), for
      // a neumorphic look, where shadows shape the parts. Thinness takes them away altogether.
      edgeAlpha: round(1 - 0.5 * Math.min(1, Math.max(0, (settings.feel.softness - 0.9) / 0.1))),
      // How see-through each kind of part is: from its CLEAREST opacity at clarity 1, to
      // opaque at 0.
      panelAlpha: solid(CLEAREST.panel),
      panelAlphaInverted: solid(CLEAREST.panelInverted),
      fillAlpha: solid(CLEAREST.fill),
      fillAlphaInverted: solid(CLEAREST.fillInverted),
      tintAlpha: solid(CLEAREST.tint),
      tintAlphaInverted: solid(CLEAREST.tintInverted),
      fieldAlpha: solid(CLEAREST.field),
      // The limits themselves, so components can tell how far a part has faded.
      clearest: { ...CLEAREST },
    },
    panelBorderWidth: borderWidth,
  };
}

// ---- Semantic tokens: values for one mode, chosen so that pairs pass the contrast setting.

function buildMode(mode, settings, palettes, primitives, test, variant, stops = null) {
  const dark = mode === 'dark';
  const tokens = {};
  const audit = [];
  const base = palettes.base;
  const ramps = { ...palettes, ...gradientRamps(stops) };
  // The colors that a fill or tint grade of the action role shows: the solid color, and with a
  // gradient, each end and the middle, where the blend's luminance can drift a little.
  const gradientAt = (g) => (stops ? [stops.from.steps[g], stops.to.steps[g], toHex(mixOklch(parseHex(stops.from.steps[g]), parseHex(stops.to.steps[g]), 0.5))] : []);
  // Each token names its grade (ref, for the CSS and DTCG), and keeps it as a number (grade),
  // so the engine never reads a number out of a name.
  const set = (name, palette, grade) => {
    tokens[name] = { ref: `${paletteName(ramps, palette)}.${grade}`, grade, value: palette.steps[grade] };
    return palette.steps[grade];
  };
  // The label of a background that moved from `from` to `to`. It moves by the same distance,
  // which keeps the WCAG 2 contrast. APCA gives less contrast to darker pairs, so the label
  // moves only as far as it still passes, and may stay where it is. Where none passes, it
  // moves the full distance, and the audit shows it.
  const labelAfter = (palette, label, from, to, bgPalette = palette) => {
    const far = follow(label, from, to);
    const back = GRADES.filter((g) => (far < label ? g >= far && g <= label : g <= far && g >= label));
    if (far > label) back.reverse();
    return back.find((g) => test(palette.steps[g], bgPalette.steps[to], 'text')) ?? far;
  };
  // A background moved `by` grade numbers, but not past the last grade where some label can
  // pass. With WCAG 2 that never stops it. With APCA in light mode, body text passes only on
  // the lightest grades, even in black, so a tint can move less.
  const reach = (palette, bg, by) => {
    let to = shift(bg, by);
    while (to !== bg && !GRADES.some((g) => test(palette.steps[g], palette.steps[to], 'text'))) to -= 5 * Math.sign(by);
    return to;
  };
  // A background and its label at rest, on hover, and while pressed. Hover moves the
  // background STATE_GRADES in direction dir, and press twice as far; the label follows.
  // The shine grades of each state of a background, such as gloss.tint-action-hover-rim for
  // tint.action-hover, within [lo, hi].
  // Only the states that something reads: buttons shade through their backdrop, so action fills,
  // quiet, and exact buttons need resting grades only (for the edge line of their labels, and for
  // checks, switches, and other parts). Tints keep every state: a soft button's colored shadow
  // follows its state.
  const shine = (glossName, bgName, palette, offsets, lo, hi, states = STATES) => {
    for (const state of states) {
      const g = tokens[`${bgName}${state}`].grade;
      for (const [part, by] of Object.entries(offsets)) set(`${glossName}${state}-${part}`, palette, Math.min(hi, Math.max(lo, g + by)));
    }
  };
  // The label can come from another palette than the background. `moves` gives the hover and
  // press moves in grade numbers, when they are not STATE_GRADES and twice that toward dir.
  const states = (bgName, labelName, palette, bg, label, dir, labelPalette = palette, moves = [STATE_GRADES * dir, 2 * STATE_GRADES * dir]) => {
    for (const [i, state] of STATES.entries()) {
      const to = i ? reach(palette, bg, moves[i - 1]) : bg;
      set(`${bgName}${state}`, palette, i ? to : bg);
      set(`${labelName}${state}`, labelPalette, i ? labelAfter(labelPalette, label, bg, to, palette) : label);
    }
  };
  const check = (fgName, bgName, purpose, required = true) => {
    const fg = tokens[fgName].value;
    const bg = tokens[bgName].value;
    audit.push({ fg: fgName, bg: bgName, fgValue: fg, bgValue: bg, purpose: purposeName(purpose), required, ...measure(fg, bg), pass: test(fg, bg, purpose) });
  };

  // The canvas is grade 5 in light mode and 95 in dark mode. Raised surfaces are one grade
  // lighter, and sunken ones one grade darker. If no grade of text can pass on these
  // backgrounds, the canvas moves to white (or black) until one does.
  // [canvas, raised surface, sunken] for each light canvas grade, and the dark-mode grades for it.
  const LAYOUTS = {
    5: { light: [5, 0, 10], dark: [95, 90, 100] },
    0: { light: [0, 0, 5], dark: [100, 95, 100] },
  };
  const layouts = [5, 0].map((g) => {
    const [canvas, surface, sunken] = LAYOUTS[g][dark ? 'dark' : 'light'];
    return { canvas, surface, sunken };
  });
  const textFits = (l) => STOPS.some((g) => [l.canvas, l.surface, l.sunken].every((bg) => test(base.steps[g], base.steps[bg], 'text')));
  const layout = layouts.find(textFits) ?? layouts[layouts.length - 1];
  const canvasGrade = layout.canvas;
  const bgs = [set('bg.canvas', base, layout.canvas), set('bg.surface', base, layout.surface), set('bg.sunken', base, layout.sunken)];
  const passesAll = (purpose) => (hex) => bgs.every((bg) => test(hex, bg, purpose));
  set('bg.field', base, layout.surface);

  // From the canvas outward: the first grade that passes.
  const outward = STOPS.filter((g) => (dark ? g < canvasGrade : g > canvasGrade));
  if (dark) outward.reverse();
  // Body text is checked at the body size and weight. With APCA the font table asks more than
  // the body-text minimum at 16 or 17 px, so this is the same as 'text'.
  const body = { size: primitives.font.size.md, weight: primitives.font.weight.regular };
  const fgGrade = pick(base, [dark ? 5 : 90, dark ? 0 : 100, ...outward.slice().reverse()], passesAll(body), bgs);
  const mutedGrade = pick(base, outward, passesAll(body), bgs);
  // Text fading: text can move toward the page, so the page reads as one soft layer. Body text
  // goes to one notch (10 grade numbers) past the min-contrast grade, muted text stays at it, and
  // headings go to the min-contrast grade for their size. Body text does not fade for now
  // (TEXT_FADE is 0). Headings fade with softness, all along its range. Linear, rounded to a
  // grade. fgGrade stays the full text color, for labels.
  const fadeBy = (clearness) => (from, to) => Math.round((from + (to - from) * clearness) / 5) * 5;
  const fade = fadeBy(TEXT_FADE);
  const bodyClear = dark ? Math.max(fgGrade, mutedGrade - 10) : Math.min(fgGrade, mutedGrade + 10);
  set('fg.base', base, fade(fgGrade, bodyClear));
  set('fg.base-muted', base, mutedGrade);
  // Headings fade further, with softness: to the min-contrast grade for their size at softness 1.
  // Each heading is checked at its size, at regular weight. components.css sets headings in bold,
  // which needs less contrast, so this is the safe side for any weight from regular up.
  // With WCAG 2, text of 24 px or more is large. With APCA, the font table gives the minimum, so
  // larger headings can fade further.
  const fadeHeading = fadeBy(settings.feel.softness);
  const fine = GRADES.filter((g) => (dark ? g < canvasGrade : g > canvasGrade));
  if (dark) fine.reverse();
  for (const size of ['lg', '2xl', '3xl']) {
    const purpose = { size: primitives.font.size[size], weight: primitives.font.weight.regular };
    const clear = pick(base, fine, passesAll(purpose), bgs);
    set(`fg.base-heading-${size}`, base, fadeHeading(fgGrade, dark ? Math.max(fgGrade, clear) : Math.min(fgGrade, clear)));
    for (const bg of ['bg.canvas', 'bg.surface', 'bg.sunken']) check(`fg.base-heading-${size}`, bg, purpose);
  }
  set('fg.base-subtle', base, pick(base, outward, passesAll('ui'), bgs));
  set('border.base', base, outward[1]);
  // Card and dialog edges harden below softness 0.5: through the grades from the usual edge to
  // the text grade at softness 0, a brutalist outline. From 0.5 up they are the usual edge
  // (edge-alpha fades them out from 0.9 to 1).
  set('panel.border', base, fadeBy(Math.max(0, 1 - settings.feel.softness / 0.5))(outward[1], fgGrade));
  set('border.base-strong', base, pick(base, outward, passesAll('ui'), bgs));
  for (const fg of ['fg.base', 'fg.base-muted']) for (const bg of ['bg.canvas', 'bg.surface', 'bg.sunken']) check(fg, bg, body);
  check('fg.base-subtle', 'bg.canvas', 'ui');
  check('border.base-strong', 'bg.surface', 'ui');
  // Field edges recede at the top of softness (0.9 to 1), as the neumorphic hollow takes over
  // showing the field: to the lightest grade (5 apart) that still passes the control contrast
  // on every background. Linear, rounded to a grade.
  const sink = Math.min(1, Math.max(0, (settings.feel.softness - 0.9) / 0.1));
  const strong = tokens['border.base-strong'].grade;
  const faint = pick(base, fine, passesAll('ui'), bgs);
  set('border.base-field', base, fadeBy(sink)(strong, dark ? Math.max(strong, faint) : Math.min(strong, faint)));
  for (const bg of ['bg.canvas', 'bg.surface', 'bg.sunken']) check('border.base-field', bg, 'ui');

  // Base tints and quiet buttons sit 10 grade numbers beyond the canvas and the surface,
  // toward the text, so they show on both, and differ from the sunken background too: 15 in
  // light mode (canvas 5, surface 0, sunken 10), and 80 in dark mode.
  const beyond = dark ? Math.min(layout.canvas, layout.surface) - 10 : Math.max(layout.canvas, layout.surface) + 10;

  // Fills and tints. Only the action role has solid fills: the quiet button is the base role's
  // button (see below).
  for (const role of ROLES) {
    const palette = palettes[role];
    const near = nearest(palette.keyGrade);
    if (role === 'action') {
    // Every fill has the same label polarity, whatever the key color: a pure white label on a
    // darker fill in light mode, and pure black on a lighter fill in dark mode. To flip a part,
    // use tm-invert.
    const label = dark ? 100 : 0;
    const extreme = STOPS.filter((g) => g !== 0 && g !== 100);
    if (dark) extreme.reverse();
    // With a gradient, the label passes on both ends and the middle too.
    const labelFor = (g) => ([palette.steps[g], ...gradientAt(g)].every((bg) => test(palette.steps[label], bg, 'text')) ? label : undefined);

    // A fill whose label passes, and that stands out from the canvas and surface (3:1), so a
    // button's shape shows.
    const behind = [tokens['bg.canvas'].value, tokens['bg.surface'].value];
    const fits = (g) => labelFor(g) !== undefined && behind.every((bg) => test(palette.steps[g], bg, 'ui'));
    // The min-contrast grade is the lightest fill where the label passes (the darkest in dark
    // mode). The fill is one grade beyond it, so the shine's highlight, which is lighter than the
    // fill, stays close to passing above the label.
    const minContrast = extreme.find(fits) ?? extreme.find((g) => labelFor(g) !== undefined) ?? near[0];
    const contrasty = dark ? -1 : 1;
    const fill = step(minContrast, contrasty);
    const onFill = labelFor(fill) ?? (fill > 50 ? 0 : 100);
    // Hover is 5 grade numbers lighter, and press 5 darker, in both modes. Lighter is a lower
    // number. The fill is a full step beyond the min-contrast grade, so a fill 5 lighter still
    // passes with its label. The label follows, so the contrast stays the same.
    states(`fill.${role}`, `on-fill.${role}`, palette, fill, onFill, 0, palette, [-5, 5]);
    // Shine comes from the ramp itself, not from white, with light from above in both modes:
    // a rim and a top lighter than the fill, and a shadow and a bottom darker (see SHINE).
    // Lighter means a lower grade number in both modes. The shine sits above and below the
    // text, so these grades need not pass with the label: the audit shows them, but does not
    // require them. Each state has its own shine, counted from its own fill, so the shine
    // follows the fill.
    shine(`gloss.${role}`, `fill.${role}`, palette, SHINE, 5, 95, ['']);
    // Rest and hover must pass. Press lasts a moment: where the label has no room left to
    // follow (it is already white or black), the audit warns instead.
    for (const state of STATES) {
      check(`on-fill.${role}${state}`, `fill.${role}${state}`, 'text', state !== '-active');
      if (state === '-active') audit[audit.length - 1].warn = !audit[audit.length - 1].pass;
    }
    check(`on-fill.${role}`, `gloss.${role}-top`, 'text', false);
    check(`on-fill.${role}`, `gloss.${role}-bottom`, 'text', false);
    check(`fill.${role}`, 'bg.canvas', 'ui');
    }

    // Action tints are the faintest wash of the color. Base tints are 10 grade numbers beyond
    // the surfaces, as the base color is already on them. Hover and active move toward the
    // text, and the label follows. The base label is the text color when it passes. On a
    // mid-tone canvas at the enhanced level, no label may pass there: then the base tint steps
    // back toward the canvas, 5 at a time, until one does.
    const labelOn = (grades) => (hex) => grades.every((g) => test(hex, palette.steps[g], 'text'));
    const labelGrades = role === 'base' ? [fgGrade, ...near] : near;
    const back = [];
    for (let g = beyond; back.length < 4 && g >= 0 && g <= 100; g += dark ? 5 : -5) back.push(g);
    const tint = role === 'base' ? back.find((g) => labelGrades.some((n) => labelOn([g])(palette.steps[n]))) ?? beyond : dark ? 95 : 5;
    // The tint label passes at rest, and still passes after it follows the tint to its hover.
    const toward = dark ? -1 : 1;
    const tintHover = reach(palette, tint, STATE_GRADES * toward);
    const followsToHover = (n) => test(palette.steps[labelAfter(palette, n, tint, tintHover)], palette.steps[tintHover], 'text');
    const onTint = labelGrades.find((n) => test(palette.steps[n], palette.steps[tint], 'text') && followsToHover(n))
      ?? pick(palette, labelGrades, (hex) => test(hex, palette.steps[tint], 'text'), [palette.steps[tint]]);
    states(`tint.${role}`, `on-tint.${role}`, palette, tint, onTint, toward);
    // Tints shine too, more faintly. A tint can be near white or black, so its shine may go to
    // grade 0 or 100.
    shine(`gloss.tint-${role}`, `tint.${role}`, palette, TINT_SHINE, 0, 100);

    for (const state of STATES) {
      check(`on-tint.${role}${state}`, `tint.${role}${state}`, 'text', state !== '-active');
      if (state === '-active') audit[audit.length - 1].warn = !audit[audit.length - 1].pass;
    }
    // Tinted fields (tm-input--soft and --quiet) show their placeholders in the muted text color.
    // Placeholders need the control contrast only. Shown as a warning: not a guaranteed pair.
    check('fg.base-muted', `tint.${role}`, 'ui', false);
    audit[audit.length - 1].warn = !audit[audit.length - 1].pass;
  }

  // Small solid parts in the base color, such as a switch's knob, are the muted text color.
  // Their shine is counted from it, like a fill's.
  {
    const g = tokens['fg.base-muted'].grade;
    for (const [part, by] of Object.entries(SHINE)) set(`gloss.base-muted-${part}`, palettes.base, Math.min(95, Math.max(5, g + by)));
  }

  // Action text and edges, on the base backgrounds.
  const action = palettes.action;
  const near = nearest(action.keyGrade);

  // The quiet button: a solid button with the polarity flipped, all in the base color. In light
  // mode, a light fill with a dark label; dark mode mirrors it. The label is the text color
  // when it passes, so the button stays neutral next to the main action.
  // The fill is the base tint grade, so it shows on the canvas and on surfaces. Like a solid
  // fill, hover is 5 grade numbers lighter and press 5 darker, in both modes, and the label
  // follows. The shine has the same shape as on solid fills, from the base ramp.
  {
    const fill = tokens['tint.base'].grade;
    const toward = dark ? -1 : 1;
    const hover = reach(base, fill, -5);
    const candidates = [fgGrade, ...nearest(base.keyGrade)];
    const passesOn = (n, g) => test(base.steps[n], base.steps[g], 'text');
    const label = candidates.find((n) => passesOn(n, fill) && passesOn(labelAfter(base, n, fill, hover), hover))
      ?? pick(base, candidates, (hex) => test(hex, base.steps[fill], 'text'), [base.steps[fill]]);
    states('fill.quiet', 'on-fill.quiet', base, fill, label, toward, base, [-5, 5]);
    shine('gloss.quiet', 'fill.quiet', base, SHINE, 5, 95, ['']);
    for (const state of STATES) {
      check(`on-fill.quiet${state}`, `fill.quiet${state}`, 'text', state !== '-active');
      if (state === '-active') audit[audit.length - 1].warn = !audit[audit.length - 1].pass;
    }
  }
  set('fg.action', action, pick(action, near, passesAll('text'), bgs));
  set('border.action', action, pick(action, near, passesAll('ui'), bgs));
  tokens['border.focus'] = { ...tokens['border.action'] };
  check('fg.action', 'bg.canvas', 'text');
  check('fg.action', 'bg.surface', 'text');
  check('border.action', 'bg.surface', 'ui');
  gradientTokens();

  // The exact button: the key color itself, with white or black from the action ramp, whichever
  // has more contrast with it. It has the same label polarity as every other fill: in light
  // mode, the darker color of the pair is the fill and the lighter one is the label. So a navy
  // key is a navy fill with a white label, and a yellow key is a yellow label on a black fill.
  // Its edge is the key color. With pure white and black, the pair is always at least 4.58:1. Where it still
  // fails the contrast setting, the audit warns; the more-contrast variant uses the normal
  // button's colors instead.
  {
    // The key color sits between grades: its grade is where it sits on the ramp.
    const key = { ref: 'action.key', grade: action.keyGrade, value: action.key };
    const partnerGrade = measure(action.key, action.steps[0]).wcag >= measure(action.key, action.steps[100]).wcag ? 0 : 100;
    // White and black are the same in every ramp. The partner names the action ramp, so its
    // hover and press stay in the action color too.
    const partner = { ref: `action.${partnerGrade}`, grade: partnerGrade, value: action.steps[partnerGrade] };
    const passes = test(partner.value, action.key, 'text');
    const [lighter, darker] = partnerGrade === 0 ? [partner, key] : [key, partner];
    if (variant && !passes) {
      tokens['fill.action-exact'] = { ...tokens['fill.action'] };
      tokens['on-fill.action-exact'] = { ...tokens['on-fill.action'] };
      for (const state of STATES.slice(1)) {
        tokens[`fill.action-exact${state}`] = { ...tokens[`fill.action${state}`] };
        tokens[`on-fill.action-exact${state}`] = { ...tokens[`on-fill.action${state}`] };
      }
      for (const part of Object.keys(SHINE)) tokens[`gloss.action-exact-${part}`] = { ...tokens[`gloss.action-${part}`] };
      exactGradient(null);
    } else {
      const fill = dark ? lighter : darker;
      tokens['fill.action-exact'] = fill;
      tokens['on-fill.action-exact'] = dark ? darker : lighter;
      // Hover and press: only the resting button is exact. Like other fills, hover is lighter
      // and press darker, in both modes, by at least 5 grade numbers, and the label follows.
      // On the key color, the fill moves to the nearest grade at least 5 lighter or darker than
      // the key's own grade. White cannot get lighter, so on hover a white button keeps its
      // fill and only its label gets lighter. Black cannot get darker, so when pressed a black
      // button keeps its fill and only its label gets darker.
      const label = dark ? darker : lighter;
      const from = fill === key ? action.keyGrade : partnerGrade;
      const labelGrade = label === key ? action.keyGrade : partnerGrade;
      const setState = (state, by) => {
        const to = shift(from, by);
        const stuck = by < 0 ? to >= from : to <= from;
        if (stuck) {
          tokens[`fill.action-exact${state}`] = { ...fill };
          set(`on-fill.action-exact${state}`, action, shift(labelGrade, by));
        } else {
          set(`fill.action-exact${state}`, action, to);
          set(`on-fill.action-exact${state}`, action, labelAfter(action, labelGrade, from, to));
        }
      };
      setState('-hover', -5);
      setState('-active', 5);
      // Shine grades at rest, counted from the key color's own grade, rounded to the nearest
      // grade, for the edge line of the label. They can reach white and black.
      const g = tokens['fill.action-exact'].grade;
      for (const [part, by] of Object.entries(SHINE)) set(`gloss.action-exact-${part}`, action, Math.min(100, Math.max(0, Math.round((g + by) / 5) * 5)));
      exactGradient({ fill, key });
    }
    // The edge is the key color. When the key is the fill, it is paired with the base color
    // farther from it, so it always stands out from the canvas; when the key is the label, the
    // edge matches it.
    tokens['border.action-exact'] = { ...key };
    // Not required, but a failure is worth a warning: the audit shows it.
    for (const state of STATES) {
      check(`on-fill.action-exact${state}`, `fill.action-exact${state}`, 'text', false);
      audit[audit.length - 1].warn = !audit[audit.length - 1].pass;
    }
  }

  // The action gradient: for each fill and tint token of the action role, the same grade from
  // the ramp of each end: fill.action-hover-from and fill.action-hover-to for fill.action-hover.
  // Grades fix luminance, so the label passes on each end as it does on the solid color. The
  // blend between them can drift a little, so its middle is checked too: fills choose their grade
  // with it (see labelFor), and the audit shows the rest. Without a gradient, both ends are the
  // solid token, so parts can always draw the gradient.
  function gradientTokens() {
    const ends = (name) => {
      const g = tokens[name].grade;
      if (stops) {
        set(`${name}-from`, stops.from, g);
        set(`${name}-to`, stops.to, g);
      } else {
        tokens[`${name}-from`] = { ...tokens[name] };
        tokens[`${name}-to`] = { ...tokens[name] };
      }
    };
    for (const kind of ['fill', 'tint']) {
      for (const state of STATES) {
        ends(`${kind}.action${state}`);
        // Labels on tints have ends too, for gradient text. Each pair is at the same grades as
        // the solid pair, so the label passes on the tint's ends as it does on the solid tint.
        if (kind === 'tint') ends(`on-tint.action${state}`);
        if (stops) checkGradient(`on-${kind}.action${state}`, `${kind}.action${state}`, state !== '-active');
      }
    }
    // Action text and edges: links, outline and ghost labels, selected tabs, and their edges.
    // Each end, and the middle, is checked on the page's backgrounds.
    ends('fg.action');
    ends('border.action');
    if (stops) {
      for (const bg of ['bg.canvas', 'bg.surface']) checkGradientOn('fg.action', bg, 'text');
      checkGradientOn('border.action', 'bg.surface', 'ui');
      checkGradientOn('on-tint.action', 'tint.action', 'text');
    }
  }
  // A gradient's ends, and its middle, on one solid background.
  function checkGradientOn(fgName, bgName, purpose) {
    check(`${fgName}-from`, bgName, purpose);
    check(`${fgName}-to`, bgName, purpose);
    const fg = toHex(mixOklch(parseHex(tokens[`${fgName}-from`].value), parseHex(tokens[`${fgName}-to`].value), 0.5));
    const bg = tokens[bgName].value;
    audit.push({ fg: `${fgName} (the gradient's middle)`, bg: bgName, fgValue: fg, bgValue: bg, purpose: purposeName(purpose), required: true, ...measure(fg, bg), pass: test(fg, bg, purpose) });
  }
  // A label on each end of a gradient, and on its middle. A failure that is not required warns.
  function checkGradient(fgName, bgName, required) {
    check(fgName, `${bgName}-from`, 'text', required);
    check(fgName, `${bgName}-to`, 'text', required);
    const fg = tokens[fgName].value;
    const bg = toHex(mixOklch(parseHex(tokens[`${bgName}-from`].value), parseHex(tokens[`${bgName}-to`].value), 0.5));
    audit.push({ fg: fgName, bg: `${bgName} (the gradient's middle)`, fgValue: fg, bgValue: bg, purpose: 'text', required, ...measure(fg, bg), pass: test(fg, bg, 'text') });
    for (const a of audit.slice(-3)) if (!required) a.warn = !a.pass;
  }
  // The exact button's gradient. The key color is its fill in light mode, and its label in dark
  // mode (for a dark key; a light key the other way round). That side gets the gradient: at rest,
  // each end's own color, exactly, and on hover and press each end moves as far as the solid key
  // moved, on its own ramp. The other side is white or black, so its ends are its solid color.
  // So the label has ends too: an inverted button swaps its fill and label, and paints the
  // label's ends as its fill, so it looks like the exact button of the other mode. `exact` is
  // null when the exact button is the normal button (in the more-contrast variant).
  function exactGradient(exact) {
    const keySide = exact && stops ? (exact.fill === exact.key ? 'fill' : 'on-fill') : null;
    for (const state of STATES) {
      for (const side of ['fill', 'on-fill']) {
        const name = `${side}.action-exact${state}`;
        if (side !== keySide) {
          // The normal button's fill has ends of its own; labels are always solid.
          const source = (end) => (!exact && side === 'fill' ? `fill.action${state}-${end}` : name);
          tokens[`${name}-from`] = { ...tokens[source('from')] };
          tokens[`${name}-to`] = { ...tokens[source('to')] };
          continue;
        }
        const by = tokens[name].grade - exact.key.grade;
        for (const end of ['from', 'to']) {
          const ramp = stops[end];
          const key = { ref: `action-${end}.key`, grade: ramp.keyGrade, value: ramp.key };
          const to = by ? shift(ramp.keyGrade, by) : ramp.keyGrade;
          const stuck = by < 0 ? to >= ramp.keyGrade : to <= ramp.keyGrade;
          if (!by || stuck) tokens[`${name}-${end}`] = key;
          else set(`${name}-${end}`, ramp, to);
        }
      }
    }
    if (keySide === 'fill') {
      for (const state of STATES) checkGradient(`on-fill.action-exact${state}`, `fill.action-exact${state}`, false);
    }
  }

  // See-through parts: a label is checked on its part as seen over the canvas and the surface.
  // Not required: the opacities come straight from clarity, and the audit warns where a label
  // falls short. Inverted parts are over the other mode's page, which this mode does not see.
  const e = primitives.effect;
  const seen = (fgName, bgName, alpha) => {
    if (alpha >= 1) return;
    for (const page of ['bg.canvas', 'bg.surface']) {
      const fg = tokens[fgName].value;
      const bg = over(tokens[bgName].value, tokens[page].value, alpha);
      audit.push({ fg: fgName, bg: `${bgName} at ${Math.round(alpha * 100)}% over ${page}`, fgValue: fg, bgValue: bg, purpose: 'text', required: false, ...measure(fg, bg), pass: test(fg, bg, 'text') });
      audit[audit.length - 1].warn = !audit[audit.length - 1].pass;
    }
  };
  for (const state of ['', '-hover']) {
    seen(`on-fill.action${state}`, `fill.action${state}`, e.fillAlpha);
    seen(`on-fill.quiet${state}`, `fill.quiet${state}`, e.tintAlpha);
    // The exact button fades half as far as solid fills (see components.css).
    seen(`on-fill.action-exact${state}`, `fill.action-exact${state}`, 1 - (1 - e.fillAlpha) / 2);
    for (const role of ROLES) seen(`on-tint.${role}${state}`, `tint.${role}${state}`, e.tintAlpha);
  }

  // A see-through part can also sit over a photo, or over a part of any color. So each resting
  // label is also checked as seen over the two extreme backdrops: the base ramp's grades 0 and
  // 100. They are pure white and pure black, because the grades fix luminance. Cards and fields
  // are checked here too: over the page their text is safe, but not over any backdrop. Warnings
  // only, and none for an opaque part.
  const backdrops = [['white', 0], ['black', 100]];
  const overBackdrop = (fgName, bgName, alpha, label = bgName) => {
    if (alpha >= 1) return;
    for (const [word, grade] of backdrops) {
      const fg = tokens[fgName].value;
      const bg = over(tokens[bgName].value, base.steps[grade], alpha);
      audit.push({ fg: fgName, bg: `${label} at ${Math.round(alpha * 100)}% over a ${word} backdrop (base ${grade})`, fgValue: fg, bgValue: bg, purpose: 'text', required: false, backdrop: grade, ...measure(fg, bg), pass: test(fg, bg, 'text') });
      audit[audit.length - 1].warn = !audit[audit.length - 1].pass;
    }
  };
  for (const fg of ['fg.base', 'fg.base-muted']) overBackdrop(fg, 'bg.surface', e.panelAlpha, 'bg.panel');
  overBackdrop('fg.base', 'bg.field', e.fieldAlpha);
  overBackdrop('on-fill.action', 'fill.action', e.fillAlpha);
  overBackdrop('on-fill.quiet', 'fill.quiet', e.tintAlpha);
  overBackdrop('on-fill.action-exact', 'fill.action-exact', 1 - (1 - e.fillAlpha) / 2);
  for (const role of ROLES) overBackdrop(`on-tint.${role}`, `tint.${role}`, e.tintAlpha);

  return { tokens, audit, computed: computed(dark, tokens, settings.feel, palettes.base, e) };
}

// An empty shadow that can still join a list of shadows, which "none" cannot.
const NO_SHADOW = '0 0 #0000';

// Values for one mode that are not one palette color: panels and shadows. A panel is the
// surface, see-through as clarity allows. It names the token it copies, so the CSS can point
// at it, with its opacity.
function computed(dark, tokens, feel, base, effect) {
  const { depth } = feel;
  // Harder shadows are darker and sharper: below softness 0.5 the key shadow grows to fully
  // opaque and its blur shrinks to 0 at softness 0. From softness 0.5 up it is as usual.
  const soft = { blur: 0.4 * 6.25 ** feel.softness, keyAlpha: 0.16 + 0.84 * Math.max(0, 1 - feel.softness / 0.5), keySharp: Math.min(1, feel.softness / 0.5), ambient: feel.softness > 0, light: Math.min(1, Math.max(0, (feel.softness - 0.9) / 0.1)), lightColor: base.steps[dark ? Math.max(0, tokens['bg.canvas'].grade - 15) : 0] };
  const panel = (alpha) => ({ alias: 'bg.surface', alpha, value: alpha < 1 ? withAlpha(tokens['bg.surface'].value, alpha) : tokens['bg.surface'].value });
  return {
    'bg.panel': panel(effect.panelAlpha),
    'bg.panel-normal': panel(effect.panelAlpha),
    'bg.panel-inverted': panel(effect.panelAlphaInverted),
    'elevation.1': elevation(1, depth, dark, base, soft),
    'elevation.2': elevation(2, depth, dark, base, soft),
    'elevation.3': elevation(3, depth, dark, base, soft),
    'elevation.inset': insetShadow(depth, dark, base, soft),
    'elevation.field': fieldShadow(depth, dark, base, soft),
  };
}

// How far each elevation floats at full depth, in px: a resting part, a raised part (hover,
// cards), and an overlay (dialogs, menus).
const ELEVATION = [4, 6, 16];

// A floating shadow in two layers, as usual: a key shadow, cast down and to the right (the light
// is above and to the left, as for the shine), and a wide, faint ambient shadow all round. Depth
// sets how far the part floats: the offset, and a little of the blur. Softness sets how blurry
// the shadows are: soft.blur times the blur, from 0.4 (hard) through 1 (the default) to 2.5
// (pillowy). The color is the base ramp's darkest grade that still shows on the mode's
// backgrounds, so a warm base makes warm shadows. Dark backgrounds hide shadows, so dark mode
// makes them 1.8 times as strong. Harder shadows are darker: below softness 0.5 the key shadow's
// opacity rises from 16%, to fully opaque at softness 0, and its blur shrinks to 0 (a sharp block). At the top of the softness range (0.9 to 1), a light shadow
// fades in on the other side, up and to the left, for the neumorphic look: the page's lighter
// color (white, or a little lighter than the dark canvas), up and to the left, as far as a raised
// part's shadow at least.
function elevation(level, d, dark, base, soft) {
  if (!d) return NO_SHADOW;
  const y = round(d * ELEVATION[level - 1], 1);
  const x = round(y / 2, 1);
  const strength = dark ? 1.8 : 1;
  const color = (alpha) => withAlpha(base.steps[dark ? 100 : 90], Math.min(1, alpha * strength));
  const keyBlur = round((1 + y * 0.6) * soft.blur * soft.keySharp, 1);
  const key = `${x}px ${y}px ${keyBlur}px ${color(soft.keyAlpha)}`;
  // At softness 0 there is no ambient shadow, so the key shadow is one sharp block.
  if (!soft.ambient) return key;
  const ambient = `0 ${round(y / 4, 1)}px ${round((2 + y * 1.5) * soft.blur, 1)}px ${color(0.08)}`;
  if (!soft.light) return `${key}, ${ambient}`;
  // The light shadow has its own offset: at least as far as a raised part's (elevation 2), at
  // every level, so it shows as a lit edge on resting buttons too, not a faint glow.
  const ly = round(Math.max(y, d * ELEVATION[1]), 1);
  const lx = round(ly / 2, 1);
  const light = `${-lx}px ${-ly}px ${round((1 + ly * 0.6) * soft.blur, 1)}px ${withAlpha(soft.lightColor, (dark ? 0.35 : 0.9) * soft.light)}`;
  return `${light}, ${key}, ${ambient}`;
}

// A pressed or sunken part: a faint shadow inside its top edge. It stays faint, as text sits
// over it and is checked against the flat color.
function insetShadow(d, dark, base, soft) {
  if (!d) return NO_SHADOW;
  return `inset 0 ${round(Math.max(1, d * 2), 1)}px ${round((1 + d * 3) * soft.blur, 1)}px ${withAlpha(base.steps[dark ? 100 : 90], dark ? 0.3 : 0.12)}`;
}

// A field: the inset shadow, and at the top of softness (0.9 to 1) the neumorphic hollow. The
// dark shadow moves to the top and left edges, and a light one fades in inside the bottom and
// right edges, the far wall that catches the light. Same light color as the light shadow.
// Below softness 0.5 the dark shadow grows harder, like the key shadow: fully opaque with no
// blur at softness 0, a sharp band inside the top edge. From softness 0.9 to 1 both shadows grow
// to twice as strong, so the hollow reads without a border, and shrink by half their blur (a
// negative spread), so each stays on its own side and does not ring the whole field.
function fieldShadow(d, dark, base, soft) {
  if (!d) return NO_SHADOW;
  const y = round(Math.max(1, d * 2), 1);
  const x = round((y / 2) * soft.light, 1);
  const blur = round((1 + d * 3) * soft.blur, 1);
  const alpha = (dark ? 0.3 : 0.12) * (1 + soft.light);
  const spread = soft.light ? ` ${-round((blur / 2) * soft.light, 1)}px` : '';
  const dim = `inset ${x}px ${y}px ${round(blur * soft.keySharp, 1)}px${spread} ${withAlpha(base.steps[dark ? 100 : 90], alpha + (1 - alpha) * (1 - soft.keySharp))}`;
  if (!soft.light) return dim;
  // The light shadow moves further, up to its blur: past the negative spread, so the far wall's
  // edge sits half a blur inside the field and shows as a clear band.
  const ly = round(y + (blur - y) * soft.light, 1);
  return `${dim}, inset ${-round(ly / 2, 1)}px ${-ly}px ${blur}px${spread} ${withAlpha(soft.lightColor, Math.min(1, (dark ? 0.35 : 0.9) * 2 * soft.light))}`;
}

// A color with an opacity, as seen over a background: the browser blends them in sRGB.
function over(fg, bg, alpha) {
  const [a, b] = [fg, bg].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  return `#${a.map((v, i) => Math.round(alpha * v + (1 - alpha) * b[i]).toString(16).padStart(2, '0')).join('')}`;
}

// A hex color with an opacity, as #rrggbbaa.
function withAlpha(hex, alpha) {
  return `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
}

// ---- Helpers

// Text sizes for a type variance from 0 to 1. Every size above body text only grows with it.
function typeSizes(v) {
  const sm = Math.round(13 - 2 * v);
  const md = Math.round(16 + 2 * Math.max(0, v - 0.5));
  // The heading ratio: 1.125 at 0, 1.2 at 0.5, and 1.5 at 1, even in log steps between.
  const [from, to, t] = v <= 0.5 ? [1.125, 1.2, v / 0.5] : [1.2, 1.5, (v - 0.5) / 0.5];
  const ratio = from * (to / from) ** t;
  const up = (n) => Math.round(md * ratio ** n);
  return { xs: Math.max(11, sm - 1), sm, md, lg: up(1), xl: up(2), '2xl': up(3), '3xl': up(4) };
}

// Stop grades, nearest to a grade first.
function nearest(grade) {
  return [...STOPS].filter((g) => g !== 0 && g !== 100).sort((a, b) => Math.abs(a - grade) - Math.abs(b - grade) || b - a);
}

// The first grade whose color passes ok. If none passes, the grade with the
// most contrast against the backgrounds, and the audit shows the failure.
function pick(palette, grades, ok, bgs) {
  const found = grades.find((g) => ok(palette.steps[g]));
  if (found !== undefined) return found;
  const worst = (g) => Math.min(...bgs.map((bg) => measure(palette.steps[g], bg).wcag));
  return STOPS.reduce((best, g) => (worst(g) > worst(best) ? g : best));
}

// The nearest grade at least `by` grade numbers from `grade` (by < 0 is lighter), from 5 to
// 95. Where the ramp has no grade that far, the last one in that direction.
function shift(grade, by) {
  const inner = GRADES.slice(1, -1);
  const found = by > 0 ? inner.find((g) => g >= grade + by) : inner.findLast((g) => g <= grade + by);
  return found ?? (by > 0 ? inner.at(-1) : inner[0]);
}

// The label of a background that moved from `from` to `to`: moved by the same distance, so the
// pair keeps its contrast. A label between two grades, such as a key color, goes to the grade
// past that point, away from the background. Labels can reach white and black.
function follow(label, from, to) {
  const target = label + (to - from);
  return label < to ? GRADES.findLast((g) => g <= target) ?? 0 : GRADES.find((g) => g >= target) ?? 100;
}

function step(grade, by) {
  const i = STOPS.indexOf(grade) + by;
  return STOPS[Math.min(STOPS.length - 2, Math.max(1, i))];
}

// The gradient's ramps, by the names that their tokens use.
function gradientRamps(stops) {
  return stops ? { 'action-from': stops.from, 'action-to': stops.to } : {};
}

function paletteName(palettes, palette) {
  return Object.keys(palettes).find((k) => palettes[k] === palette);
}

const round = (x, digits = 2) => Math.round(x * 10 ** digits) / 10 ** digits;
