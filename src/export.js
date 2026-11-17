// Write a set of themes in formats that other tools read.
import { GRADES } from './palette.js';
import { ROOT, ROLES, FONT_FIELDS, themeName } from './inputs.js';
import { iconImport } from './icons.js';
import { CONTRACT_VERSION, specUrl } from './manifest.js';

// The line that says what made an export: themetron, the theme set, and the token contract, with
// the URL of that contract's manifest. A tool can read the contract version from it, to tell
// when a theme is older or newer than what the tool knows. `set` is the theme set's name, such
// as "Admin app". It goes in as a name for code, admin-app, so it is safe in a comment.
const setSlug = (set) => (set ? themeName(String(set)) : '');
const madeBy = (set) => `Made by themetron${setSlug(set) ? ` for ${setSlug(set)}` : ''}, token contract ${CONTRACT_VERSION}: ${specUrl('tokens.manifest.json', CONTRACT_VERSION)}`;

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
  // The opacity of button and card edges: 1, fading to 0.5 over the top tenth of softness.
  out.push(['edge-alpha', String(p.effect.edgeAlpha)]);
  // The shininess, from 0 to 1: the shared shine (see shineRules) scales its opacity by it.
  out.push(['shininess', String(p.shininess)]);
  out.push(['border-width', px(p.border.width)], ['focus-width', px(p.border.focus)]);
  // The direction of the action gradient. See the fill-action-from and -to tokens.
  out.push(['action-angle', `${p.gradientAngle}deg`]);
  // "on" when the action color is a gradient, else "off". Components read it with a style query,
  // @container style(--tm-action-gradient: on), to paint gradient text and edges.
  out.push(['action-gradient', p.gradient ? 'on' : 'off']);
  // The icon font, and its fill (0 or 1) and line weight (100 to 700), for font-variation-settings.
  out.push(['font-icon', `"${p.icon.family}"`], ['icon-fill', String(p.icon.fill)], ['icon-weight', String(p.icon.weight)]);
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
  // The top edge of a filled part catches the light: a band of a lighter grade of the part's
  // own color, with the shininess as its opacity. One for fills, and one for tints. The
  // components draw it with box-shadow, about a twenty-first of the part's height and at least
  // 1 px, and half as wide along the left edge.
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
  // The action gradient as an image, for each fill and tint of the action role and each state:
  // its two ends, blended in OKLCH, along the theme's angle. Opaque: a part that fades with
  // clarity draws its own, from the -from and -to tokens. Without a gradient, both ends are the
  // solid color.
  for (const name of ['fill-action', 'fill-action-exact', 'tint-action']) {
    for (const state of ['', '-hover', '-active']) {
      out.push([`${name}${state}-image`, `linear-gradient(var(--${prefix}-action-angle) in oklch, var(--${prefix}-${name}${state}-from), var(--${prefix}-${name}${state}-to))`]);
    }
  }
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
// `icons: false` leaves out the @import of the icon font, for a page with no icons, or a site
// that loads the font itself. The icon tokens stay, so tm-icon still names the font.
export function toCss(built, { prefix = 'tm', classPrefix = 'theme-', root = true, more = true, icons = true, set } = {}) {
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
  const faces = fontFaces(built);
  return [
    // A comment may come before @import. Nothing else may.
    `/* ${madeBy(set)} */\n`,
    // @import must come first in a stylesheet.
    ...(fonts ? [`@import url("${fonts}");\n`] : []),
    ...(icons ? [`@import url("${iconImport(built)}");\n`] : []),
    ...(faces ? [faces] : []),
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

// The fonts that the themes name: each family once, with its files. A family with files
// in any theme loads from them, so it does not also load from Google Fonts.
function namedFonts(built) {
  const families = new Map();
  for (const theme of Object.values(built.themes)) {
    for (const field of FONT_FIELDS) {
      const { family, src } = theme.settings[field];
      if (!family) continue;
      if (!families.has(family)) families.set(family, []);
      if (src) families.get(family).push(...src);
    }
  }
  return families;
}

// A Google Fonts URL for the named font families of all themes, or null.
// Families with their own files are not in it.
export function fontImport(built) {
  const families = [...namedFonts(built)].filter(([, src]) => !src.length).map(([family]) => family);
  if (!families.length) return null;
  const q = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;700`).join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

const FONT_FORMATS = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
const cssString = (text) => `"${text.replace(/["\\]/g, '\\$&')}"`;

