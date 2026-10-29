// Build the themes: for each theme, primitive tokens from its settings, then semantic tokens for each mode.
import { parseHex, toHex, mixOklch } from './color.js';
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
  const e = primitives.effect;
  e.fillAlphaInverted = seeThrough(e.fillAlphaInverted, modes, test, 'fill', true);
  e.tintAlpha = seeThrough(e.panelAlpha, modes, test, 'tint', false);
  e.tintAlphaInverted = seeThrough(e.panelAlpha, modes, test, 'tint', true);
  e.fillAlpha = seeThrough(e.fillAlpha, modes, test, 'fill', false);
  // Cards: an inverted card is this mode's surface over the other mode's page, such as a light
  // card on a dark page. At low solidity the page would show through and darken it, and its dark
  // text would fail. So inverted cards get their own opacity, raised until text passes.
  e.panelAlphaInverted = panelSeeThrough(e.panelAlpha, modes, test);
  for (const { tokens, computed } of Object.values(modes)) {
    computed['bg.panel-normal'] = computed['bg.panel'];
    computed['bg.panel-inverted'] = rgba(tokens['bg.surface'].value, e.panelAlphaInverted);
  }
  return { settings, gaps, primitives, modes };
}

// ---- Primitives: values that do not change with the mode.

export function buildPrimitives(settings, palettes, gaps) {
  const { spaciousness: s, roundness: r, thickness: t, depth: d, softness: f, shininess: sh, solidity: so, bounciness: b, snappiness: n } = settings.feel;

  // Vertical rhythm: an invisible grid, `rhythm` px apart. Space steps, line heights, and
  // the heights of parts (with their borders) are whole multiples of it.
  const rhythm = Math.round(2 + 4 * s);
  const unit = 4 * rhythm;
  const space = scale(unit, { xs: 0.25, sm: 0.5, md: 1, lg: 1.5, xl: 2, '2xl': 3, '3xl': 4 });

  const base = Math.round(14 + 2.5 * s);
  const fontSize = Object.fromEntries(Object.entries({ xs: -2, sm: -1, md: 0, lg: 1, xl: 2, '2xl': 3, '3xl': 4 }).map(([k, step]) => [k, Math.round(base * 1.2 ** step)]));
  const bodyRatio = round(1.35 + 0.25 * s);
  const tightRatio = round(1.15 + 0.1 * s);
  // A line height for each size: the nearest multiple of the rhythm, and never less than the size.
  // themetron-3 did this for its text. Here every part uses it.
  const snap = (size, ratio) => Math.max(Math.ceil(size / rhythm) * rhythm, Math.round((size * ratio) / rhythm) * rhythm);
  const leading = Object.fromEntries(Object.entries(fontSize).map(([k, v]) => [k, snap(v, bodyRatio)]));
  const leadingTight = Object.fromEntries(Object.entries(fontSize).map(([k, v]) => [k, snap(v, tightRatio)]));

  const borderWidth = Math.round(t * 4);
  // A control is a tight line plus padding and border that add up to whole rhythm steps.
  let steps = 2;
  while (steps * rhythm < borderWidth) steps++;
  // Across, too: padding and border add up to whole steps, so left edges stay on the grid.
  let stepsX = Math.max(1, Math.round((unit * 0.9) / rhythm));
  while (stepsX * rhythm < borderWidth) stepsX++;
  const control = {
    paddingY: steps * rhythm - borderWidth,
    paddingX: stepsX * rhythm - borderWidth,
  };
  control.height = leadingTight.md + 2 * steps * rhythm;
  // Small and large controls differ from the default by whole pairs of steps, so that a mix
  // of sizes centered in one row still starts and ends on grid lines.
  control.heightSm = control.height - 2 * rhythm;
  while (control.heightSm < leadingTight.sm + 2 * borderWidth) control.heightSm += 2 * rhythm;
  control.heightLg = control.height + 2 * rhythm;
  while (control.heightLg < leadingTight.lg + 4 * rhythm) control.heightLg += 2 * rhythm;

  const radius = {
    sm: round(r * 6),
    md: round(r * 12),
    lg: round(r * 24),
    control: round(r * control.height / 2),
    full: 9999,
  };

  const font = {};
  const fonts = { body: settings.font, heading: settings.headingFont, mono: settings.monoFont };
  for (const [role, { family, fallback }] of Object.entries(fonts)) font[role] = [family, ...fallback.split(',').map((x) => x.trim())].filter(Boolean);

  const duration = Math.round(420 - 340 * n);
  const motion = {
    duration: { fast: Math.round(duration * 0.6), base: duration, slow: Math.round(duration * 1.7) },
    easing: {
      standard: [round(0.5 - 0.3 * n), 0, round(0.6 - 0.3 * b), round(1 + 0.6 * b)],
      enter: [round(0.34 - 0.14 * n), round(1 + 0.9 * b), 0.64, 1],
      exit: [0.4, 0, 1, 1],
    },
  };

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
    border: { width: borderWidth, focus: Math.max(2, borderWidth + 1) },
    motion,
    effect: {
      // A gloss overlay. High shininess makes a hard edge at the middle, like glass.
      gloss: sh === 0 ? 'none' : `linear-gradient(180deg, rgba(255,255,255,${round(0.55 * sh)}) 0%, rgba(255,255,255,${round(0.12 * sh)}) 50%, rgba(255,255,255,0) ${round(50 + (1 - sh) * 50)}%, rgba(0,0,0,${round(0.1 * sh)}) 100%)`,
      highlight: round(0.6 * sh),
      panelAlpha: round(0.15 + 0.85 * so),
      // See-through button fills for low solidity, from 75% (clear) to 100% (solid). The engine
      // picks fills that pass at this opacity, and seeThrough() raises it if a label still fails.
      fillAlpha: round(0.75 + 0.25 * so),
      // Inverted fills can be far more see-through: from 5% (clear).
      fillAlphaInverted: round(0.05 + 0.95 * so),
      blur: Math.round((1 - so) * 20),
      lift: round(d * 2),
      relief: relief(settings.feel),
    },
    // Neumorphic parts get a hairline, so their edge does not rest on a highlight alone.
    panelBorderWidth: relief(settings.feel) > 0.35 ? Math.max(1, borderWidth) : borderWidth,
  };
}

