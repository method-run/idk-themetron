// The contracts that other tools build on: the token manifest (every CSS token, its type, and
// whether it is stable) and the JSON Schema of the inputs. Both are made from the code, and
// `npm run spec` writes them to spec/. A test fails when the files and the code differ.
import { buildThemes } from './tokens.js';
import { primitiveEntries, semanticEntries } from './export.js';
import { FEELS, REMOVED_FEELS, PRESETS, ROOT, ROLES, INHERIT, CONTRAST_METHODS, CONTRAST_MODELS, INPUTS_VERSION, THEME_NAME } from './inputs.js';

// The version of the token contract. It is not the package version.
// Major: a stable token is removed or renamed, or its type or meaning changes.
// Minor: a token is added, or an experimental token becomes stable.
// Patch: values change, but names, types, and meanings stay the same.
export const CONTRACT_VERSION = '0.4.0';

// Stable tokens keep their name, type, and meaning within a major version of the contract.
// Every other token is experimental: it can change or go away in any version.
const STABLE = [
  /^bg-(canvas|surface|sunken|field)$/,
  /^fg-base(-muted|-subtle)?$/,
  /^border-base(-strong)?$/, /^border-focus$/,
  /^(base|action)-\d+$/, /^gap-/,
  /^font-(body|heading|mono)$/,
  /^font-size-/, /^font-weight-/, /^leading-/, /^rhythm$/, /^space-/,
  /^control-/, /^radius-/, /^border-width$/, /^focus-width$/,
  /^elevation-/,
];

// What each semantic color token is for. Names end with their role: base or action.
const MEANING = {
  'bg-canvas': 'The page background.',
  'bg-surface': 'Cards, menus, and other surfaces on the canvas.',
  'bg-sunken': 'Wells, code blocks, and tracks below the canvas.',
  'bg-field': 'The inside of text fields and other inputs.',
  'fg-base': 'Body text and headings. Passes the text contrast on every background.',
  'fg-base-muted': 'Secondary text. Passes the text contrast on every background.',
  'fg-base-subtle': 'Placeholders and other hints. Passes the control contrast only.',
  'border-base': 'Dividers and the edges of surfaces. Decoration only.',
  'border-base-strong': 'The edges of fields and controls. Passes the control contrast.',
  'border-focus': 'Focus rings. The same as border-action.',
  'fill-base': 'Quiet solid fills, such as a solid button that is not the main action.',
  'fill-base-hover': 'A quiet solid fill on hover.',
  'fill-base-active': 'A quiet solid fill while it is pressed.',
  'on-fill-base': 'Text and icons on fill-base and its hover and active forms.',
  'tint-base': 'Quiet soft fills, such as secondary buttons and tags. They show on the canvas and on surfaces.',
  'tint-base-hover': 'A quiet soft fill on hover.',
  'on-tint-base': 'Text and icons on tint-base.',
  'fg-action': 'Links, and other text that you act on. Passes the text contrast on every background.',
  'border-action': 'The edges of parts that you act on, such as outline buttons. Passes the control contrast.',
  'fill-action': 'Solid fills that you act on, such as primary buttons, checked boxes, and switches.',
  'fill-action-hover': 'An action fill on hover.',
  'fill-action-active': 'An action fill while it is pressed.',
  'on-fill-action': 'Text and icons on fill-action and its hover and active forms.',
  'tint-action': 'Soft fills that you act on, or that show a state: soft buttons, selected rows, badges.',
  'tint-action-hover': 'An action tint on hover.',
  'on-tint-action': 'Text and icons on tint-action.',
  'fill-action-exact': 'The exact button: the darker of the key color and its partner (the lightest or darkest base color) in light mode, and the lighter in dark mode.',
  'on-fill-action-exact': 'The label of the exact button: the other color of the pair. Not a guaranteed pair: the audit warns where it fails.',
  'border-action-exact': 'The edge of the exact button: the key color, or border-base when the key color does not stand out from the canvas.',
};

