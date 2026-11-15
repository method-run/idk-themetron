// Write a set of themes in formats that other tools read.
import { GRADES } from './palette.js';
import { ROOT, ROLES } from './inputs.js';

const px = (n) => `${n}px`;
const ms = (n) => `${n}ms`;
const bezier = (b) => `cubic-bezier(${b.join(', ')})`;
const fontList = (list) => list.map((f) => (/[\s\d]/.test(f) && !/^(ui-|system-ui)/.test(f) ? `"${f}"` : f)).join(', ');
const cssName = (path) => path.replace(/\./g, '-');
const round1 = (n) => Math.round(n * 10) / 10;

// The primitive tokens of one theme as flat [name, CSS value] pairs.
export function primitiveEntries(p) {
  const out = [];
  for (const [name, steps] of Object.entries(p.color)) for (const g of GRADES) out.push([`${name}-${g}`, steps[g]]);
  // Each role's key color, exactly as given. Only the exact button uses it.
  for (const [name, key] of Object.entries(p.keys)) out.push([`${name}-key`, key.hex]);
  for (const [k, v] of Object.entries(p.gap)) out.push([`gap-${k}`, String(v ?? 100)]);
  for (const [role, list] of Object.entries(p.font.family)) out.push([`font-${role}`, fontList(list)]);
  for (const [k, v] of Object.entries(p.font.size)) out.push([`font-size-${k}`, px(v)]);
  for (const [k, v] of Object.entries(p.font.weight)) out.push([`font-weight-${k}`, String(v)]);
  for (const [k, v] of Object.entries(p.font.lineHeight)) out.push([`line-height-${k}`, String(v)]);
  for (const [k, v] of Object.entries(p.font.leading)) out.push([`leading-${k}`, px(v)]);
  for (const [k, v] of Object.entries(p.font.leadingTight)) out.push([`leading-tight-${k}`, px(v)]);
  out.push(['rhythm', px(p.rhythm)]);
  for (const [k, v] of Object.entries(p.space)) out.push([`space-${k}`, px(v)]);
  for (const [k, v] of Object.entries(p.control)) out.push([`control-${cssName(k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()))}`, px(v)]);
  for (const [k, v] of Object.entries(p.radius)) out.push([`radius-${cssName(k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()))}`, px(v)]);
  // The roundness, from 0 to 1, for parts that round as a share of their own size:
  // calc(var(--tm-roundness) * height / 2) is a pill at full roundness.
  out.push(['roundness', String(p.roundness)]);
  // The opacity of button and card edges: 1, fading to 0 over the top tenth of softness.
  out.push(['edge-alpha', String(p.effect.edgeAlpha)]);
  // The shininess, from 0 to 1: the shared shine (see shineRules) scales its opacity by it.
  out.push(['shininess', String(p.shininess)]);
  out.push(['border-width', px(p.border.width)], ['focus-width', px(p.border.focus)]);
  for (const [k, v] of Object.entries(p.motion.duration)) out.push([`duration-${k}`, ms(v)]);
  for (const [k, v] of Object.entries(p.motion.easing)) out.push([`ease-${k}`, bezier(v)]);
  out.push(['panel-blur', px(p.effect.blur)], ['lift', px(p.effect.lift)]);
  // The whole backdrop-filter value, for cards and for controls (a quarter of the blur). It is
  // "none" when there is no blur: even blur(0px) makes a browser give the part its own layer
  // and re-capture what is behind it, which costs memory and can flicker on hover.
  const blur = (b) => (b > 0 ? `blur(${round1(b)}px)` : 'none');
  out.push(['backdrop', blur(p.effect.blur)], ['backdrop-control', blur(p.effect.blur / 4)]);
  out.push(['fill-alpha', String(p.effect.fillAlpha)], ['panel-border-width', px(p.panelBorderWidth)]);
  // The opacity of soft and quiet buttons' tints.
  out.push(['tint-alpha', String(p.effect.tintAlpha)]);
  // The opacity of fields: inputs, selects, and text areas.
  out.push(['field-alpha', String(p.effect.fieldAlpha)]);
  // The opacity of a solid fill, and of an inverted tint, at clarity 1. A component divides by
  // these to tell how far a part has faded: (1 - alpha) / (1 - clearest).
  out.push(['fill-alpha-clearest', String(p.effect.clearest.fill)], ['tint-alpha-inverted-clearest', String(p.effect.clearest.tintInverted)]);
  // A button's shine brightens its top and darkens its bottom. When parts are see-through
  // (clarity over 0), it filters the backdrop, so the page through the fill is shaded too. When
  // they are opaque, the backdrop is only the fill, so a layer painted in the fill's color with a
  // plain filter looks the same and does not read what is behind it. At shininess 0, neither.
  const sh = p.shininess;
  const seeThrough = p.effect.fillAlpha < 1 || p.effect.tintAlpha < 1;
  const top = `brightness(${round1((1 + 0.8 * sh) * 100) / 100})`;
  const bottom = `brightness(${round1((1 - 0.35 * sh) * 100) / 100})`;
  const pick = (on, value) => (sh && on ? value : 'none');
  out.push(['shine-backdrop-top', pick(seeThrough, top)], ['shine-backdrop-bottom', pick(seeThrough, bottom)]);
  out.push(['shine-filter-top', pick(!seeThrough, top)], ['shine-filter-bottom', pick(!seeThrough, bottom)]);
  out.push(['shine-paint', sh && !seeThrough ? '1' : '0']);
  // Twins for tm-invert: an inverted part has its own opacities. See invertRulesAfter.
  out.push(['fill-alpha-normal', String(p.effect.fillAlpha)], ['fill-alpha-inverted', String(p.effect.fillAlphaInverted)]);
  out.push(['tint-alpha-normal', String(p.effect.tintAlpha)], ['tint-alpha-inverted', String(p.effect.tintAlphaInverted)]);
  return out;
}

