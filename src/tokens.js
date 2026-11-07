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
    border: { width: borderWidth, focus: Math.max(2, borderWidth + 1) },
    motion: MOTION,
    effect: {
      ...FLAT,
      // A gloss overlay. High shininess makes a hard edge at the middle, like glass.
      gloss: sh === 0 ? 'none' : `linear-gradient(180deg, rgba(255,255,255,${round(0.55 * sh)}) 0%, rgba(255,255,255,${round(0.12 * sh)}) 50%, rgba(255,255,255,0) ${round(50 + (1 - sh) * 50)}%, rgba(0,0,0,${round(0.1 * sh)}) 100%)`,
      highlight: round(0.6 * sh),
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
  const textFits = (l) => GRADES.some((g) => [l.canvas, l.surface, l.sunken].every((bg) => test(base.steps[g], base.steps[bg], 'text')));
  const layout = layouts.find(textFits) ?? layouts[layouts.length - 1];
  const canvasGrade = layout.canvas;
  const bgs = [set('bg.canvas', base, layout.canvas), set('bg.surface', base, layout.surface), set('bg.sunken', base, layout.sunken)];
  const passesAll = (purpose) => (hex) => bgs.every((bg) => test(hex, bg, purpose));
  set('bg.field', base, layout.surface);

  // From the canvas outward: the first grade that passes.
  const outward = GRADES.filter((g) => (dark ? g < canvasGrade : g > canvasGrade));
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
    const extreme = GRADES.filter((g) => g !== 0 && g !== 100);
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
    set(`fill.${role}`, palette, fill);
    set(`on-fill.${role}`, palette, onFill);
    // Hover and active move away from the label color, so contrast only gets better.
    const away = onFill < 50 ? 1 : -1;
    set(`fill.${role}-hover`, palette, step(fill, away));
    set(`fill.${role}-active`, palette, step(fill, 2 * away));
    // Shine comes from the ramp itself, not from white: a lighter grade at the top and a
    // darker one at the bottom, only as far as the label still passes. So dark fills stay
    // rich, and light fills get a paler top, as their lighter grades have less chroma.
    // TEMPORARY: in both modes, a shine of the min-contrast grade at the top, and a shadow two
    // grades more contrasty than the fill at the bottom.
    const top = minContrast;
    const bottom = step(fill, 2 * contrasty);
    set(`gloss.${role}-top`, palette, top);
    set(`gloss.${role}-bottom`, palette, bottom);

    // Action tints are the faintest wash of the color. Base tints are one grade beyond the
    // surfaces, as the base color is already on them. The hover tint is one grade further.
    // When no label passes on it, as with APCA at the enhanced level in light mode, the hover
    // tint is the tint itself. The base label is the text color when it passes. On a mid-tone
    // canvas at the enhanced level, no label may pass one grade beyond the surfaces: then the
    // base tint steps back toward the canvas until one does.
    const labelOn = (grades) => (hex) => grades.every((g) => test(hex, palette.steps[g], 'text'));
    const labelGrades = role === 'base' ? [fgGrade, ...near] : near;
    const back = [];
    for (let g = beyond; back.length < 4; g = step(g, dark ? 1 : -1)) { back.push(g); if (g === step(g, dark ? 1 : -1)) break; }
    const tint = role === 'base' ? back.find((g) => labelGrades.some((n) => labelOn([g])(palette.steps[n]))) ?? beyond : dark ? 95 : 5;
    const hover = [step(tint, dark ? -1 : 1), tint].find((g) => labelGrades.some((n) => labelOn([tint, g])(palette.steps[n])));
    const tints = [set(`tint.${role}`, palette, tint), set(`tint.${role}-hover`, palette, hover ?? tint)];
    set(`on-tint.${role}`, palette, pick(palette, labelGrades, (hex) => tints.every((bg) => test(hex, bg, 'text')), tints));

    check(`on-fill.${role}`, `fill.${role}`, 'text');
    check(`on-fill.${role}`, `fill.${role}-hover`, 'text');
    check(`on-fill.${role}`, `gloss.${role}-top`, 'text');
    check(`on-fill.${role}`, `gloss.${role}-bottom`, 'text');
    check(`on-tint.${role}`, `tint.${role}`, 'text');
    check(`on-tint.${role}`, `tint.${role}-hover`, 'text');
    check(`fill.${role}`, 'bg.canvas', 'ui');
  }

  // Action text and edges, on the base backgrounds.
  const action = palettes.action;
  const near = nearest(action.keyGrade);
  set('fg.action', action, pick(action, near, passesAll('text'), bgs));
  set('border.action', action, pick(action, near, passesAll('ui'), bgs));
  tokens['border.focus'] = { ...tokens['border.action'] };
  check('fg.action', 'bg.canvas', 'text');
  check('fg.action', 'bg.surface', 'text');
  check('border.action', 'bg.surface', 'ui');

  // The exact button: the key color itself, with the lightest or darkest base color, whichever
  // has more contrast with it. It has the same label polarity as every other fill: in light
  // mode, the darker color of the pair is the fill and the lighter one is the label. So a navy
  // key is a navy fill with a white label, and a yellow key is a yellow label on a black fill.
  // Its edge is the key color, or the base border when the key color does not stand out from
  // the canvas. With pure white and black, the pair is always at least 4.58:1. Where it still
  // fails the contrast setting, the audit warns; the more-contrast variant uses the normal
  // button's colors instead.
  {
    const key = { ref: 'action.key', value: action.key };
    const partnerGrade = measure(action.key, base.steps[0]).wcag >= measure(action.key, base.steps[100]).wcag ? 0 : 100;
    const partner = { ref: `base.${partnerGrade}`, value: base.steps[partnerGrade] };
    const passes = test(partner.value, action.key, 'text');
    const [lighter, darker] = partnerGrade === 0 ? [partner, key] : [key, partner];
    if (variant && !passes) {
      tokens['fill.action-exact'] = { ...tokens['fill.action'] };
      tokens['on-fill.action-exact'] = { ...tokens['on-fill.action'] };
    } else {
      tokens['fill.action-exact'] = dark ? lighter : darker;
      tokens['on-fill.action-exact'] = dark ? darker : lighter;
    }
    tokens['border.action-exact'] = test(action.key, tokens['bg.canvas'].value, 'ui') ? key : { ...tokens['border.base'] };
    check('on-fill.action-exact', 'fill.action-exact', 'text', false);
    // Not required, but a failure is worth a warning: the audit shows it.
    audit[audit.length - 1].warn = !audit[audit.length - 1].pass;
  }

  return { tokens, audit, computed: computed(dark, tokens, primitives) };
}

