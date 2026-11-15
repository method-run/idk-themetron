// The human-friendly inputs: a tree of themes. Check them, fill in defaults, and
// work out each theme's full settings from its parents.
import { isHex, parseHex, toHex } from './color.js';

// Each feel is a number from 0 to 1. A word from `stops` can stand for its number.
// The label is the short name people see. The order is the order that the playground shows.
export const FEELS = {
  roundness: { label: 'Round', default: 0.35, stops: { square: 0, slight: 0.25, rounded: 0.5, round: 0.75, pill: 1 } },
  spaciousness: { label: 'Space', default: 0.5, stops: { compact: 0, cozy: 0.25, comfortable: 0.5, relaxed: 0.75, spacious: 1 } },
  depth: { label: 'Depth', default: 0.3, stops: { flat: 0, low: 0.33, raised: 0.67, floating: 1 } },
  softness: { label: 'Soft', default: 0.5, stops: { hard: 0, crisp: 0.33, soft: 0.67, pillowy: 1 } },
  thinness: { label: 'Thin', default: 0.8, stops: { chunky: 0, heavy: 0.25, regular: 0.5, hairline: 0.8, none: 1 } },
  shininess: { label: 'Shine', default: 0, stops: { matte: 0, satin: 0.33, plastic: 0.67, glassy: 1 } },
  clarity: { label: 'Clear', default: 0, stops: { solid: 0, tinted: 0.33, frosted: 0.67, clear: 1 } },
};
// Old feels that came back the other way round: solidity is now clarity, and thickness is now
// thinness. Old inputs that set them still load: the value turns over (1 - value), and the old
// words still work. The new name wins when a theme sets both.
const TURNED_FEELS = {
  solidity: { to: 'clarity', stops: { clear: 0, frosted: 0.33, tinted: 0.67, solid: 1 } },
  thickness: { to: 'thinness', stops: { none: 0, hairline: 0.25, regular: 0.5, heavy: 0.75, chunky: 1 } },
};
const turn = (n) => Math.round((1 - n) * 100) / 100;
// A feel object with the old feels moved to their new names, for tools that keep raw inputs,
// such as the playground. Words and "inherit" carry over; a value it cannot read stays under
// the old name, so the engine reports it.
export function turnOldFeels(feel) {
  if (!feel || typeof feel !== 'object') return feel;
  let out = feel;
  for (const [old, { to, stops }] of Object.entries(TURNED_FEELS)) {
    if (!(old in out)) continue;
    const { [old]: raw, ...rest } = out;
    const n = raw === INHERIT ? INHERIT : typeof raw === 'string' ? stops[raw] : raw;
    if (to in rest) out = rest;
    else if (n === INHERIT) out = { ...rest, [to]: INHERIT };
    else if (typeof n === 'number' && n >= 0 && n <= 1) out = { ...rest, [to]: turn(n) };
  }
  return out;
}
// Typography: how fast text grows above body size, from 0 to 1. Not a feel: it sits with the
// fonts, and presets do not set it. A word from `stops` can stand for its number.
export const TYPE_VARIANCE = { label: 'Type variance', default: 0.5, stops: { flat: 0, gentle: 0.25, classic: 0.5, bold: 0.75, dramatic: 1 } };
// Feels that are gone for now. Old inputs that set them still load: the engine skips them.
export const REMOVED_FEELS = ['bounciness', 'snappiness', 'tone'];