// The semantic tokens as [name, CSS value] pairs. Each value holds both modes:
// light-dark() picks one from the color-scheme where the value is used.
export function semanticEntries(theme, prefix = 'tm') {
  const { light, dark } = theme.modes;
  const out = [];
  for (const [name, t] of Object.entries(light.tokens)) {
    const l = refCss(t, prefix);
    const d = refCss(dark.tokens[name], prefix);
    out.push([cssName(name), l === d ? l : `light-dark(${l}, ${d})`]);
  }
  for (const [name, value] of Object.entries(light.computed)) {
    const d = dark.computed[name];
    const aliased = (v) => (v.alpha < 1 ? `color-mix(in oklab, var(--${prefix}-${cssName(v.alias)}) ${round1(v.alpha * 100)}%, transparent)` : `var(--${prefix}-${cssName(v.alias)})`);
    const css = value.alias ? (aliased(value) === aliased(d) ? aliased(value) : bothModes(value.value, d.value)) : bothModes(value, d);
    out.push([cssName(name), css]);
  }
  // Outer shadows fall on the page around a part, so an inverted part draws them in the page's
  // mode: the flipped twin swaps the modes. The normal twin restores them inside the part.
  // tm-invert uses both; see invertShadowRules.
  for (const level of [1, 2, 3]) {
    const name = `elevation.${level}`;
    out.push([`elevation-${level}-normal`, bothModes(light.computed[name], dark.computed[name])]);
    out.push([`elevation-${level}-flipped`, bothModes(dark.computed[name], light.computed[name])]);
  }
  // The edge band and glow, for parts that draw them: action fills (checks, switches, badges, and
  // other parts) and small base parts (a switch's knob). Buttons shade through their backdrop
  // instead, so quiet and exact buttons have none.
  const shined = ['action', 'base-muted'];
  // The top edge of a filled part catches the light: a 1 px line of a lighter grade of the
  // part's own color, with the shininess as its opacity. One for fills, and one for tints.
  // The components draw it with box-shadow: inset 0 1px 0 <color>.
  const shine = theme.settings.feel.shininess;
  // In dark mode the band is half as strong: a light line on a light fill stands out more.
  const mixed = (ref, share) => `color-mix(in oklch, var(--${prefix}-${ref}) ${round1(share * 100)}%, transparent)`;
  const lit = (ref) => (shine ? `light-dark(${mixed(ref, shine)}, ${mixed(ref, shine / 2)})` : 'transparent');
  for (const part of shined) out.push([`highlight-${part}`, lit(`gloss-${part}-rim`)]);
  for (const role of ROLES) out.push([`highlight-tint-${role}`, lit(`gloss-tint-${role}-rim`)]);
  // A soft glow of the same color also fills the top of the part: none at shininess 0, and
  // 20% opacity at 1. With the gradient's highlight at 80%, the shine is split 80/20 between
  // the highlight and the glow.
  const glow = shine * 0.2;
  const glowing = (ref) => (glow ? `color-mix(in oklch, var(--${prefix}-${ref}) ${round1(glow * 100)}%, transparent)` : 'transparent');
  for (const part of shined) out.push([`glow-${part}`, glowing(`gloss-${part}-rim`)]);
  // Text set into the surface: a 1 px line of the part's own ramp, on the far side of the light.
  // Light text on a darker surface gets a dark line above and to the left, in the part's shadow
  // grade. Dark text on a lighter surface gets a light line below and to the right, in its rim
  // grade, fainter, since a light line stands out more. Fills have light text in light mode and
  // dark text in dark mode, and tints the other way round, so each token holds both lines, and
  // light-dark() makes the wrong one clear. The opacity grows with the shininess: none at 0.
  const ink = (ref, share) => `color-mix(in oklch, var(--${prefix}-${ref}) ${round1(shine * share * 100)}%, transparent)`;
  const setIn = (part, lightTextInLightMode) => {
    // An empty shadow, not none, so that a component can add its own shadows to the list.
    if (!shine) return '0 0 #0000';
    const dark = ink(`gloss-${part}-shadow`, 0.5);
    const light = ink(`gloss-${part}-rim`, 0.3);
    const [darkLine, lightLine] = lightTextInLightMode
      ? [`light-dark(${dark}, transparent)`, `light-dark(transparent, ${light})`]
      : [`light-dark(transparent, ${dark})`, `light-dark(${light}, transparent)`];
    return `-1px -1px 0 ${darkLine}, 1px 1px 0 ${lightLine}`;
  };
  for (const part of ['action', 'action-exact']) out.push([`text-shadow-${part}`, setIn(part, true)]);
  for (const part of ['quiet', 'tint-action', 'tint-base']) out.push([`text-shadow-${part}`, setIn(part, false)]);
  // A soft halo of the page's own color behind text, for text over photos and other rich
  // backgrounds: it pushes the background away from the letters. tm-over-media turns it on.
  // light-dark() resolves where the text is, so text in an inverted part gets that part's page.
  const halo = (share) => `color-mix(in oklch, var(--${prefix}-bg-canvas) ${share}%, transparent)`;
  out.push(['text-halo', `0 0 1px ${halo(70)}, 0 0 6px ${halo(60)}`]);
  for (const role of ROLES) out.push([`glow-tint-${role}`, glowing(`gloss-tint-${role}-rim`)]);
  return out;
}

