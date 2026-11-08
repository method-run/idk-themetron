// Build the themes: for each theme, primitive tokens from its settings, then semantic tokens for each mode.
import { GRADES, contrastTest, gradeGaps, makePalette, measure } from './palette.js';
import { normalizeInputs, ROLES } from './inputs.js';

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
  // Every theme also ships a "more contrast" variant at the enhanced level, for readers who
  // ask for it. The ramps are the same; only the grades that the tokens pick can change. A
  // theme that is already at the enhanced level has no variant.
  const more = settings.contrast.level === 'enhanced' ? null : buildLevel({ ...settings, contrast: { ...settings.contrast, level: 'enhanced' } }, palettes, true);
  return { name: settings.name, parent: settings.parent, kind: settings.kind, settings, palettes, ...buildLevel(settings, palettes), more };
}

// The tokens of one theme at one contrast setting: { settings, gaps, primitives, modes }.
// `variant` is true for the more-contrast variant.
function buildLevel(settings, palettes, variant = false) {
  const test = contrastTest(settings.contrast);
  const gaps = gradeGaps(Object.values(palettes), test);
  const primitives = buildPrimitives(settings, palettes, gaps);
  const modes = {};
  for (const mode of MODES) modes[mode] = buildMode(mode, settings, palettes, primitives, test, variant);
  return { settings, gaps, primitives, modes };
}

// ---- Primitives: values that do not change with the mode.

// Fixed values for the parts that the removed feels (thickness, depth, softness, solidity,
// bounciness, snappiness) used to set. The tokens stay, so components still work: hairline
// borders, no shadows and no lift, opaque parts with no blur, and calm motion with no overshoot.
const BORDER_WIDTH = 1;
// The grid square, in px, and the body text size, until typography settings set it.
const GRID = 4;
const FONT_SIZE = 15;
const MOTION = {
  duration: { fast: 130, base: 220, slow: 370 },
  easing: { standard: [0.3, 0, 0.45, 1], enter: [0.25, 1, 0.64, 1], exit: [0.4, 0, 1, 1] },
};
// How far hover moves a fill or a tint, in grade numbers. Press moves twice as far. The label
// moves with it, so the pair keeps its contrast.
const STATE_GRADES = 10;
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
const FLAT = { panelAlpha: 1, panelAlphaInverted: 1, fillAlpha: 1, fillAlphaInverted: 1, tintAlpha: 1, tintAlphaInverted: 1, blur: 0, lift: 0 };

export function buildPrimitives(settings, palettes, gaps) {
  const { spaciousness: s, roundness: r, shininess: sh } = settings.feel;

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

  // Text sizes do not change with spaciousness. Typography settings will set them.
  const fontSize = Object.fromEntries(Object.entries({ xs: -2, sm: -1, md: 0, lg: 1, xl: 2, '2xl': 3, '3xl': 4 }).map(([k, step]) => [k, Math.round(FONT_SIZE * 1.2 ** step)]));
  const bodyRatio = round(1.35 + 0.25 * s);
  const tightRatio = round(1.15 + 0.1 * s);
  // A line height for each size: the nearest whole number of squares, and never less than the
  // size. The grid does not change, and the ratios only grow with spaciousness, so line heights
  // never get smaller as spaciousness grows.
  const snap = (size, ratio) => Math.max(Math.ceil(size / GRID), Math.round((size * ratio) / GRID)) * GRID;
  const leading = Object.fromEntries(Object.entries(fontSize).map(([k, v]) => [k, snap(v, bodyRatio)]));
  const leadingTight = Object.fromEntries(Object.entries(fontSize).map(([k, v]) => [k, snap(v, tightRatio)]));

  const borderWidth = BORDER_WIDTH;
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


  return {
    color: Object.fromEntries(Object.entries(palettes).map(([name, p]) => [name, { ...p.steps }])),
    keys: Object.fromEntries(Object.entries(palettes).map(([name, p]) => [name, { hex: p.key, grade: p.keyGrade }])),
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
    motion: MOTION,
    effect: {
      ...FLAT,
    },
    panelBorderWidth: borderWidth,
  };
}

// ---- Semantic tokens: values for one mode, chosen so that pairs pass the contrast setting.