// The color pairs that pass the theme's contrast setting, in both modes. "text" pairs pass
// for body text, and "ui" pairs pass for controls and their edges (3:1 in WCAG 2). When no
// grade can pass, the engine uses the closest one and the audit says so.
const BGS = ['bg-canvas', 'bg-surface', 'bg-sunken', 'bg-field'];
export const PAIRS = [
  { fg: ['fg-base', 'fg-base-muted', 'fg-action'], bg: BGS, purpose: 'text' },
  { fg: ['fg-base-subtle', 'border-base-strong', 'border-action'], bg: BGS, purpose: 'ui' },
  // A solid fill stands out from the canvas, so a button's shape shows.
  { fg: ['fill-base', 'fill-action'], bg: ['bg-canvas'], purpose: 'ui' },
  ...ROLES.flatMap((role) => [
    { fg: [`on-fill-${role}`], bg: [`fill-${role}`, `fill-${role}-hover`], purpose: 'text' },
    { fg: [`on-tint-${role}`], bg: [`tint-${role}`, `tint-${role}-hover`], purpose: 'text' },
  ]),
];

// The role of a token, from its name: "base", "action", or none.
const roleOf = (name) => (/(^|-)action(-|$)|^border-focus$/.test(name) ? 'action' : /(^|-)base(-|$)|^bg-|^panel-border$/.test(name) ? 'base' : undefined);