// A semantic token as CSS: its grade, or a mix of two grades in OKLCH.
function refCss(t, prefix) {
  const v = (ref) => `var(--${prefix}-${cssName(ref)})`;
  return t.mix ? `color-mix(in oklch, ${v(t.ref)}, ${v(t.mix.ref)} ${Math.round(t.mix.amount * 100)}%)` : v(t.ref);
}

// The shine on solid fills, over the fill, with light from above: a bright rim at the top edge
// that fades out toward the middle, the plain fill only at the middle (50%), and a shadow that
// peaks at 80% and eases off at the bottom edge. The gradient blends in OKLCH, so it keeps the
// fill's hue.
// The shape is the same at every shininess, and each color's opacity grows with it, so 0 has
// no shine. At 1, the highlight is at 80% opacity and the shadow at 100%: the shape from
// docs/shine-notes.md, with the highlight tuned down to share the shine with the glow.
// The shape: [part, share of the shininess, position]. The highlight at the top is 80% of the
// shininess.
const SHINE_SHAPE = [['rim', 0.8, 0], ['top', 0.8, 3], [null, 0, 50], ['shadow', 1, 80], ['bottom', 0.5, 100]];

// The gradient, from a color for each part and an opacity for each share.
function shineGradient(color, opacity, prefix) {
  const stops = SHINE_SHAPE.map(([part, share, at]) => `${part ? `color-mix(in oklch, ${color(part)} ${opacity(share)}, transparent)` : 'transparent'} ${at}%`);
  // --tm-shine-direction: 0deg turns it upside down, light from below, so the part looks inset.
  return `linear-gradient(var(--${prefix}-shine-direction, 180deg) in oklch, ${stops.join(', ')})`;
}