// How much the theme looks pressed from one material (neumorphic). 0 to 1.
function relief({ softness, depth }) {
  return round(Math.max(0, Math.min(1, (softness - 0.6) / 0.4)) * depth);
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
  // A base grade mixed in OKLCH toward the action grade of the same number. Both have the same
  // lightness, so the mix keeps it, with the action hue and less chroma.
  const setMix = (name, grade, amount) => {
    const value = toHex(mixOklch(parseHex(base.steps[grade]), parseHex(palettes.action.steps[grade]), amount));
    tokens[name] = { ref: `base.${grade}`, mix: { ref: `action.${grade}`, amount }, value };
    return value;
  };
  const check = (fgName, bgName, purpose, required = true) => {
    const fg = tokens[fgName].value;
    const bg = tokens[bgName].value;
    audit.push({ fg: fgName, bg: bgName, purpose, required, ...measure(fg, bg), pass: test(fg, bg, purpose) });
  };

  // The canvas is grade 5 in light mode and 95 in dark mode. Raised surfaces are one grade
  // lighter, and sunken ones one grade darker. A neumorphic theme (high softness with depth)
  // puts its parts on the canvas itself, with a light shadow and a dark shadow. The light shadow
  // cannot show on white, so a neumorphic canvas is a little off white: grade 10 (and 90 in dark
  // mode), mixed in OKLCH a third of the way from the base ramp to the action ramp, a faint
  // wash of the key color. The two grades have the same lightness, so text passes on the mix
  // as on the base ramp. If no grade of text can pass on
  // these backgrounds, the canvas moves toward white or black until one does.
  const neumorphic = primitives.effect.relief > 0.35;
  const WASH = 0.35;
  const ground = (name, grade) => (neumorphic ? setMix(name, grade, WASH) : set(name, base, grade));
  const groundHex = (grade) => (neumorphic ? toHex(mixOklch(parseHex(base.steps[grade]), parseHex(palettes.action.steps[grade]), WASH)) : base.steps[grade]);
  // [canvas, raised surface, sunken] for each light canvas grade, and the dark mirror of each.
  const LAYOUTS = {
    10: { light: [10, 5, 20], dark: [90, 80, 95] },
    5: { light: [5, 0, 10], dark: [95, 90, 100] },
    0: { light: [0, 0, 5], dark: [100, 95, 100] },
  };
  const layouts = (neumorphic ? [10, 5, 0] : [5, 0]).map((g) => {
    const [canvas, surface, sunken] = LAYOUTS[g][dark ? 'dark' : 'light'];
    return { canvas, surface: neumorphic ? canvas : surface, sunken };
  });
  const textFits = (l) => GRADES.some((g) => [l.canvas, l.surface, l.sunken].every((bg) => test(base.steps[g], groundHex(bg), 'text')));
  const layout = layouts.find(textFits) ?? layouts[layouts.length - 1];
  const canvasGrade = layout.canvas;
  const bgs = [ground('bg.canvas', layout.canvas), ground('bg.surface', layout.surface), ground('bg.sunken', layout.sunken)];
  const passesAll = (purpose) => (hex) => bgs.every((bg) => test(hex, bg, purpose));
  // Fields without a border are sunken, so that they still look like fields.
  ground('bg.field', primitives.border.width ? layout.surface : layout.sunken);

  // From the canvas outward: the first grade that passes.
  const outward = GRADES.filter((g) => (dark ? g < canvasGrade : g > canvasGrade));
  if (dark) outward.reverse();
  const fgGrade = pick(base, [dark ? 5 : 90, dark ? 0 : 100, ...outward.slice().reverse()], passesAll('text'), bgs);
  set('fg.base', base, fgGrade);
  set('fg.base-muted', base, pick(base, outward, passesAll('text'), bgs));
  set('fg.base-subtle', base, pick(base, outward, passesAll('ui'), bgs));
  // Heavy borders use the text color, so that they read as lines drawn in ink.
  set('border.base', base, settings.feel.thickness >= 0.6 ? fgGrade : outward[1]);
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
    // tm-invert. A tinted label if it passes.
    // As solidity drops, labels take on the action color, like the shadows and card edges: they
    // prefer more colored grades (10, then 20, in light mode), where those pass. Base labels
    // move to the action ramp at the same grade, which has the same lightness, so their
    // contrast does not change.
    const keyed = 1 - settings.feel.solidity;
    const ink = role === 'base' && keyed >= 0.4 ? palettes.action : palette;
    const colored = keyed >= 0.75 ? [20, 10] : keyed >= 0.4 ? [10] : [];
    const labels = [...colored, 5, 0].map((g) => (dark ? 100 - g : g));
    const onFillFor = (g) => labels.find((o) => test(ink.steps[o], palette.steps[g], 'text'));

    // Low solidity makes fills see-through, at the opacity that the solidity sets. A see-through
    // fill is paler (or darker) where the canvas and surface show through it. So the label must
    // pass on the fill as it is seen, not only on the fill itself.
    const canvas = tokens['bg.canvas'].value;
    const behind = [canvas, tokens['bg.surface'].value];
    const alpha = primitives.effect.fillAlpha;
    const seen = (g, bg) => over(palette.steps[g], bg, alpha);
    const labelFor = (g) => labels.find((o) => test(ink.steps[o], palette.steps[g], 'text') && behind.every((bg) => test(ink.steps[o], seen(g, bg), 'text')));

    // The fill nearest the key color whose plain label (5 or 0) passes, seen at that opacity,
    // and that stands out from the canvas and surface (3:1), so a button's shape shows. Only
    // plain labels count here, so colored labels never move the fill: a colored label is used
    // only where it passes on the fill that the plain label chose. At full solidity this is the
    // usual fill. The lower the solidity, the further from its label a fill may move. Mid-tone
    // canvases, as in neumorphic and glass themes, can need a fill a grade or two out.
    const plain = (g) => [5, 0].map((o) => (dark ? 100 - o : o)).find((o) => test(ink.steps[o], palette.steps[g], 'text') && behind.every((bg) => test(ink.steps[o], seen(g, bg), 'text')));
    const fits = (g) => plain(g) !== undefined && test(palette.steps[g], canvas, 'ui') && behind.every((bg) => test(seen(g, bg), bg, 'ui'));
    const fill = near.find(fits) ?? near.find((g) => onFillFor(g) !== undefined) ?? near[0];
    const onFill = labelFor(fill) ?? onFillFor(fill) ?? (fill > 50 ? 0 : 100);
    set(`fill.${role}`, palette, fill);
    set(`on-fill.${role}`, ink, onFill);
    // Hover and active move away from the label color, so contrast only gets better.
    const away = onFill < 50 ? 1 : -1;
    set(`fill.${role}-hover`, palette, step(fill, away));
    set(`fill.${role}-active`, palette, step(fill, 2 * away));
    // Shine comes from the ramp itself, not from white: a lighter grade at the top and a
    // darker one at the bottom, only as far as the label still passes. So dark fills stay
    // rich, and light fills get a paler top, as their lighter grades have less chroma.
    const shine = settings.feel.shininess;
    const reach = shine === 0 ? 0 : shine < 0.34 ? 1 : 2;
    const labelPasses = (g) => test(ink.steps[onFill], palette.steps[g], 'text');
    let top = fill;
    for (let k = 1; k <= reach && labelPasses(step(fill, -k)); k++) top = step(fill, -k);
    const bottom = reach && labelPasses(step(fill, 1)) ? step(fill, 1) : fill;
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
    const tint = role === 'base' ? back.find((g) => labelGrades.some((n) => labelOn([g])(ink.steps[n]))) ?? beyond : dark ? 95 : 5;
    const hover = [step(tint, dark ? -1 : 1), tint].find((g) => labelGrades.some((n) => labelOn([tint, g])(ink.steps[n])));
    const tints = [set(`tint.${role}`, palette, tint), set(`tint.${role}-hover`, palette, hover ?? tint)];
    set(`on-tint.${role}`, ink, pick(ink, labelGrades, (hex) => tints.every((bg) => test(hex, bg, 'text')), tints));

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

  return { tokens, audit, computed: computed(dark, tokens, primitives, settings.feel, palettes) };
}