// The type of a token, from its CSS value. The names match DTCG types where one fits.
function typeOf(value) {
  if (/^(inset )?-?[\d.]+(px)? -?[\d.]+(px)? /.test(value)) return 'shadow';
  if (/^-?[\d.]+px$/.test(value)) return 'dimension';
  if (/^[\d.]+ms$/.test(value)) return 'duration';
  if (/^cubic-bezier\(/.test(value)) return 'cubicBezier';
  if (/^-?[\d.]+$/.test(value)) return 'number';
  if (/gradient\(/.test(value) || value === 'none') return 'gradient';
  if (/^(#|light-dark\(|var\(|rgba?\()/.test(value)) return 'color';
  return 'fontFamily';
}

// Every token of the contract. Every theme class sets all of them.
export function tokenManifest() {
  const root = buildThemes({}).themes[ROOT];
  const prims = primitiveEntries(root.primitives).map(([name, value]) => [name, value, 'primitive']);
  const sems = semanticEntries(root).map(([name, value]) => [name, value, 'semantic']);
  const tokens = {};
  for (const [name, value, tier] of [...prims, ...sems]) {
    // A backdrop is a CSS filter value, such as blur(8px) or none.
    const type = name.startsWith('backdrop') ? 'filter' : typeOf(value);
    tokens[name] = {
      tier,
      type,
      // Semantic colors, shadows, and gradients hold both modes, with light-dark().
      modes: tier === 'semantic' && type !== 'number' && type !== 'dimension',
      ...(roleOf(name) ? { role: roleOf(name) } : {}),
      stability: STABLE.some((re) => re.test(name)) ? 'stable' : 'experimental',
      ...(MEANING[name] ? { meaning: MEANING[name] } : {}),
    };
  }
  return {
    contract: CONTRACT_VERSION,
    prefix: 'tm',
    note: 'Made by `npm run spec` from src/manifest.js. Do not edit. See spec/consumers.md.',
    selectors: {
      'theme-<name>': 'A class for each theme. It sets every token of that theme, from its place in the theme tree, on the element and everything in it. Use one theme class on an element. The root theme, "default", is also on :root.',
      'tm-invert': 'A class that shows an element, and everything in it, in the other mode.',
      'data-tm-mode': 'An attribute, "light" or "dark", that forces one mode on an element and everything in it.',
      'data-tm-contrast': 'An attribute, "more" or "base", on <html> or on an element with a theme class. "more" turns on the more-contrast variant for it and everything in it, and "base" turns it off. Without it, the reader\'s prefers-contrast: more setting decides.',
    },
    pairs: PAIRS,
    tokens,
  };
}

// The JSON Schema of the inputs. It accepts what normalizeInputs accepts, except the checks
// across themes: that a parent exists, that parents make no loop, and that only the root has
// no parent.
export function inputsSchema() {
  const enumOf = (values) => ({ enum: values });
  const feel = (name, spec) => ({
    description: `${spec.label}: a number from 0 to 1, a word for one, or "${INHERIT}" for the parent's value.`,
    anyOf: [{ type: 'number', minimum: 0, maximum: 1 }, enumOf([...Object.keys(spec.stops), INHERIT])],
  });
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'idk-themetron inputs',
    description: 'A tree of themes. Made by `npm run spec` from src/manifest.js. Draft: the inputs can change in any version before 1.0. See spec/inputs.md.',
    type: 'object',
    additionalProperties: false,
    properties: {
      $schema: { type: 'string' },
      version: { description: `The version of the inputs format. Version 1 had "neutral" for base, and "color" for action only. Without a version, the inputs are version ${INPUTS_VERSION}.`, enum: [1, INPUTS_VERSION] },
      themes: {
        description: `Theme names map to themes. The root theme is "${ROOT}". Every other theme needs a parent.`,
        type: 'object',
        propertyNames: { pattern: THEME_NAME.source },
        additionalProperties: { $ref: '#/$defs/theme' },
      },
    },
    $defs: {
      hex: { type: 'string', pattern: '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$' },
      role: { anyOf: [{ $ref: '#/$defs/hex' }, { type: 'object', additionalProperties: false, properties: { color: { $ref: '#/$defs/hex' } } }] },
      font: {
        anyOf: [
          { type: 'string', description: 'A Google font family. The fallback comes from the role.' },
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              family: { type: ['string', 'null'], description: 'A Google font family, or null for the browser\'s font.' },
              fallback: { type: 'string', description: 'A CSS generic family, such as sans-serif.' },
            },
          },
        ],
      },
      theme: {
        type: 'object',
        additionalProperties: false,
        properties: {
          parent: { type: 'string', description: `The name of the parent theme. Not allowed on "${ROOT}".` },
          label: { type: 'string', pattern: '\\S', description: 'The text that people see, such as "Big Sale". Any case, with spaces. The theme name is still the ID in classes and tokens. Not inherited.' },
          base: { $ref: '#/$defs/role', description: 'The base color: backgrounds, text, borders, and quiet controls. From the parent, or from color, if not set.' },
          action: { $ref: '#/$defs/role', description: 'The action color: links, buttons, checks, focus rings, and other parts that you act on. From the parent, or from color, if not set.' },
          color: { $ref: '#/$defs/hex', description: 'Sets both base and action. base and action override it.' },
          fillLabel: { deprecated: true, description: 'Ignored. Every fill has light labels in light mode and dark labels in dark mode. To flip one part, put the class tm-invert on it.' },
          font: { $ref: '#/$defs/font' },
          headingFont: { $ref: '#/$defs/font' },
          monoFont: { $ref: '#/$defs/font' },
          preset: { ...enumOf(Object.keys(PRESETS)), description: 'A set of feels. The theme\'s own feels override it.' },
          feel: {
            type: 'object',
            additionalProperties: false,
            properties: {
              ...Object.fromEntries(Object.entries(FEELS).map(([name, spec]) => [name, feel(name, spec)])),
              ...Object.fromEntries(REMOVED_FEELS.map((name) => [name, { deprecated: true, description: 'Ignored. This feel is removed for now.' }])),
            },
          },
          contrast: {
            type: 'object',
            additionalProperties: false,
            properties: {
              method: enumOf(CONTRAST_METHODS),
              model: enumOf(CONTRAST_MODELS),
              level: { deprecated: true, description: 'Ignored. Every theme ships the standard level, and the enhanced level as its more-contrast variant.' },
            },
          },
        },
      },
    },
  };
}

// The generated files in spec/, as { path: text }.
export function specFiles() {
  const json = (data) => `${JSON.stringify(data, null, 2)}\n`;
  return {
    'spec/tokens.manifest.json': json(tokenManifest()),
    'spec/inputs.schema.json': json(inputsSchema()),
  };
}

// Check a stylesheet that reads themetron tokens. Returns the tokens that it reads but the
// contract does not have, and the experimental ones that it reads.
export function checkCss(css, { prefix = 'tm' } = {}) {
  const { tokens } = tokenManifest();
  // Token definitions, such as a themetron stylesheet's own rules, are not uses.
  const reads = css.replace(new RegExp(`--${prefix}-[a-z0-9-]+\\s*:[^;}]*`, 'g'), '');
  const used = new Set([...reads.matchAll(new RegExp(`var\\(\\s*--${prefix}-([a-z0-9-]+)`, 'g'))].map((m) => m[1]));
  const sorted = [...used].sort();
  return {
    unknown: sorted.filter((name) => !tokens[name]),
    experimental: sorted.filter((name) => tokens[name]?.stability === 'experimental'),
    stable: sorted.filter((name) => tokens[name]?.stability === 'stable'),
  };
}