// The shared shine, for any part. A part sets four colors, --tm-shine-rim, -top, -shadow and
// -bottom (usually its state's gloss grades), and paints var(--tm-shine-image). The rule is on
// every element and pseudo-element (a pseudo-element cannot go inside :where()), so each
// builds the gradient from its own colors, and the gradient
// follows a part's state. The colors are registered, so a change of state animates. The
// opacity is the theme's shininess, times --tm-shine-strength (1 by default; tints use less).
function shineRules(prefix) {
  const v = (name) => `--${prefix}-shine-${name}`;
  const props = ['rim', 'top', 'shadow', 'bottom'].map((part) => `@property ${v(part)} { syntax: '<color>'; inherits: true; initial-value: transparent; }`);
  const image = shineGradient((part) => `var(${v(part)})`, (share) => `calc(var(--${prefix}-shininess, 0) * var(${v('strength')}, 1) * ${round1(share * 100)}%)`, prefix);
  return `${props.join('\n')}\n:where(*), ::before, ::after { ${v('image')}: ${image}; }\n`;
}

// Join the light and dark forms of a value. Shadows differ only in their colors,
// so each rgba() color becomes a light-dark() pair.
function bothModes(light, dark) {
  if (light === dark) return light;
  const COLOR = /rgba?\([^)]*\)|#[0-9a-f]{3,8}\b/gi;
  const lc = light.match(COLOR) ?? [];
  const dc = dark.match(COLOR) ?? [];
  if (lc.length && lc.length === dc.length && light.replace(COLOR, '•') === dark.replace(COLOR, '•')) {
    let i = 0;
    return light.replace(COLOR, (c) => (c === dc[i] ? dc[i++] : `light-dark(${c}, ${dc[i++]})`));
  }
  if (lc.length === 1 && lc[0] === light) return `light-dark(${light}, ${dark})`;
  throw new Error(`Cannot join the light and dark values: ${light} | ${dark}`);
}

// Tokens in groups that often hold the same values across themes: the action role, the base
// role, and the rest. Themes with the same values in a group share one rule for it.
const groupOf = (name) => (/(^|-)action(-|$)|^border-focus$/.test(name) ? 'action' : /^(base-\d|bg-|fg-base|border-base|(on-)?(fill|tint)-base|gloss-base|panel-border$)|^(on-)?(fill|gloss)-quiet/.test(name) ? 'base' : 'rest');