// An empty shadow that can still join a list of shadows, which "none" cannot.
const NO_SHADOW = '0 0 #0000';

// Values for one mode that are not one palette color: see-through panels and shadows.
// As solidity drops, shadows and card edges take on the action color, like light through
// tinted glass: shadows blend from black toward a dark shade of the key color, and card edges
// from the base border toward the action border. At full solidity they are neutral.
function computed(dark, tokens, primitives, feel, palettes) {
  const e = primitives.effect;
  const keyed = round(1 - feel.solidity);
  const ink = channels(mix('#000000', palettes.action.steps[dark ? 90 : 70], keyed));
  const hairline = mix(dark ? '#ffffff' : '#000000', tokens['border.action'].value, keyed);
  return {
    'bg.panel': rgba(tokens['bg.surface'].value, e.panelAlpha),
    // Card edges: a faint hairline for neumorphic themes, and fainter as panels get see-through.
    'panel.border': e.relief > 0.35 ? rgba(hairline, round(0.08 + 0.3 * keyed)) : rgba(mix(tokens['border.base'].value, tokens['border.action'].value, keyed), round(0.25 + 0.75 * feel.solidity)),
    'elevation.1': shadow(1, dark, e, feel, ink),
    'elevation.2': shadow(2, dark, e, feel, ink),
    'elevation.3': shadow(3, dark, e, feel, ink),
    'elevation.inset': insetShadow(dark, e, feel),
    highlight: e.highlight ? `inset 0 1px 0 rgba(255,255,255,${dark ? round(e.highlight * 0.5) : e.highlight})` : NO_SHADOW,
  };
}