// The @font-face rules for the themes' own font files, or ''. One rule for each file.
export function fontFaces(built) {
  const rules = new Set();
  for (const [family, src] of namedFonts(built)) {
    for (const file of src) {
      const ext = file.url.replace(/[?#].*$/, '').split('.').pop();
      rules.add([
        '@font-face {',
        `  font-family: ${cssString(family)};`,
        `  src: url(${cssString(file.url)}) format("${FONT_FORMATS[ext]}");`,
        ...(file.weight ? [`  font-weight: ${file.weight};`] : []),
        ...(file.style ? [`  font-style: ${file.style};`] : []),
        '  font-display: swap;',
        '}',
      ].join('\n'));
    }
  }
  return rules.size ? `${[...rules].join('\n')}\n` : '';
}

// Design Tokens Community Group format. One group for each theme, with every token
// resolved. Semantic tokens are aliases to the theme's own palettes, one group for each mode.
export function toDtcg(built, { set } = {}) {
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
    group.actionAngle = tok('number', p.gradientAngle, { $description: 'The direction of the action gradient, in degrees: 180 (the default) runs top to bottom, and 90 left to right. The -from and -to color tokens are its ends.' });
    group.duration = Object.fromEntries(Object.entries(p.motion.duration).map(([k, v]) => [k, tok('duration', { value: v, unit: 'ms' })]));
    group.easing = Object.fromEntries(Object.entries(p.motion.easing).map(([k, v]) => [k, tok('cubicBezier', v)]));
    group.effect = {
      panelBlur: tok('dimension', { value: p.effect.blur, unit: 'px' }),
      fillAlpha: tok('number', p.effect.fillAlpha),
      fillAlphaInverted: tok('number', p.effect.fillAlphaInverted, { $description: 'The fill opacity of a part with tm-invert.' }),
      tintAlpha: tok('number', p.effect.tintAlpha, { $description: 'The tint opacity of soft and quiet buttons.' }),
      tintAlphaInverted: tok('number', p.effect.tintAlphaInverted, { $description: 'The tint opacity of a part with tm-invert.' }),
      fieldAlpha: tok('number', p.effect.fieldAlpha, { $description: 'The opacity of fields.' }),
      edgeAlpha: tok('number', p.effect.edgeAlpha, { $description: 'The opacity of button and card edges: 1, fading to 0.5 over the top tenth of softness.' }),
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
    $extensions: { themetron: { contract: CONTRACT_VERSION, manifest: specUrl('tokens.manifest.json', CONTRACT_VERSION), ...(setSlug(set) ? { set: setSlug(set) } : {}), inputs: { themes: built.inputs.themes } } },
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
export function toTailwind(built, { prefix = 'tm', set } = {}) {
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
  return `/* ${madeBy(set)} */\n@import "tailwindcss";\n\n/* Add the themetron CSS too: these names point at its variables. */\n@theme inline {\n${lines.map((l) => '  ' + l).join('\n')}\n}\n`;
}

// shadcn/ui theme variables, for its globals.css. :root and .dark hold the root theme's
// light and dark values. Each child theme gets a rule on its class too, so
// class="theme-danger" works on shadcn components. "destructive" comes from a theme
// named danger, if there is one.
// A theme at its more-contrast level, when `more` is true and the theme has one. The level holds
// the enhanced-level modes, primitives, and gaps, so exports read it like the theme itself.
const atLevel = (theme, more) => (more && theme.more ? { ...theme, ...theme.more } : theme);

// One CSS rule for each [selector, { name: value }] pair, then the same rules again inside
// @media (prefers-contrast: more), with only the values that change there.
const withMoreContrast = (pairs, block) => {
  const changed = pairs
    .map(([selector, base, more]) => [selector, Object.fromEntries(Object.entries(more).filter(([k, v]) => base[k] !== v))])
    .filter(([, entries]) => Object.keys(entries).length);
  const indent = (text) => text.replace(/^(?=.)/gm, '  ');
  return [
    ...pairs.map(([selector, base]) => block(selector, base)),
    ...(changed.length ? [`/* More contrast, for readers who ask for it. */\n@media (prefers-contrast: more) {\n${changed.map(([selector, entries]) => indent(block(selector, entries))).join('\n')}}\n`] : []),
  ];
};

export function toShadcn(built, { classPrefix = 'theme-', set } = {}) {
  const vars = (theme, mode, more) => {
    const t = atLevel(theme, more).modes[mode].tokens;
    const v = (name) => t[name].value;
    const danger = built.themes.danger && atLevel(built.themes.danger, more).modes[mode].tokens;
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
        const color = other ? atLevel(other, more).modes[mode].tokens['fill.action'].value : theme.palettes.action.steps[[30, 50, 70, 40, 60][i - 1]];
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
  const rule = (selector, theme, mode, extra = {}) => [selector, { ...vars(theme, mode, false), ...extra }, { ...vars(theme, mode, true), ...extra }];
  const pairs = [
    rule(':root', root, 'light', { radius: `${root.primitives.radius.md}px` }),
    rule('.dark', root, 'dark'),
    ...built.order.slice(1).flatMap((name) => [
      rule(`.${classPrefix}${name}`, built.themes[name], 'light'),
      rule(`.dark .${classPrefix}${name}, .${classPrefix}${name}.dark`, built.themes[name], 'dark'),
    ]),
  ];
  return [`/* Paste into your shadcn/ui globals.css, in place of its :root and .dark blocks. ${madeBy(set)} */\n`, ...withMoreContrast(pairs, block)].join('\n');
}

// Bootstrap 5 Sass variables, to put before Bootstrap's own Sass. Sass variables are fixed when
// Sass compiles, so most are the root theme's light-mode values. Bootstrap 5.3 has *-dark twins
// for the body, border, link, and subtle colors, for data-bs-theme="dark": they get the dark-mode
// values. Theme colors such as $primary have no twins, so they keep the light values. $success,
// $info, $warning, and $danger come from themes with those names, if there are any.
// More contrast: Sass cannot switch at run time, so `more: true` makes the variables for a second
// build, which the page loads with media="(prefers-contrast: more)". The steps are in
// spec/tokens.md, under "More contrast with Bootstrap Sass".
export function toBootstrapSass(built, { more = false, set } = {}) {
  const root = atLevel(built.themes[ROOT], more);
  const p = root.primitives;
  const size = (n) => `${round1(n)}px`;
  const rem = (n) => `${Math.round((n / 16) * 10000) / 10000}rem`;
  const color = (theme, mode, name) => theme.modes[mode].tokens[name].value;
  // The colors that have a dark twin in Bootstrap 5.3, from one mode.
  const modal = (mode) => {
    const v = (name) => color(root, mode, name);
    return [
      ['body-bg', v('bg.canvas')],
      ['body-color', v('fg.base')],
      ['body-emphasis-color', v('fg.base')],
      ['body-secondary-color', v('fg.base-muted')],
      ['body-secondary-bg', v('tint.base')],
      ['body-tertiary-color', v('fg.base-subtle')],
      ['body-tertiary-bg', v('bg.sunken')],
      ['border-color', v('border.base')],
      ['link-color', v('fg.action')],
    ];
  };
  // Each theme color, and its subtle colors for alerts, badges, and list groups.
  const themeColors = [['primary', root], ...['success', 'info', 'warning', 'danger'].filter((n) => built.themes[n]).map((n) => [n, atLevel(built.themes[n], more)])];
  const subtle = (mode) => themeColors.flatMap(([name, theme]) => [
    [`${name}-text-emphasis`, color(theme, mode, 'on-tint.action')],
    [`${name}-bg-subtle`, color(theme, mode, 'tint.action')],
    [`${name}-border-subtle`, color(theme, mode, 'tint.action-active')],
  ]);
  const light = [
    ...themeColors.map(([name, theme]) => [name, color(theme, 'light', 'fill.action')]),
    ['secondary', color(root, 'light', 'fg.base-muted')],
    ['light', root.palettes.base.steps[5]],
    ['dark', root.palettes.base.steps[90]],
    ...modal('light'),
    ...subtle('light'),
  ];
  const dark = [...modal('dark'), ...subtle('dark')].map(([k, v]) => [`${k}-dark`, v]);
  const fonts = [
    ['font-family-sans-serif', fontList(p.font.family.body)],
    ['font-family-monospace', fontList(p.font.family.mono)],
    ['headings-font-family', fontList(p.font.family.heading)],
    ['font-size-base', rem(p.font.size.md)],
    ['font-size-sm', rem(p.font.size.sm)],
    ['font-size-lg', rem(p.font.size.lg)],
    ...['3xl', '2xl', 'xl', 'lg', 'md', 'sm'].map((k, i) => [`h${i + 1}-font-size`, rem(p.font.size[k])]),
    ['font-weight-normal', p.font.weight.regular],
    ['font-weight-medium', p.font.weight.medium],
    ['font-weight-bold', p.font.weight.bold],
    ['line-height-base', p.font.lineHeight.body],
    ['headings-line-height', p.font.lineHeight.heading],
  ];
  // Bootstrap's spacers are 0.25, 0.5, 1, 1.5, and 3 times $spacer: themetron's xs to lg, and 2xl.
  const spacers = ['xs', 'sm', 'md', 'lg', '2xl'].map((k, i) => `${i + 1}: ${size(p.space[k])}`).join(', ');
  const shapes = [
    ['spacer', size(p.space.md)],
    ['spacers', `(0: 0, ${spacers})`],
    ['border-width', size(p.border.width)],
    ['border-radius-sm', size(p.radius.sm)],
    ['border-radius', size(p.radius.md)],
    ['border-radius-lg', size(p.radius.lg)],
    // Buttons and fields use the control radii, which are pills at full roundness.
    ['btn-border-radius-sm', size(p.radius.controlSm)],
    ['btn-border-radius', size(p.radius.control)],
    ['btn-border-radius-lg', size(p.radius.controlLg)],
    ['input-border-radius-sm', size(p.radius.controlSm)],
    ['input-border-radius', size(p.radius.control)],
    ['input-border-radius-lg', size(p.radius.controlLg)],
    ['input-btn-padding-y', size(p.control.paddingY)],
    ['input-btn-padding-x', size(p.control.paddingX)],
    ['input-btn-line-height', p.font.lineHeight.control],
    ['focus-ring-width', size(p.border.focus)],
    ['focus-ring-color', color(root, 'light', 'border.focus')],
    ['box-shadow-sm', root.modes.light.computed['elevation.1']],
    ['box-shadow', root.modes.light.computed['elevation.2']],
    ['box-shadow-lg', root.modes.light.computed['elevation.3']],
    ['box-shadow-inset', root.modes.light.computed['elevation.inset']],
  ];
  const decl = (entries) => entries.map(([k, v]) => `$${k}: ${v};`).join('\n');
  const font = fontImport(built);
  return [
    `// Bootstrap 5 Sass variables. ${madeBy(set)}`,
    '// Put this file before Bootstrap:',
    '// @import "themetron"; @import "bootstrap/scss/bootstrap";',
    '// Sass variables are fixed when Sass compiles, so these are the root theme\'s light-mode values.',
    '// The *-dark variables (Bootstrap 5.3) hold its dark-mode values, for data-bs-theme="dark".',
    more
      ? '// These are the more-contrast values, for a second build that loads with media="(prefers-contrast: more)".'
      : '// For more contrast, make a second build: https://github.com/method-run/idk-themetron/blob/main/spec/tokens.md#more-contrast-with-bootstrap-sass',
    font ? `\n@import url("${font}");` : '',
    '\n// Colors',
    decl(light),
    '\n// Colors in dark mode',
    decl(dark),
    '\n// Type',
    decl(fonts),
    '\n// Space, shape, and depth',
    decl(shapes),
    '',
  ].join('\n');
}

// The status themes that the framework exports read, by the framework's own name: a theme named
// danger (or error) gives the error color, and so on. A status without a theme is left out, so
// the framework keeps its own color, unless the format needs every color.
const STATUSES = { error: ['danger', 'error'], warning: ['warning'], success: ['success'], info: ['info'] };
const statusThemes = (built) => Object.fromEntries(Object.entries(STATUSES).map(([status, names]) => [status, built.themes[names.find((n) => built.themes[n])]]).filter(([, theme]) => theme));

// "#rrggbb" as "r, g, b", for the -rgb variables of Bootstrap.
const rgbList = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');

// A Material UI theme, for createTheme(). One theme in both modes, as colorSchemes (MUI v6 and
// later). Values are plain colors, not CSS variables, because MUI works out lighter and darker
// shades from them. `theme` picks the theme, the root theme by default. The status colors come
// from the themes named danger (or error), warning, success, and info. MUI has one list of 25
// shadows for both modes, so it gets the light-mode shadows. MUI components use the low
// elevations for resting parts (Paper and Card 1, a contained Button 2), the middle ones for
// raised parts (a hovered Button 4, a Menu 8), and the high ones for overlays (a Dialog 24), so
// these map to themetron's elevation 1, 2, and 3. `more: true` gives the more-contrast theme.
// A palette cannot hold a media query, so the app picks it, for example with
// useMediaQuery('(prefers-contrast: more)').
export function toMui(built, { theme: name = ROOT, more = false } = {}) {
  if (!built.themes[name]) throw new Error(`There is no theme named ${name}.`);
  const theme = atLevel(built.themes[name], more);
  const p = theme.primitives;
  const statuses = statusThemes(built);
  const palette = (mode) => {
    const v = (token, from = theme) => atLevel(from, more).modes[mode].tokens[token].value;
    return {
      mode,
      primary: { main: v('fill.action'), contrastText: v('on-fill.action') },
      secondary: { main: v('tint.action'), contrastText: v('on-tint.action') },
      ...Object.fromEntries(Object.entries(statuses).map(([status, t]) => [status, { main: v('fill.action', t), contrastText: v('on-fill.action', t) }])),
      background: { default: v('bg.canvas'), paper: v('bg.surface') },
      text: { primary: v('fg.base'), secondary: v('fg.base-muted'), disabled: v('fg.base-subtle') },
      divider: v('border.base'),
    };
  };
  const heading = { fontFamily: fontList(p.font.family.heading) };
  const elevation = (level) => theme.modes.light.computed[`elevation.${level}`];
  const shadows = Array.from({ length: 25 }, (_, i) => (i === 0 ? 'none' : elevation(i <= 2 ? 1 : i <= 8 ? 2 : 3)));
  return {
    colorSchemes: { light: { palette: palette('light') }, dark: { palette: palette('dark') } },
    shape: { borderRadius: p.radius.md },
    shadows,
    typography: {
      fontFamily: fontList(p.font.family.body),
      fontSize: p.font.size.md,
      fontWeightRegular: p.font.weight.regular,
      fontWeightMedium: p.font.weight.medium,
      fontWeightBold: p.font.weight.bold,
      ...Object.fromEntries(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((h) => [h, heading])),
    },
  };
}

// daisyUI 5 themes, for a Tailwind CSS v4 stylesheet: "themetron", the default, and
// "themetron-dark", for a dark system setting. Like toTailwind, the colors point at themetron
// CSS variables, so use it with the output of toCss. The two themes differ only in their
// color-scheme, and light-dark() in each variable picks the mode. A custom property takes the
// value of a variable where it is set, so the child theme classes set the daisyUI colors again.
// The status colors are the fills of the status themes in both modes. A status without a theme
// gets the action fill, because daisyUI needs every color.
export function toDaisyui(built, { prefix = 'tm', classPrefix = 'theme-', set, name = setSlug(set) || 'themetron' } = {}) {
  const p = built.themes[ROOT].primitives;
  const v = (token) => `var(--${prefix}-${cssName(token)})`;
  const colors = {
    'base-100': v('bg.surface'),
    'base-200': v('bg.canvas'),
    'base-300': v('bg.sunken'),
    'base-content': v('fg.base'),
    primary: v('fill.action'),
    'primary-content': v('on-fill.action'),
    secondary: v('tint.action'),
    'secondary-content': v('on-tint.action'),
    accent: v('fill.action-exact'),
    'accent-content': v('on-fill.action-exact'),
    neutral: v('fg.base'),
    'neutral-content': v('bg.canvas'),
  };
  const statuses = statusThemes(built);
  for (const status of Object.keys(STATUSES)) {
    const t = statuses[status];
    const both = (token) => bothModes(t.modes.light.tokens[token].value, t.modes.dark.tokens[token].value);
    colors[status] = t ? both('fill.action') : v('fill.action');
    colors[`${status}-content`] = t ? both('on-fill.action') : v('on-fill.action');
  }
  const rest = {
    'radius-selector': v('radius.sm'),
    'radius-field': v('radius.control'),
    'radius-box': v('radius.lg'),
    // daisyUI makes a field ten times this high. The selector size stays daisyUI's own.
    'size-selector': '0.25rem',
    'size-field': px(round1(p.control.height / 10)),
    border: v('border-width'),
    depth: p.shininess > 0 ? '1' : '0',
    noise: '0',
  };
  const decls = (entries) => entries.map(([k, val]) => `  --${k}: ${val};`).join('\n');
  const colorEntries = Object.entries(colors).map(([k, val]) => [`color-${k}`, val]);
  const plugin = (themeName, mode) => `@plugin "daisyui/theme" {\n  name: "${themeName}";\n  default: ${mode === 'light'};\n  prefersdark: ${mode === 'dark'};\n  color-scheme: ${mode};\n${decls([...colorEntries, ...Object.entries(rest)])}\n}\n`;
  const own = colorEntries.filter(([, val]) => val.startsWith('var('));
  const children = built.order.slice(1).map((n) => `.${classPrefix}${n}`);
  return [
    `/* ${madeBy(set)} */`,
    '@import "tailwindcss";',
    '@plugin "daisyui";\n',
    '/* Add the themetron CSS too: these values point at its variables. */',
    plugin(name, 'light'),
    plugin(`${name}-dark`, 'dark'),
    ...(children.length ? ['/* Each theme class sets the colors again, from its own variables. */', `${children.join(', ')} {\n${decls(own)}\n}\n`] : []),
  ].join('\n');
}

// Bootstrap 5.3 CSS variables, for a page that loads Bootstrap's compiled CSS. For Bootstrap's
// Sass, see toBootstrapSass. :root holds the root theme's light values, and
// [data-bs-theme=dark] its dark values. Each child theme gets a rule on its class too. The
// values are plain colors, because Bootstrap's -rgb variables need the numbers. The status
// colors come from the themes named danger, warning, success, and info. Bootstrap's own CSS
// sets the colors of components such as .btn-primary from Sass, so these variables change
// only the parts that read them: the body, links, borders, utilities, and the like. So this
// also sets the variables of the solid and outline buttons, for primary, secondary, and each
// status with a theme. Each theme rule sets helper variables (--tm-bs-*) for the label and the
// hover and press colors, and one rule for each button reads them, so a theme class or dark mode
// changes the buttons inside it too. Primary and the statuses use the action fill, and
// secondary uses the quiet button.
export function toBootstrapCss(built, { classPrefix = 'theme-', set } = {}) {
  const statuses = statusThemes(built);
  const colors = (theme, mode, more) => {
    const out = {};
    const v = (token, from = theme) => atLevel(from, more).modes[mode].tokens[token].value;
    const color = (k, value) => { out[k] = value; out[`${k}-rgb`] = rgbList(value); };
    // One theme color with its subtle forms: the fill, and the tint for alerts and badges.
    // The colors of a solid button and its states, for the button rules below.
    const button = (k, fill, t) => {
      for (const [name, token] of [['', fill], ['-hover', `${fill}-hover`], ['-active', `${fill}-active`]]) {
        out[`--tm-bs-${k}${name}`] = v(token, t);
        out[`--tm-bs-${k}${name}-on`] = v(`on-${token}`, t);
      }
    };
    const role = (k, t) => {
      color(k, v('fill.action', t));
      out[`${k}-text-emphasis`] = v('on-tint.action', t);
      out[`${k}-bg-subtle`] = v('tint.action', t);
      out[`${k}-border-subtle`] = v('border.action', t);
      button(k, 'fill.action', t);
      out[`--tm-bs-${k}-text`] = v('fg.action', t);
      out[`--tm-bs-${k}-border`] = v('border.action', t);
    };
    role('primary', theme);
    for (const [status, t] of Object.entries(statuses)) role(status === 'error' ? 'danger' : status, t);
    color('secondary', v('fg.base-muted'));
    button('secondary', 'fill.quiet', theme);
    out['--tm-bs-secondary-text'] = v('fg.base');
    out['--tm-bs-secondary-border'] = v('border.base-strong');
    color('body-color', v('fg.base'));
    color('body-bg', v('bg.canvas'));
    color('emphasis-color', v('fg.base'));
    color('secondary-color', v('fg.base-muted'));
    color('secondary-bg', v('bg.sunken'));
    color('tertiary-color', v('fg.base-subtle'));
    color('tertiary-bg', v('bg.surface'));
    color('link-color', v('fg.action'));
    color('link-hover-color', v('fg.action'));
    out['border-color'] = v('border.base');
    out['focus-ring-color'] = v('border.focus');
    return out;
  };
  const rest = (theme, mode, more) => {
    const c = atLevel(theme, more).modes[mode].computed;
    return { 'box-shadow-sm': c['elevation.1'], 'box-shadow': c['elevation.2'], 'box-shadow-lg': c['elevation.3'] };
  };
  const root = built.themes[ROOT];
  const p = root.primitives;
  const shared = {
    'font-sans-serif': fontList(p.font.family.body),
    'font-monospace': fontList(p.font.family.mono),
    'body-font-family': fontList(p.font.family.body),
    'body-font-size': px(p.font.size.md),
    'body-font-weight': String(p.font.weight.regular),
    'body-line-height': String(p.font.lineHeight.body),
    'border-width': px(p.border.width),
    'border-radius-sm': px(p.radius.sm),
    'border-radius': px(p.radius.md),
    'border-radius-lg': px(p.radius.lg),
    'focus-ring-width': px(p.border.focus),
    'focus-ring-opacity': '1',
  };
  // Names that start with -- are whole. The rest are Bootstrap's, after --bs-.
  const block = (selector, entries) => `${selector} {\n${Object.entries(entries).map(([k, val]) => `  ${k.startsWith('--') ? k : `--bs-${k}`}: ${val};`).join('\n')}\n}\n`;
  // The solid and the outline button of each role, from the helper variables. The outline
  // button fills in on hover and press, like Bootstrap's.
  const buttons = (k) => {
    const h = (name) => `var(--tm-bs-${k}${name})`;
    const pressed = { 'btn-active-color': h('-active-on'), 'btn-active-bg': h('-active'), 'btn-active-border-color': h('-active') };
    return [
      block(`.btn-${k}`, {
        'btn-color': h('-on'), 'btn-bg': h(''), 'btn-border-color': h(''),
        'btn-hover-color': h('-hover-on'), 'btn-hover-bg': h('-hover'), 'btn-hover-border-color': h('-hover'),
        'btn-focus-shadow-rgb': `var(--bs-${k}-rgb)`, ...pressed,
        'btn-disabled-color': h('-on'), 'btn-disabled-bg': h(''), 'btn-disabled-border-color': h(''),
      }),
      block(`.btn-outline-${k}`, {
        'btn-color': h('-text'), 'btn-border-color': h('-border'),
        'btn-hover-color': h('-on'), 'btn-hover-bg': h(''), 'btn-hover-border-color': h(''),
        'btn-focus-shadow-rgb': `var(--bs-${k}-rgb)`, ...pressed,
        'btn-disabled-color': h('-text'), 'btn-disabled-bg': 'transparent', 'btn-disabled-border-color': h('-border'),
      }),
    ];
  };
  const roles = ['primary', 'secondary', ...Object.keys(statuses).map((status) => (status === 'error' ? 'danger' : status))];
  const both = (selector, make) => [selector, make(false), make(true)];
  const pairs = [
    both(':root, [data-bs-theme=light]', (more) => ({ ...shared, ...colors(root, 'light', more), ...rest(root, 'light', more) })),
    both('[data-bs-theme=dark]', (more) => ({ ...colors(root, 'dark', more), ...rest(root, 'dark', more) })),
    ...built.order.slice(1).flatMap((name) => [
      both(`.${classPrefix}${name}`, (more) => colors(built.themes[name], 'light', more)),
      both(`[data-bs-theme=dark] .${classPrefix}${name}, .${classPrefix}${name}[data-bs-theme=dark]`, (more) => colors(built.themes[name], 'dark', more)),
    ]),
  ];
  const out = [`/* Bootstrap 5.3 CSS variables. Load after bootstrap.css. ${madeBy(set)} */\n`, ...withMoreContrast(pairs, block)];
  out.push('/* Buttons. Bootstrap sets their colors from Sass, so these rules set them again. */\n', ...roles.flatMap(buttons));
  return out.join('\n');
}