// CSS custom properties. Each theme class sets every token, from the theme's place in the tree,
// so a theme looks the same wherever it is on the page. The root theme also applies to :root,
// unless `root` is false. Put one theme class on an element: the nearest one wins.
// Light and dark follow the system setting. data-tm-mode="light" or "dark" forces one mode.
// More contrast: each theme's enhanced-level tokens, where they differ, in three blocks. The
// reader's `prefers-contrast: more` turns them on. data-tm-contrast="more" turns them on for an
// element and everything in it, and "base" turns them off. Scoped rules beat unscoped ones, and
// the nearest scope wins, so the attribute beats the media query, and the nearest attribute wins.
// `more: false` leaves the variant out.
export function toCss(built, { prefix = 'tm', classPrefix = 'theme-', root = true, more = true } = {}) {
  const decl = (entries, indent = '  ') => entries.map(([k, v]) => `${indent}--${prefix}-${k}: ${v};`).join('\n');
  const selectorOf = (name) => `${name === ROOT && root ? ':root, ' : ''}.${classPrefix}${name}`;
  const entriesOf = (theme, level) => [...primitiveEntries(level.primitives), ...semanticEntries({ ...theme, ...level }, prefix)];
  // [[selector list, entries]]: each group of each theme, with the themes that share it.
  const share = (list) => {
    const rules = new Map();
    for (const group of ['rest', 'base', 'action']) {
      for (const [name, entries] of list) {
        const mine = entries.filter(([k]) => groupOf(k) === group);
        if (!mine.length) continue;
        const key = `${group}|${JSON.stringify(mine)}`;
        if (rules.has(key)) rules.get(key)[0].push(selectorOf(name));
        else rules.set(key, [[selectorOf(name)], mine]);
      }
    }
    return [...rules.values()].map(([sels, entries]) => [sels.join(', '), entries]);
  };
  const levels = [];
  const changes = [];
  for (const name of built.order) {
    const theme = built.themes[name];
    const entries = entriesOf(theme, theme);
    levels.push([name, entries]);
    if (!more || !theme.more) continue;
    const base = new Map(entries);
    const changed = entriesOf(theme, theme.more).filter(([k, v]) => base.get(k) !== v);
    if (changed.length) changes.push([name, changed, changed.map(([k]) => [k, base.get(k)])]);
  }
  const rules = share(levels).map(([sel, entries]) => `${sel} {\n${decl(entries)}\n}\n`);
  const moreRules = share(changes.map(([name, changed]) => [name, changed])).map(([sel, entries]) => [sel, decl(entries, '    ')]);
  const baseRules = share(changes.map(([name, , restore]) => [name, restore])).map(([sel, entries]) => [sel, decl(entries, '    ')]);
  // In @scope, a plain selector matches only inside the scoping root, so :scope:is() adds the
  // root itself: <html data-tm-contrast="more">, or an element with a theme class.
  const block = (head, list, scoped) => `${head} {\n${list.map(([sel, body]) => `  ${scoped ? `:scope:is(${sel}), ${sel}` : sel} {\n${body}\n  }`).join('\n')}\n}\n`;
  const fonts = fontImport(built);
  return [
    fonts ? `@import url("${fonts}");\n` : '',
    // On a theme class, color-scheme would undo a forced mode around it, so it goes on :root only.
    root ? ':root { color-scheme: light dark; }' : '',
    '[data-tm-mode="light"] { color-scheme: light; }',
    '[data-tm-mode="dark"] { color-scheme: dark; }\n',
    shineRules(prefix),
    invertRules(prefix),
    ...rules,
    // After the theme rules, so that an element with a theme class and tm-invert still flips.
    invertRulesAfter(prefix),
    overMediaRules(prefix),
    ...(moreRules.length ? [
      '/* More contrast: the enhanced level, for readers who ask for it. */',
      block('@media (prefers-contrast: more)', moreRules, false),
      block('@scope ([data-tm-contrast="more"])', moreRules, true),
      block('@scope ([data-tm-contrast="base"])', baseRules, true),
    ] : []),
  ].join('\n');
}

// class="${prefix}-invert" shows an element, and everything in it, in the other mode. Every
// color token holds both modes, so the class only flips color-scheme. @scope makes the
// nearest data-tm-mode win. An invert inside an invert is not supported.
function invertRules(prefix) {
  const c = `.${prefix}-invert`;
  return [
    `${c} { color-scheme: dark; }`,
    `@media (prefers-color-scheme: dark) { ${c} { color-scheme: light; } }`,
    `@scope ([data-tm-mode="light"]) { ${c} { color-scheme: dark; } }`,
    `@scope ([data-tm-mode="dark"]) { ${c} { color-scheme: light; } }`,
    // Text color is resolved where it is set, and inherited as a fixed color. So an
    // inverted element sets it again in its own mode. :where() keeps components' colors first.
    `:where(${c}) { color: var(--${prefix}-fg-base); }\n`,
  ].join('\n');
}