// A preset is a set of feels with a familiar name. A theme's own feels override it.
export const PRESETS = {
  balanced: { label: 'Balanced', feel: {} },
  flat: { label: 'Flat', feel: { thinness: 0.8, roundness: 0.2, depth: 0, softness: 0.5, shininess: 0 } },
  material: { label: 'Material', feel: { thinness: 1, roundness: 0.25, depth: 0.5, softness: 0.7, shininess: 0 } },
  brutalist: { label: 'Brutalist', feel: { thinness: 0.25, spaciousness: 0.4, roundness: 0, depth: 0.5, softness: 0, shininess: 0 } },
  neumorphic: { label: 'Neumorphic', feel: { thinness: 1, roundness: 0.6, depth: 0.7, softness: 1, shininess: 0, clarity: 0.7 } },
  glass: { label: 'Glass', feel: { thinness: 0.8, roundness: 0.6, depth: 1, softness: 0.85, shininess: 1, clarity: 1 } },
  glossy: { label: 'Glossy', feel: { thinness: 0.8, roundness: 1, depth: 0.5, softness: 0.6, shininess: 1 } },
  playful: { label: 'Playful', feel: { thinness: 0.6, spaciousness: 0.65, roundness: 0.9, depth: 0.45, softness: 0.3 } },
  dense: { label: 'Dense', feel: { thinness: 0.8, spaciousness: 0, roundness: 0.15, depth: 0.15, softness: 0.5 } },
};

export const ROOT = 'default';
// A feel set to this takes the parent's value, even when the theme has a preset.
export const INHERIT = 'inherit';
export const THEME_FIELDS = ['parent', 'label', 'base', 'action', 'color', 'font', 'headingFont', 'monoFont', 'typeVariance', 'preset', 'feel', 'contrast'];
export const FONT_FIELDS = ['font', 'headingFont', 'monoFont'];
// APCA keeps the WCAG 2 minimums as a floor, so it is always at least as strict.
export const CONTRAST_METHODS = ['wcag', 'apca'];
// The color model that a ramp keeps its hue and chroma in.
export const CONTRAST_MODELS = ['oklch', 'hsl'];
export const CONTRAST_LEVELS = ['standard', 'enhanced'];

// A theme has one color for each role. Base: backgrounds, text, borders, and quiet controls.
// Action: the parts that you act on, or that show their state: links, buttons, checks, focus.
// `color` sets both roles. A role that a theme does not set comes from its parent.
export const ROLES = ['base', 'action'];
// Fields that change only colors. A theme that sets no other field is a color theme.
// A label is only for people, so it does not make a theme a full theme either.
const COLOR_FIELDS = ['parent', 'label', 'color', ...ROLES];
// Old fields that the engine skips without a message.
const IGNORED = ['fillLabel'];
// Fields that version 2 does not have, and what to do instead.
const REMOVED = {
  neutral: 'renamed to "base" in version 2 of the inputs. Or add "version": 1 to the file.',
};

// The root theme's values for the fields that it does not set.
export const ROOT_DEFAULTS = {
  base: '#808080',
  action: '#0000ee', // The color that browsers use for links.
  // The browser's own default fonts. A theme adds a web font only when it names one.
  font: { family: null, fallback: 'sans-serif' },
  monoFont: { family: null, fallback: 'monospace' },
  typeVariance: TYPE_VARIANCE.default,
  preset: 'balanced',
  contrast: { method: 'wcag', level: 'standard', model: 'oklch' },
};

// A theme's name is its ID: the class theme-<name>, its DTCG group, and what `parent` points at.
// Its label, if any, is what people see.
export const THEME_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// The label of a theme that has none: its name as words, with a capital first letter.
// "warning" is "Warning", "big-sale" is "Big sale", and the root, "default", is "Default".
export function defaultLabel(name) {
  const words = name.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// A valid theme name from any text: lowercase, with single hyphens. "Big Sale!" becomes "big-sale".
// Returns "" when nothing is left.
export function themeName(text) {
  return String(text).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^[^a-z]+|-+$/g, '');
}
// The version of the inputs format. An inputs file can say which version it uses.
// Version 1 had `neutral` for base, and `color` for action only.
export const INPUTS_VERSION = 2;

export class InputError extends Error {}