// `ink` is the shadow color as "r,g,b": black, or tinted with the key color at low solidity.
function shadow(level, dark, effect, feel, ink) {
  const { depth: d, softness: f } = feel;
  if (d === 0) return NO_SHADOW;
  const y = round(d * [2, 6, 16][level - 1], 1);
  const blur = round(y * 3 * f, 1);
  const x = round(y * (1 - f) ** 2, 1);
  const alpha = Math.min(1, ((1 - f) * 0.85 + 0.12) * (dark ? 1.8 : 1));
  const parts = [`${x}px ${y}px ${blur}px rgba(${ink},${round(alpha)})`];
  if (effect.relief > 0) {
    // A light shadow on the other side, so the part looks pressed out of the canvas.
    const light = dark ? round(0.08 * effect.relief) : round(0.9 * effect.relief);
    parts.unshift(`${-y}px ${-y}px ${blur}px rgba(255,255,255,${light})`);
    parts[1] = `${y}px ${y}px ${blur}px rgba(${ink},${round(alpha * 0.9)})`;
    // A soft dark line along the top edge, so the top does not melt into the canvas.
    parts.push(`0 -1px ${round(y / 2 + 1, 1)}px rgba(${ink},${round((dark ? 0.35 : 0.12) * effect.relief)})`);
  }
  return parts.join(', ');
}