// What an inverted part draws on the page around it, or over it:
// - Its outer shadows fall on the page, so they keep the page's mode. Under the flipped
//   color-scheme, the flipped twin resolves to the page's mode. Inset shadows and highlights
//   are inside the part, so they flip with it.
// - Its fill, tint, and card background are the other mode's, over this mode's page, so they
//   have their own opacities: an inverted fill can be far more see-through, and an inverted
//   card must be more solid, so its text passes.
// Parts inside the inverted part sit on its surface, so they get the normal values back.
// tm-over-media: an opt-in area for parts over photos and other rich backgrounds. The engine can
// only check contrast against the theme's own backgrounds, so this area protects text instead:
// see-through parts blur what is behind them, and text gets a halo of the page's color. Outside
// it, nothing blurs, as blur costs a layer for each part. It comes after the theme rules, so it
// also works on an element with a theme class.
function overMediaRules(prefix) {
  // The halo is set on each element, not inherited: a color in text-shadow is fixed where it is
  // set, so text in an inverted part would get the page's halo. :where() keeps it weaker than
  // any part's own text shadow.
  return `.${prefix}-over-media { --${prefix}-backdrop: blur(4px); --${prefix}-backdrop-control: blur(2px); }\n:where(.${prefix}-over-media, .${prefix}-over-media *) { text-shadow: var(--${prefix}-text-halo); }\n`;
}

function invertRulesAfter(prefix) {
  const set = (shadow, alpha) => [
    ...[1, 2, 3].map((n) => `--${prefix}-elevation-${n}: var(--${prefix}-elevation-${n}-${shadow});`),
    `--${prefix}-fill-alpha: var(--${prefix}-fill-alpha-${alpha});`,
    `--${prefix}-tint-alpha: var(--${prefix}-tint-alpha-${alpha});`,
    `--${prefix}-bg-panel: var(--${prefix}-bg-panel-${alpha});`,
  ].join(' ');
  return `.${prefix}-invert { ${set('flipped', 'inverted')} }\n.${prefix}-invert * { ${set('normal', 'normal')} }\n`;
}