// An empty shadow that can still join a list of shadows, which "none" cannot.
const NO_SHADOW = '0 0 #0000';

// Values for one mode that are not one palette color: panels and shadows. With no depth and
// no see-through parts, panels are the surface, and the shadows are empty.
function computed(dark, tokens, primitives) {
  const e = primitives.effect;
  const panel = tokens['bg.surface'].value;
  return {
    'bg.panel': panel,
    'bg.panel-normal': panel,
    'bg.panel-inverted': panel,
    'elevation.1': NO_SHADOW,
    'elevation.2': NO_SHADOW,
    'elevation.3': NO_SHADOW,
    'elevation.inset': NO_SHADOW,
    highlight: e.highlight ? `inset 0 1px 0 rgba(255,255,255,${dark ? round(e.highlight * 0.5) : e.highlight})` : NO_SHADOW,
  };
}

// ---- Helpers

// Stop grades, nearest to a grade first.
function nearest(grade) {
  return [...GRADES].filter((g) => g !== 0 && g !== 100).sort((a, b) => Math.abs(a - grade) - Math.abs(b - grade) || b - a);
}

// The first grade whose color passes ok. If none passes, the grade with the
// most contrast against the backgrounds, and the audit shows the failure.
function pick(palette, grades, ok, bgs) {
  const found = grades.find((g) => ok(palette.steps[g]));
  if (found !== undefined) return found;
  const worst = (g) => Math.min(...bgs.map((bg) => measure(palette.steps[g], bg).wcag));
  return GRADES.reduce((best, g) => (worst(g) > worst(best) ? g : best));
}

function step(grade, by) {
  const i = GRADES.indexOf(grade) + by;
  return GRADES[Math.min(GRADES.length - 2, Math.max(1, i))];
}

function paletteName(palettes, palette) {
  return Object.keys(palettes).find((k) => palettes[k] === palette);
}

const round = (x, digits = 2) => Math.round(x * 10 ** digits) / 10 ** digits;