function insetShadow(dark, effect, feel) {
  if (effect.relief === 0) return NO_SHADOW;
  const y = round(feel.depth * 4);
  const blur = round(y * 2);
  const light = dark ? round(0.06 * effect.relief) : round(0.8 * effect.relief);
  return `inset ${y}px ${y}px ${blur}px rgba(0,0,0,${dark ? 0.5 : 0.18}), inset ${-y}px ${-y}px ${blur}px rgba(255,255,255,${light})`;
}

// The lowest opacity, from `start` up to 1, at which a see-through part still passes, in both
// modes, over the canvas and the surface. `part` is "fill" (solid buttons) or "tint" (soft and
// quiet buttons). Each label must pass on its fill or tint as it is seen. A solid fill must also
// stand out from what is behind it (3:1).
// `inverted`: the part uses the other mode's colors, over this mode's page, as with tm-invert. A
// light fill with a dark label on a light page: the page showing through keeps the fill on the
// label's far side, so inverted fills can be very see-through. The edge is not checked: an
// inverted part sits on the other mode's canvas, which no pair covers.
function seeThrough(start, modes, test, part, inverted) {
  if (start >= 1) return 1;
  const other = { light: 'dark', dark: 'light' };
  const passes = (alpha) => Object.entries(modes).every(([mode, { tokens }]) => ['bg.canvas', 'bg.surface'].every((bg) => {
    const back = modes[inverted ? other[mode] : mode].tokens[bg].value;
    return ROLES.every((role) => [`${part}.${role}`, `${part}.${role}-hover`].every((name) => {
      const seen = over(tokens[name].value, back, alpha);
      return test(tokens[`on-${part}.${role}`].value, seen, 'text') && (part !== 'fill' || inverted || test(seen, back, 'ui'));
    }));
  }));
  for (let a = start; a < 1; a = round(a + 0.05)) if (passes(a)) return a;
  return 1;
}

// The lowest card opacity, from `start` up to 1, at which body and muted text pass on a card
// laid over the other mode's canvas and surface, in both modes. For tm-invert.
function panelSeeThrough(start, modes, test) {
  if (start >= 1) return 1;
  const other = { light: 'dark', dark: 'light' };
  const passes = (alpha) => Object.entries(modes).every(([mode, { tokens }]) => ['bg.canvas', 'bg.surface'].every((bg) => {
    const seen = over(tokens['bg.surface'].value, modes[other[mode]].tokens[bg].value, alpha);
    return ['fg.base', 'fg.base-muted'].every((fg) => test(tokens[fg].value, seen, 'text'));
  }));
  for (let a = start; a < 1; a = round(a + 0.05)) if (passes(a)) return a;
  return 1;
}

// A color with this opacity, laid over a background, as a browser mixes them. Browsers lay a
// see-through layer over the page in sRGB, whatever color-mix() the layer's color came from,
// so this stays in sRGB: the contrast checks must see what the screen shows. Mixes that we
// choose ourselves are in OKLCH: see mix().
function over(fg, bg, alpha) {
  const [f, b] = [parseHex(fg), parseHex(bg)];
  return '#' + f.map((c, i) => Math.round((c * alpha + b[i] * (1 - alpha)) * 255).toString(16).padStart(2, '0')).join('');
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

// Two hex colors mixed in OKLCH, t of the way from a to b, so the hue holds.
const mix = (a, b, t) => toHex(mixOklch(parseHex(a), parseHex(b), t));

// A hex color as "r,g,b", for rgba().
const channels = (hex) => parseHex(hex).map((c) => Math.round(c * 255)).join(',');

function rgba(hex, alpha) {
  if (alpha >= 1) return hex;
  const [r, g, b] = parseHex(hex).map((c) => Math.round(c * 255));
  return `rgba(${r},${g},${b},${alpha})`;
}

function scale(unit, factors) {
  return Object.fromEntries(Object.entries(factors).map(([k, x]) => [k, Math.round(unit * x)]));
}

const round = (x, digits = 2) => Math.round(x * 10 ** digits) / 10 ** digits;