// Returns { themes, order, resolved }:
// - themes: each theme's own fields, checked, with words turned into numbers.
// - order: the theme names as a tree, depth first: each theme, then its children.
// - resolved: each theme's full settings, with `kind`: "color" if it sets only its color, else "full".
// Throws InputError with one line for each problem.
export function normalizeInputs(raw = {}) {
  const problems = [];
  const fail = (msg) => problems.push(msg);

  for (const key of Object.keys(raw)) {
    if (!['themes', 'version', '$schema'].includes(key)) fail(`${key}: unknown field. Use "themes", and optionally "version" and "$schema". See the Inputs spec.`);
  }
  if ('version' in raw && raw.version !== INPUTS_VERSION && raw.version !== 1) fail(`version: this themetron reads versions 1 and ${INPUTS_VERSION} of the inputs, not ${JSON.stringify(raw.version)}.`);
  const given = raw.version === 1 ? fromVersion1(raw.themes) : raw.themes ?? {};
  if (typeof given !== 'object' || Array.isArray(given)) fail('themes: use an object that maps theme names to themes.');
  const all = { [ROOT]: {}, ...(typeof given === 'object' && !Array.isArray(given) ? given : {}) };

  const themes = {};
  for (const [name, t] of Object.entries(all)) {
    const at = `themes.${name}`;
    if (!THEME_NAME.test(name)) {
      const fix = themeName(name);
      fail(`${at}: a theme name uses lowercase letters, digits, and single hyphens, and starts with a letter.${fix ? ` Use "${fix}", with "label": ${JSON.stringify(name)} to keep the text that people see.` : ''}`);
      continue;
    }
    if (t === null || typeof t !== 'object' || Array.isArray(t)) { fail(`${at}: use an object.`); continue; }
    // fillLabel is gone: every fill has light labels in light mode. Old inputs still load, without it.
    for (const key of Object.keys(t)) if (!THEME_FIELDS.includes(key) && !IGNORED.includes(key)) fail(`${at}.${key}: ${REMOVED[key] ?? `unknown field. Use one of: ${THEME_FIELDS.join(', ')}.`}`);

    const own = {};
    if (name === ROOT) {
      if (t.parent !== undefined) fail(`${at}.parent: the ${ROOT} theme is the root, so it has no parent.`);
    } else if (t.parent === undefined) {
      fail(`${at}.parent: every theme but ${ROOT} needs a parent, such as "${ROOT}".`);
    } else if (typeof t.parent !== 'string' || !Object.hasOwn(all, t.parent)) {
      fail(`${at}.parent: no theme is named "${t.parent}".`);
    } else {
      own.parent = t.parent;
    }
    if ('label' in t) {
      if (typeof t.label === 'string' && t.label.trim()) own.label = t.label.trim();
      else fail(`${at}.label: use text, such as "Big Sale".`);
    }
    if ('color' in t) own.color = hexField(t.color, `${at}.color`, fail);
    if ('action' in t) own.action = roleField(t.action, `${at}.action`, fail);
    if ('base' in t) own.base = roleField(t.base, `${at}.base`, fail);
    for (const field of FONT_FIELDS) if (field in t) own[field] = fontField(t[field], `${at}.${field}`, field, fail);
    if ('preset' in t) {
      if (PRESETS[t.preset]) own.preset = t.preset;
      else fail(`${at}.preset: unknown preset "${t.preset}". Use one of: ${Object.keys(PRESETS).join(', ')}.`);
    }
    if ('typeVariance' in t) own.typeVariance = varianceField(t.typeVariance, `${at}.typeVariance`, fail);
    // Type variance was a feel for a short while. A saved playground can still have it there.
    else if (t.feel?.variance !== undefined && t.feel.variance !== INHERIT) own.typeVariance = varianceField(t.feel.variance, `${at}.feel.variance`, fail);
    if ('feel' in t) own.feel = feelField(t.feel, `${at}.feel`, fail);
    if ('contrast' in t) own.contrast = contrastField(t.contrast, `${at}.contrast`, fail);
    themes[name] = own;
  }

  // Parents must not make a loop.
  for (const name of Object.keys(themes)) {
    const seen = [name];
    let p = themes[name].parent;
    while (p && themes[p] && !seen.includes(p)) { seen.push(p); p = themes[p].parent; }
    if (p && seen.includes(p) && p === name) fail(`themes.${name}.parent: the parents make a loop: ${[...seen, p].join(' → ')}.`);
  }
  if (problems.length) throw new InputError(problems.join('\n'));

  // Depth first from the root: each theme, then its children. Parents come before
  // children, which the CSS needs, and each family stays together.
  const order = [];
  const visit = (name) => {
    if (order.includes(name)) return;
    order.push(name);
    for (const [child, t] of Object.entries(themes)) if (t.parent === name) visit(child);
  };
  visit(ROOT);

  const resolved = {};
  for (const name of order) resolved[name] = resolveTheme(name, themes[name], resolved[themes[name].parent]);
  return { themes, order, resolved };
}