function buildMode(mode, settings, palettes, primitives, test, variant) {
  const dark = mode === 'dark';
  const tokens = {};
  const audit = [];
  const base = palettes.base;
  const set = (name, palette, grade) => {
    tokens[name] = { ref: `${paletteName(palettes, palette)}.${grade}`, value: palette.steps[grade] };
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
  // The shine grades of each state of a background, such as gloss.action-hover-rim for
  // fill.action-hover, within [lo, hi].
  const shine = (glossName, bgName, palette, offsets, lo, hi) => {
    for (const state of STATES) {
      const g = Number(tokens[`${bgName}${state}`].ref.split('.')[1]);
      for (const [part, by] of Object.entries(offsets)) set(`${glossName}${state}-${part}`, palette, Math.min(hi, Math.max(lo, g + by)));
    }
  };
  // The label can come from another palette than the background.
  const states = (bgName, labelName, palette, bg, label, dir, labelPalette = palette) => {
    for (const [i, state] of STATES.entries()) {
      const to = reach(palette, bg, i * STATE_GRADES * dir);
      set(`${bgName}${state}`, palette, i ? to : bg);
      set(`${labelName}${state}`, labelPalette, i ? labelAfter(labelPalette, label, bg, to, palette) : label);
    }
  };
  const check = (fgName, bgName, purpose, required = true) => {
    const fg = tokens[fgName].value;
    const bg = tokens[bgName].value;
    audit.push({ fg: fgName, bg: bgName, purpose, required, ...measure(fg, bg), pass: test(fg, bg, purpose) });
  };

  // The canvas is grade 5 in light mode and 95 in dark mode. Raised surfaces are one grade
  // lighter, and sunken ones one grade darker. If no grade of text can pass on these
  // backgrounds, the canvas moves to white (or black) until one does.
  // [canvas, raised surface, sunken] for each light canvas grade, and the dark mirror of each.
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
  const fgGrade = pick(base, [dark ? 5 : 90, dark ? 0 : 100, ...outward.slice().reverse()], passesAll('text'), bgs);
  set('fg.base', base, fgGrade);
  set('fg.base-muted', base, pick(base, outward, passesAll('text'), bgs));
  set('fg.base-subtle', base, pick(base, outward, passesAll('ui'), bgs));
  set('border.base', base, outward[1]);
  set('panel.border', base, outward[1]);
  set('border.base-strong', base, pick(base, outward, passesAll('ui'), bgs));
  for (const fg of ['fg.base', 'fg.base-muted']) for (const bg of ['bg.canvas', 'bg.surface', 'bg.sunken']) check(fg, bg, 'text');
  check('fg.base-subtle', 'bg.canvas', 'ui');
  check('border.base-strong', 'bg.surface', 'ui');

  // The grade beyond the canvas and the surface, toward the text: base tints sit there, so a
  // quiet button shows on both.
  const beyond = step(dark ? Math.min(layout.canvas, layout.surface) : Math.max(layout.canvas, layout.surface), dark ? -1 : 1);

  // Fills and tints, for each role.
  for (const role of ROLES) {
    const palette = palettes[role];
    const near = nearest(palette.keyGrade);
    // Every fill has the same label polarity, whatever the key color: light labels on darker
    // fills in light mode, and dark labels on lighter fills in dark mode. To flip a part, use
    // tm-invert.
    // TEMPORARY: pure white labels (black in dark mode), on the lightest fill where they pass
    // (the darkest in dark mode). The usual rule is [5, 0], on the fill nearest the key grade.
    const labels = [0].map((g) => (dark ? 100 - g : g));
    const extreme = STOPS.filter((g) => g !== 0 && g !== 100);
    if (dark) extreme.reverse();
    const labelFor = (g) => labels.find((o) => test(palette.steps[o], palette.steps[g], 'text'));

    // A fill whose label passes, and that stands out from the canvas and surface (3:1), so a
    // button's shape shows.
    const behind = [tokens['bg.canvas'].value, tokens['bg.surface'].value];
    const fits = (g) => labelFor(g) !== undefined && behind.every((bg) => test(palette.steps[g], bg, 'ui'));
    // TEMPORARY: the min-contrast grade is the lightest fill where the label passes (the
    // darkest in dark mode). It is kept for the shine. The fill is one grade more contrasty.
    const minContrast = extreme.find(fits) ?? extreme.find((g) => labelFor(g) !== undefined) ?? near[0];
    const contrasty = dark ? -1 : 1;
    const fill = step(minContrast, contrasty);
    const onFill = labelFor(fill) ?? (fill > 50 ? 0 : 100);
    // Hover and active move away from the label color, and the label follows by the same
    // distance, so the contrast stays the same.
    const away = onFill < 50 ? 1 : -1;
    states(`fill.${role}`, `on-fill.${role}`, palette, fill, onFill, away);
    // Shine comes from the ramp itself, not from white, with light from above in both modes:
    // lighter grades at the top (a rim three grades lighter than the fill, then two lighter),
    // and darker ones at the bottom (a shadow two grades darker, then one darker at the edge).
    // Lighter means a lower grade number in both modes. The shine sits above and below the
    // text, so these grades need not pass with the label: the audit shows them, but does not
    // require them.
    // EXPERIMENT (shininess): the shape from docs/shine-notes.md, counted from the fill.
    // Each state has its own shine, counted from its own fill, so the shine follows the fill.
    shine(`gloss.${role}`, `fill.${role}`, palette, SHINE, 5, 95);

    // Action tints are the faintest wash of the color. Base tints are one grade beyond the
    // surfaces, as the base color is already on them. Hover and active move toward the text,
    // and the label follows. The base label is the text color when it passes. On a mid-tone
    // canvas at the enhanced level, no label may pass one grade beyond the surfaces: then the
    // base tint steps back toward the canvas until one does.
    const labelOn = (grades) => (hex) => grades.every((g) => test(hex, palette.steps[g], 'text'));
    const labelGrades = role === 'base' ? [fgGrade, ...near] : near;
    const back = [];
    for (let g = beyond; back.length < 4; g = step(g, dark ? 1 : -1)) { back.push(g); if (g === step(g, dark ? 1 : -1)) break; }
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

    // Rest and hover must pass. Press lasts a moment: where the label has no room left to
    // follow (it is already white or black), the audit warns instead.
    for (const state of STATES) {
      for (const [fg, bg] of [[`on-fill.${role}${state}`, `fill.${role}${state}`], [`on-tint.${role}${state}`, `tint.${role}${state}`]]) {
        check(fg, bg, 'text', state !== '-active');
        if (state === '-active') audit[audit.length - 1].warn = !audit[audit.length - 1].pass;
      }
    }
    check(`on-fill.${role}`, `gloss.${role}-top`, 'text', false);
    check(`on-fill.${role}`, `gloss.${role}-bottom`, 'text', false);
    check(`fill.${role}`, 'bg.canvas', 'ui');
  }

  // Action text and edges, on the base backgrounds.
  const action = palettes.action;
  const near = nearest(action.keyGrade);

  // The quiet button: a solid button with the polarity flipped, all in the base color. In light
  // mode, a light fill with a dark label; dark mode mirrors it. The label is the text color
  // when it passes, so the button stays neutral next to the main action.
  // The fill is the base tint grade, so it shows on the canvas and on surfaces. Hover and
  // press move toward the label, and the label follows. The shine has the same shape as on
  // solid fills, from the base ramp.
  {
    const fill = Number(tokens['tint.base'].ref.split('.')[1]);
    const toward = dark ? -1 : 1;
    const hover = reach(base, fill, STATE_GRADES * toward);
    const candidates = [fgGrade, ...nearest(base.keyGrade)];
    const passesOn = (n, g) => test(base.steps[n], base.steps[g], 'text');
    const label = candidates.find((n) => passesOn(n, fill) && passesOn(labelAfter(base, n, fill, hover), hover))
      ?? pick(base, candidates, (hex) => test(hex, base.steps[fill], 'text'), [base.steps[fill]]);
    states('fill.quiet', 'on-fill.quiet', base, fill, label, toward);
    shine('gloss.quiet', 'fill.quiet', base, SHINE, 5, 95);
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

  // The exact button: the key color itself, with white or black from the action ramp, whichever
  // has more contrast with it. It has the same label polarity as every other fill: in light
  // mode, the darker color of the pair is the fill and the lighter one is the label. So a navy
  // key is a navy fill with a white label, and a yellow key is a yellow label on a black fill.
  // Its edge is the key color, or the base border when the key color does not stand out from
  // the canvas. With pure white and black, the pair is always at least 4.58:1. Where it still
  // fails the contrast setting, the audit warns; the more-contrast variant uses the normal
  // button's colors instead.
  {
    const key = { ref: 'action.key', value: action.key };
    const partnerGrade = measure(action.key, action.steps[0]).wcag >= measure(action.key, action.steps[100]).wcag ? 0 : 100;
    // White and black are the same in every ramp. The partner names the action ramp, so its
    // hover and press stay in the action color too.
    const partner = { ref: `action.${partnerGrade}`, value: action.steps[partnerGrade] };
    const passes = test(partner.value, action.key, 'text');
    const [lighter, darker] = partnerGrade === 0 ? [partner, key] : [key, partner];
    if (variant && !passes) {
      tokens['fill.action-exact'] = { ...tokens['fill.action'] };
      tokens['on-fill.action-exact'] = { ...tokens['on-fill.action'] };
      for (const state of STATES.slice(1)) {
        tokens[`fill.action-exact${state}`] = { ...tokens[`fill.action${state}`] };
        tokens[`on-fill.action-exact${state}`] = { ...tokens[`on-fill.action${state}`] };
      }
      for (const state of STATES) for (const part of Object.keys(SHINE)) tokens[`gloss.action-exact${state}-${part}`] = { ...tokens[`gloss.action${state}-${part}`] };
    } else {
      const fill = dark ? lighter : darker;
      tokens['fill.action-exact'] = fill;
      tokens['on-fill.action-exact'] = dark ? darker : lighter;
      // Hover and press: only the resting button is exact. Like other fills, they move away
      // from the label, darker in light mode and lighter in dark mode, to the nearest grade at
      // least STATE_GRADES (hover) or twice that (press) from the key color's own grade. When
      // the fill is white or black, it cannot move further out, so it moves in by as much. The
      // label follows by the same distance.
      const away = dark ? -1 : 1;
      const label = dark ? darker : lighter;
      const [from, dir] = fill === key ? [action.keyGrade, away] : [partnerGrade, -away];
      const labelGrade = label === key ? action.keyGrade : partnerGrade;
      for (const [i, state] of STATES.entries()) {
        if (!i) continue;
        const to = shift(from, i * STATE_GRADES * dir);
        set(`fill.action-exact${state}`, action, to);
        if (to === from) tokens[`on-fill.action-exact${state}`] = { ...label };
        else set(`on-fill.action-exact${state}`, action, labelAfter(action, labelGrade, from, to));
      }
      // The same shine as solid fills, counted from where each state's fill sits: the key
      // color's own grade at rest, rounded to the nearest grade. It can reach white and black,
      // so a black fill has no shadow below it, and a white fill no highlight above it.
      for (const [i, state] of STATES.entries()) {
        const g = i ? Number(tokens[`fill.action-exact${state}`].ref.split('.')[1]) : from;
        for (const [part, by] of Object.entries(SHINE)) set(`gloss.action-exact${state}-${part}`, action, Math.min(100, Math.max(0, Math.round((g + by) / 5) * 5)));
      }
    }
    tokens['border.action-exact'] = test(action.key, tokens['bg.canvas'].value, 'ui') ? key : { ...tokens['border.base'] };
    // Not required, but a failure is worth a warning: the audit shows it.
    for (const state of STATES) {
      check(`on-fill.action-exact${state}`, `fill.action-exact${state}`, 'text', false);
      audit[audit.length - 1].warn = !audit[audit.length - 1].pass;
    }
  }

  return { tokens, audit, computed: computed(dark, tokens) };
}

// An empty shadow that can still join a list of shadows, which "none" cannot.
const NO_SHADOW = '0 0 #0000';

// Values for one mode that are not one palette color: panels and shadows. With no depth and
// no see-through parts, panels are the surface, and the shadows are empty. A panel names the
// token it copies, so the CSS can point at it.
function computed(dark, tokens) {
  const panel = { alias: 'bg.surface', value: tokens['bg.surface'].value };
  return {
    'bg.panel': panel,
    'bg.panel-normal': panel,
    'bg.panel-inverted': panel,
    'elevation.1': NO_SHADOW,
    'elevation.2': NO_SHADOW,
    'elevation.3': NO_SHADOW,
    'elevation.inset': NO_SHADOW,
  };
}

// ---- Helpers

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

function paletteName(palettes, palette) {
  return Object.keys(palettes).find((k) => palettes[k] === palette);
}

const round = (x, digits = 2) => Math.round(x * 10 ** digits) / 10 ** digits;