// A Google Fonts URL for the named font families of all themes, or null.
export function fontImport(built) {
  const families = new Set();
  for (const theme of Object.values(built.themes)) {
    for (const field of ['font', 'headingFont', 'monoFont']) if (theme.settings[field].family) families.add(theme.settings[field].family);
  }
  if (!families.size) return null;
  const q = [...families].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;700`).join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

// Design Tokens Community Group format. One group for each theme, with every token
// resolved. Semantic tokens are aliases to the theme's own palettes, one group for each mode.
export function toDtcg(built) {
  const tok = ($type, $value, extra) => ({ $type, $value, ...extra });
  const dims = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, tok('dimension', { value: v, unit: 'px' })]));
  const themes = {};
  for (const name of built.order) {
    const theme = built.themes[name];
    const p = theme.primitives;
    const group = {
      $description: theme.settings.label,
      $extensions: { themetron: { label: theme.settings.label, kind: theme.kind, parent: theme.parent, gradeGaps: theme.gaps } },
    };
    for (const [palette, steps] of Object.entries(p.color)) {
      group[palette] = Object.fromEntries(GRADES.map((g) => [g, tok('color', steps[g])]));
      group[palette].key = tok('color', p.keys[palette].hex, { $description: 'The key color, exactly as given.' });
      group[palette].$extensions = { themetron: { key: p.keys[palette].hex, keyGrade: p.keys[palette].grade } };
    }
    group.gap = Object.fromEntries(Object.entries(p.gap).map(([k, v]) => [k, tok('number', v)]));
    group.font = {
      family: Object.fromEntries(Object.entries(p.font.family).map(([k, v]) => [k, tok('fontFamily', v)])),
      size: dims(p.font.size),
      weight: Object.fromEntries(Object.entries(p.font.weight).map(([k, v]) => [k, tok('fontWeight', v)])),
      lineHeight: Object.fromEntries(Object.entries(p.font.lineHeight).map(([k, v]) => [k, tok('number', v)])),
      leading: dims(p.font.leading),
      leadingTight: dims(p.font.leadingTight),
    };
    group.rhythm = tok('dimension', { value: p.rhythm, unit: 'px' });
    group.space = dims(p.space);
    group.control = dims(p.control);
    group.radius = dims(p.radius);
    group.roundness = tok('number', p.roundness, { $description: 'The roundness, from 0 to 1. A part with height h rounds by roundness × h ÷ 2, a pill at 1.' });
    group.border = dims(p.border);
    group.duration = Object.fromEntries(Object.entries(p.motion.duration).map(([k, v]) => [k, tok('duration', { value: v, unit: 'ms' })]));
    group.easing = Object.fromEntries(Object.entries(p.motion.easing).map(([k, v]) => [k, tok('cubicBezier', v)]));
    group.effect = {
      panelBlur: tok('dimension', { value: p.effect.blur, unit: 'px' }),
      fillAlpha: tok('number', p.effect.fillAlpha),
      fillAlphaInverted: tok('number', p.effect.fillAlphaInverted, { $description: 'The fill opacity of a part with tm-invert.' }),
      tintAlpha: tok('number', p.effect.tintAlpha, { $description: 'The tint opacity of soft and quiet buttons.' }),
      tintAlphaInverted: tok('number', p.effect.tintAlphaInverted, { $description: 'The tint opacity of a part with tm-invert.' }),
      fieldAlpha: tok('number', p.effect.fieldAlpha, { $description: 'The opacity of fields.' }),
      edgeAlpha: tok('number', p.effect.edgeAlpha, { $description: 'The opacity of button and card edges: 1, fading to 0 over the top tenth of softness.' }),
      fillAlphaClearest: tok('number', p.effect.clearest.fill, { $description: 'The opacity of a solid fill at clarity 1.' }),
      tintAlphaInvertedClearest: tok('number', p.effect.clearest.tintInverted, { $description: 'The opacity of an inverted tint at clarity 1.' }),
      panelBorderWidth: tok('dimension', { value: p.panelBorderWidth, unit: 'px' }),
    };
    const modesOf = (level) => {
      const out = {};
      for (const [modeName, mode] of Object.entries(level.modes)) {
        const m = {};
        // A mixed token has no single grade to point at, so DTCG gets its value.
        for (const [token, t] of Object.entries(mode.tokens)) setPath(m, token, tok('color', t.mix ? t.value : `{themes.${name}.${t.ref}}`));
        for (const [token, value] of Object.entries(mode.computed)) {
          if (value.alias && !(value.alpha < 1)) setPath(m, token, tok('color', `{themes.${name}.${mode.tokens[value.alias].ref}}`));
          else if (value.alias) setPath(m, token, tok('color', value.value, { $extensions: { themetron: { css: true } } }));
          else setPath(m, token, tok(token.startsWith('bg') ? 'color' : 'shadow', value, { $extensions: { themetron: { css: true } } }));
        }
        out[modeName] = m;
      }
      return out;
    };
    group.mode = modesOf(theme);
    // The more-contrast variant: the enhanced level, with the same ramps. Tools that have no
    // way to switch it can leave it out.
    if (theme.more) {
      group.moreContrast = {
        $description: 'For readers who ask for more contrast: CSS prefers-contrast: more, or data-tm-contrast="more".',
        $extensions: { themetron: { gradeGaps: theme.more.gaps } },
        gap: Object.fromEntries(Object.entries(theme.more.primitives.gap).map(([k, v]) => [k, tok('number', v)])),
        mode: modesOf(theme.more),
      };
    }
    themes[name] = group;
  }
  return {
    $description: 'Made by themetron. In each theme, grades with the same number have the same luminance in every palette.',
    $extensions: { themetron: { inputs: { themes: built.inputs.themes } } },
    themes,
  };
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k] ??= {};
  o[keys[keys.length - 1]] = value;
}

// A Tailwind CSS v4 `@theme inline` block. Every value points at a themetron CSS
// variable, so the theme classes and the modes work in Tailwind utilities too.
// Use it with the output of toCss. Grade 5 is Tailwind's 50, grade 10 is 100, and so on.
export function toTailwind(built, { prefix = 'tm' } = {}) {
  const theme = built.themes[ROOT];
  const p = theme.primitives;
  const v = (name) => `var(--${prefix}-${name})`;
  const lines = [];
  for (const palette of Object.keys(p.color)) {
    for (const g of GRADES) if (g !== 0 && g !== 100) lines.push(`--color-${palette}-${g * 10}: ${v(`${palette}-${g}`)};`);
  }
  for (const name of Object.keys(theme.modes.light.tokens)) {
    if (/^(bg|fg|border)\./.test(name) || /^(on-)?(fill|tint)\.(base|action)$/.test(name)) lines.push(`--color-${cssName(name)}: ${v(cssName(name))};`);
  }
  lines.push(`--font-sans: ${v('font-body')};`, `--font-heading: ${v('font-heading')};`, `--font-mono: ${v('font-mono')};`);
  for (const k of Object.keys(p.font.size)) lines.push(`--text-${k === 'md' ? 'base' : k}: ${v(`font-size-${k}`)};`);
  lines.push(`--spacing: ${v('space-xs')};`);
  for (const k of ['sm', 'md', 'lg', 'control']) lines.push(`--radius-${k}: ${v(`radius-${k}`)};`);
  for (const level of [1, 2, 3]) lines.push(`--shadow-${['sm', 'md', 'lg'][level - 1]}: ${v(`elevation-${level}`)};`);
  lines.push(`--ease-standard: ${v('ease-standard')};`, `--ease-enter: ${v('ease-enter')};`);
  return `@import "tailwindcss";\n\n/* Add the themetron CSS too: these names point at its variables. */\n@theme inline {\n${lines.map((l) => '  ' + l).join('\n')}\n}\n`;
}

// shadcn/ui theme variables, for its globals.css. :root and .dark hold the root theme's
// light and dark values. Each child theme gets a rule on its class too, so
// class="theme-danger" works on shadcn components. "destructive" comes from a theme
// named danger, if there is one.
export function toShadcn(built, { classPrefix = 'theme-' } = {}) {
  const vars = (theme, mode) => {
    const t = theme.modes[mode].tokens;
    const v = (name) => t[name].value;
    const danger = built.themes.danger?.modes[mode].tokens;
    return {
      background: v('bg.canvas'),
      foreground: v('fg.base'),
      card: v('bg.surface'),
      'card-foreground': v('fg.base'),
      popover: v('bg.surface'),
      'popover-foreground': v('fg.base'),
      primary: v('fill.action'),
      'primary-foreground': v('on-fill.action'),
      secondary: v('tint.base'),
      'secondary-foreground': v('on-tint.base'),
      muted: v('bg.sunken'),
      'muted-foreground': v('fg.base-muted'),
      accent: v('tint.action'),
      'accent-foreground': v('on-tint.action'),
      destructive: danger ? danger['fill.action'].value : v('fill.action'),
      border: v('border.base'),
      input: v('border.base-strong'),
      ring: v('border.focus'),
      // Charts: the fills of up to five themes, then more grades of this theme's ramp.
      ...Object.fromEntries([1, 2, 3, 4, 5].map((i) => {
        const other = built.themes[built.order[i - 1]];
        const color = other ? other.modes[mode].tokens['fill.action'].value : theme.palettes.action.steps[[30, 50, 70, 40, 60][i - 1]];
        return [`chart-${i}`, color];
      })),
      sidebar: v('bg.surface'),
      'sidebar-foreground': v('fg.base'),
      'sidebar-primary': v('fill.action'),
      'sidebar-primary-foreground': v('on-fill.action'),
      'sidebar-accent': v('tint.action'),
      'sidebar-accent-foreground': v('on-tint.action'),
      'sidebar-border': v('border.base'),
      'sidebar-ring': v('border.focus'),
    };
  };
  const block = (selector, entries) => `${selector} {\n${Object.entries(entries).map(([k, val]) => `  --${k}: ${val};`).join('\n')}\n}\n`;
  const root = built.themes[ROOT];
  const out = [
    '/* Paste into your shadcn/ui globals.css, in place of its :root and .dark blocks. Made by themetron. */\n',
    block(':root', { ...vars(root, 'light'), radius: `${root.primitives.radius.md}px` }),
    block('.dark', vars(root, 'dark')),
  ];
  for (const name of built.order.slice(1)) {
    const theme = built.themes[name];
    out.push(block(`.${classPrefix}${name}`, vars(theme, 'light')), block(`.dark .${classPrefix}${name}, .${classPrefix}${name}.dark`, vars(theme, 'dark')));
  }
  return out.join('\n');
}