// A theme's full settings: its own fields over its parent's.
function resolveTheme(name, own, parent) {
  const from = parent ?? { ...ROOT_DEFAULTS, headingFont: ROOT_DEFAULTS.font, feel: {} };
  const preset = own.preset ?? from.preset;
  // Each feel: the theme's own value, else its preset's value, else the parent's value.
  // "inherit" skips the preset, so a child can take a preset but keep, say, its parent's sizes.
  const inherited = parent ? from.feel : { ...featureDefaults(), ...PRESETS[preset].feel };
  const fromPreset = own.preset ? { ...featureDefaults(), ...PRESETS[own.preset].feel } : inherited;
  const feel = {};
  for (const k of Object.keys(FEELS)) {
    const mine = own.feel?.[k];
    feel[k] = mine === INHERIT ? inherited[k] : mine ?? fromPreset[k];
  }
  const onlyColor = Object.keys(own).every((k) => COLOR_FIELDS.includes(k));
  return {
    name,
    parent: own.parent ?? null,
    // Not inherited: each theme has its own label, or one made from its name.
    label: own.label ?? defaultLabel(name),
    kind: parent && onlyColor ? 'color' : 'full',
    base: own.base ?? own.color ?? from.base,
    action: own.action ?? own.color ?? from.action,
    font: own.font ?? from.font,
    // The heading font follows the nearest theme that sets either font.
    headingFont: own.headingFont ?? own.font ?? from.headingFont,
    monoFont: own.monoFont ?? from.monoFont,
    typeVariance: own.typeVariance ?? from.typeVariance,
    preset,
    feel,
    contrast: { ...from.contrast, ...own.contrast },
  };
}

const featureDefaults = () => Object.fromEntries(Object.entries(FEELS).map(([k, spec]) => [k, spec.default]));

function hexField(value, at, fail) {
  if (isHex(value)) return toHex(parseHex(value));
  fail(`${at}: "${value}" is not a hex color, such as #1e66f5.`);
  return undefined;
}

// Version 1 inputs in version 2 terms: `neutral` is base, `color` is action only, and
// `fillLabel` goes away: every fill now has light labels in light mode.
function fromVersion1(themes) {
  if (!themes || typeof themes !== 'object' || Array.isArray(themes)) return themes;
  return Object.fromEntries(Object.entries(themes).map(([name, t]) => {
    if (!t || typeof t !== 'object' || Array.isArray(t)) return [name, t];
    const { neutral, color, fillLabel, ...rest } = t;
    return [name, { ...rest, ...(neutral !== undefined && { base: neutral }), ...(color !== undefined && { action: color }) }];
  }));
}

function roleField(value, at, fail) {
  if (typeof value === 'string') return hexField(value, at, fail);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key === 'white' || key === 'black') fail(`${at}.${key}: white and black limits are not ready yet. See the plan.`);
      else if (key !== 'color') fail(`${at}.${key}: unknown field. Use "color".`);
    }
    return value.color === undefined ? undefined : hexField(value.color, `${at}.color`, fail);
  }
  fail(`${at}: use a hex color, or { "color": "#808080" }.`);
  return undefined;
}

function fontField(value, at, field, fail) {
  const font = typeof value === 'string' ? { family: value } : value;
  if (!font || typeof font !== 'object') { fail(`${at}: use a family name, or { "family", "fallback" }.`); return undefined; }
  for (const key of Object.keys(font)) if (key !== 'family' && key !== 'fallback') fail(`${at}.${key}: unknown field. Use "family" and "fallback".`);
  const fallback = font.fallback || (field === 'monoFont' ? ROOT_DEFAULTS.monoFont.fallback : ROOT_DEFAULTS.font.fallback);
  return { family: font.family ? String(font.family).trim() || null : null, fallback };
}

function feelField(value, at, fail) {
  const out = {};
  if (!value || typeof value !== 'object') { fail(`${at}: use an object of feels.`); return out; }
  for (const [given, raw] of Object.entries(value)) {
    if (REMOVED_FEELS.includes(given) || given === 'variance') continue;
    const old = TURNED_FEELS[given];
    if (old && old.to in value) continue;
    const name = old?.to ?? given;
    const spec = FEELS[name];
    if (!spec) { fail(`${at}.${given}: unknown feel. Use one of: ${Object.keys(FEELS).join(', ')}.`); continue; }
    const stops = old?.stops ?? spec.stops;
    let n = raw;
    if (n === INHERIT) { out[name] = INHERIT; continue; }
    if (typeof n === 'string') {
      if (stops[n] === undefined) { fail(`${at}.${given}: unknown word "${n}". Use a number from 0 to 1, "inherit", or one of: ${Object.keys(stops).join(', ')}.`); continue; }
      n = stops[n];
    }
    if (typeof n !== 'number' || !(n >= 0 && n <= 1)) { fail(`${at}.${given}: use a number from 0 to 1.`); continue; }
    out[name] = old ? turn(n) : n;
  }
  return out;
}

function contrastField(value, at, fail) {
  const out = {};
  if (!value || typeof value !== 'object') { fail(`${at}: use { "method", "model" }.`); return out; }
  if ('method' in value) {
    if (CONTRAST_METHODS.includes(value.method)) out.method = value.method;
    else fail(`${at}.method: use one of: ${CONTRAST_METHODS.join(', ')}.`);
  }
  // `level` is gone: every theme ships the standard level, and the enhanced level as its
  // more-contrast variant. Old inputs still load: the engine skips it.
  if ('model' in value) {
    if (CONTRAST_MODELS.includes(value.model)) out.model = value.model;
    else fail(`${at}.model: use one of: ${CONTRAST_MODELS.join(', ')}.`);
  }
  for (const key of Object.keys(value)) if (!['method', 'level', 'model'].includes(key)) fail(`${at}.${key}: unknown field. Use "method" and "model".`);
  return out;
}

// The type variance: a number from 0 to 1, or one of its words.
function varianceField(raw, at, fail) {
  const n = typeof raw === 'string' ? TYPE_VARIANCE.stops[raw] : raw;
  if (typeof n === 'number' && n >= 0 && n <= 1) return n;
  fail(`${at}: use a number from 0 to 1, or one of: ${Object.keys(TYPE_VARIANCE.stops).join(', ')}.`);
  return undefined;
}

// The word nearest to a value: of a feel, or of the type variance ("typeVariance").
export function feelWord(name, value) {
  const stops = Object.entries((name === 'typeVariance' ? TYPE_VARIANCE : FEELS[name]).stops);
  return stops.reduce((best, s) => (Math.abs(s[1] - value) < Math.abs(best[1] - value) ? s : best))[0];
}
