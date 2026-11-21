// Looks: the appearance of a themetron part, for any element. components/looks.css is the one
// source. This file lists the looks for the token manifest, and makes the other two forms of each
// look from the CSS: a Sass mixin, and a Tailwind CSS v4 utility. Both are written to components/
// by `npm run looks`, and a test checks that they match looks.css.

// Each look: what it gives, the components that wear it, the states it reacts to, and a short
// example. The order is the order of looks.css.
export const LOOKS = {
  fill: { summary: 'A solid action fill, with the theme\'s shine and lift: a primary button.', components: ['tm-button'], states: [':hover', ':active', ':disabled', ':focus-visible', '.tm-invert'], example: '<button class="my-button tm-look-fill">Save</button>' },
  tint: { summary: 'A soft tint of the action color: a secondary button, or a selected item.', components: ['tm-button--soft'], states: [':hover', ':active', ':disabled', ':focus-visible'], example: '<button class="my-button tm-look-tint">Edit</button>' },
  quiet: { summary: 'A quiet fill in the base color, for parts that are not the main action.', components: ['tm-button--quiet'], states: [':hover', ':active', ':disabled', ':focus-visible'], example: '<button class="my-button tm-look-quiet">Cancel</button>' },
  outline: { summary: 'An edge in the action color, with a tint on hover. In a gradient theme, the edge is the gradient.', components: ['tm-button--outline'], states: [':hover', ':active', ':disabled', ':focus-visible'], example: '<button class="my-button tm-look-outline">More</button>' },
  ghost: { summary: 'Action text with no edge, and a tint on hover.', components: ['tm-button--ghost'], states: [':hover', ':active', ':disabled', ':focus-visible'], example: '<button class="my-button tm-look-ghost">Skip</button>' },
  surface: { summary: 'A card or a panel: the panel color, edge, radius, elevation, and frost.', components: ['tm-card'], states: [], example: '<aside class="sidebar tm-look-surface">…</aside>' },
  field: { summary: 'A text field: the field color, edge, radius, and inset shadow.', components: ['tm-input', 'tm-select', 'tm-textarea'], states: [':hover', ':focus-visible', '[aria-invalid="true"]', '::placeholder'], example: '<input class="search tm-look-field">' },
  'gradient-text': { summary: 'Action text, such as a link. In a gradient theme, the letters wear the gradient.', components: ['tm-link'], states: [':focus-visible'], example: '<a class="nav-link tm-look-gradient-text" href="/docs">Docs</a>' },
  ring: { summary: 'An edge in the action color. In a gradient theme, the edge is the gradient, and follows rounded corners.', components: [], states: [], example: '<div class="avatar tm-look-ring">…</div>' },
  'enter-pop': { summary: 'Motion: the part pops in place as it appears, and shrinks away as it goes, such as a menu or a popover.', components: ['tm-pop'], states: ['[hidden]', 'dialog:not([open])', '[popover]:not(:popover-open)'], example: '<div class="menu tm-enter-pop" popover>…</div>' },
  'enter-arrive': { summary: 'Motion: the part comes in from below the edge with a spring, and drops away as it goes, such as a toast.', components: ['tm-toast'], states: ['[hidden]', 'dialog:not([open])', '[popover]:not(:popover-open)'], example: '<div class="toast tm-enter-arrive" popover="manual">Saved.</div>' },
  'enter-fade': { summary: 'Motion: the part fades in and out in place, such as a tooltip.', components: [], states: ['[hidden]', 'dialog:not([open])', '[popover]:not(:popover-open)'], example: '<p class="note tm-enter-fade" hidden>Copied.</p>' },
};

// The class of a look: tm-look-<name>, or tm-enter-<kind> for the motion looks.
export const lookClass = (name) => (name.startsWith('enter-') ? `tm-${name}` : `tm-look-${name}`);

// ---- A small CSS reader, for the plain CSS of looks.css: comments, at-rules with or without a
// block, and style rules. No nesting inside style rules.

// Split at the commas that are not inside parentheses or brackets.
export function splitList(text) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { parts.push(text.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean);
}

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// The rules of a block of CSS, in order, as { context: [at-rule preludes], selectors, body } or
// { statement } for an at-rule with no block, such as @property.
export function readRules(css, context = []) {
  const text = stripComments(css);
  const out = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    const semi = text.indexOf(';', i);
    if (open < 0) break;
    const head = text.slice(i, open).trim();
    // An at-rule that ends before the next block, such as @import "x"; or @property … { }.
    if (semi >= 0 && semi < open && text.slice(i, semi).trim().startsWith('@')) {
      out.push({ context, statement: text.slice(i, semi + 1).trim() });
      i = semi + 1;
      continue;
    }
    // Find the matching brace.
    let depth = 0, end = open;
    for (; end < text.length; end++) {
      if (text[end] === '{') depth++;
      else if (text[end] === '}' && --depth === 0) break;
    }
    const inner = text.slice(open + 1, end);
    if (head.startsWith('@property')) out.push({ context, statement: `${head} {${inner}}`.replace(/\s+/g, ' ') });
    else if (head.startsWith('@')) out.push(...readRules(inner, [...context, head]));
    else out.push({ context, selectors: splitList(head), body: inner.trim() });
    i = end + 1;
  }
  return out;
}

// The declarations of a rule body, one per line, as written.
const declarations = (body) => {
  const decls = [];
  let depth = 0, start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) { decls.push(body.slice(start, i)); start = i + 1; }
  }
  decls.push(body.slice(start));
  return decls.map((d) => d.replace(/\s+/g, ' ').trim()).filter(Boolean);
};

// The look's name from a match of its class: fill, or enter-pop.
const lookName = ([, kind, name]) => (kind === 'enter' ? `enter-${name}` : name);

// Where a selector names a look: the look, and the selector with the look as &. The look is a
// class of its own, such as .tm-look-fill:hover, or one item of :is() or :where(), such as
// :is(.tm-look-tint, .tm-button--soft) > span; then the whole :is() becomes &.
export function lookInSelector(selector) {
  const m = /\.tm-(look|enter)-([a-z]+(?:-[a-z]+)*)(?![a-z0-9_-])/.exec(selector);
  if (!m) return null;
  const name = lookName(m);
  // Is the look inside :is( or :where( ? Find the innermost open group before it.
  let depth = 0;
  for (let i = m.index - 1; i >= 0; i--) {
    const c = selector[i];
    if (c === ')') depth++;
    else if (c === '(') {
      if (depth > 0) { depth--; continue; }
      const fn = /:(is|where)$/.exec(selector.slice(0, i));
      if (!fn) return null;
      const start = i - fn[0].length;
      let d = 0, end = i;
      for (; end < selector.length; end++) {
        if (selector[end] === '(') d++;
        else if (selector[end] === ')' && --d === 0) break;
      }
      return { name, nested: `${selector.slice(0, start)}&${selector.slice(end + 1)}` };
    }
  }
  return { name, nested: `${selector.slice(0, m.index)}&${selector.slice(m.index + m[0].length)}` };
}

// The looks of looks.css: for each look, its rules in order, as { context, selectors (with &),
// decls }. Also the statements (@property) and the rules that every look needs (tm-invert).
export function parseLooks(css) {
  const looks = {};
  const statements = [];
  const shared = [];
  for (const rule of readRules(css)) {
    if (rule.statement) { if (rule.statement.startsWith('@property')) statements.push(rule.statement); continue; }
    if (rule.selectors.every((s) => /^\.tm-invert( \*)?$/.test(s))) { shared.push(rule); continue; }
    const byLook = new Map();
    for (const selector of rule.selectors) {
      // A selector list inside :is() or :where() can name several looks: take each.
      for (const look of looksIn(selector)) {
        if (!byLook.has(look.name)) byLook.set(look.name, []);
        if (!byLook.get(look.name).includes(look.nested)) byLook.get(look.name).push(look.nested);
      }
    }
    for (const [name, selectors] of byLook) (looks[name] ??= []).push({ context: rule.context, selectors, decls: declarations(rule.body) });
  }
  return { looks, statements, shared };
}

// Every look that a selector names, each with the selector made relative to it.
function looksIn(selector) {
  const out = [];
  const names = new Set([...selector.matchAll(/\.tm-(look|enter)-([a-z]+(?:-[a-z]+)*)(?![a-z0-9_-])/g)].map(lookName));
  for (const name of names) {
    // Hide the other looks, so lookInSelector finds this one, then show them again.
    const others = [];
    const only = selector.replace(/\.tm-(look|enter)-([a-z]+(?:-[a-z]+)*)(?![a-z0-9_-])/g, (all, kind, n) => (lookName([all, kind, n]) === name ? all : `.tm-hidden-${others.push(all) - 1}`));
    const found = lookInSelector(only);
    if (found) out.push({ name, nested: found.nested.replace(/\.tm-hidden-(\d+)/g, (all, i) => others[i]) });
  }
  return out;
}

// One look as nested CSS: declarations for the look itself, and a nested rule for each state,
// pseudo-element, or at-rule. Valid in Sass, in Tailwind v4, and in CSS nesting.
function nestedBody(rules, indent) {
  const pad = ' '.repeat(indent);
  const lines = [];
  // Declarations of the look itself stay bare until the first nested rule. After that they go in
  // & { }, so they keep their place: Sass warns about bare declarations after nested rules.
  let nested = false;
  for (const { context, selectors, decls } of rules) {
    let at = pad;
    const close = [];
    for (const prelude of context) { lines.push(`${at}${prelude} {`); close.unshift(`${at}}`); at += '  '; }
    const plain = selectors.length === 1 && selectors[0] === '&' && !context.length;
    if (!plain) nested = true;
    if (plain && !nested) {
      lines.push(...decls.map((d) => `${at}${d};`));
    } else {
      lines.push(`${at}${selectors.join(', ')} {`, ...decls.map((d) => `${at}  ${d};`), `${at}}`);
    }
    lines.push(...close);
  }
  return lines;
}

const HEADER = (what) => `/* themetron looks, ${what}. Made from components/looks.css by npm run looks: do not edit.
   Each look reads only the --tm-* tokens of the nearest theme, so load a themetron theme too. */`;

// The looks in the order of LOOKS, then any others.
const inOrder = (looks) => Object.entries(looks).sort(([a], [b]) => (Object.keys(LOOKS).indexOf(a) + 1 || 99) - (Object.keys(LOOKS).indexOf(b) + 1 || 99));

const plainRule = ({ selectors, body }) => `${selectors.join(', ')} { ${declarations(body).join('; ')}; }`;

// The Sass form: a mixin for each look, look-<name> or enter-<kind>. @use "…/looks" as tm; then
// .my-button { @include tm.look-fill; }
export function looksScss(css) {
  const { looks, statements, shared } = parseLooks(css);
  const parts = [HEADER('as Sass mixins'), '', ...statements, ...shared.map(plainRule)];
  for (const [name, rules] of inOrder(looks)) {
    parts.push('', `@mixin ${lookClass(name).replace(/^tm-/, '')} {`, ...nestedBody(rules, 2), '}');
  }
  return parts.join('\n') + '\n';
}

// The Tailwind CSS v4 form: a utility for each look, named as its class. @import it after
// tailwindcss; then class="tm-look-fill", or .my-button { @apply tm-look-fill; }
export function looksTailwind(css) {
  const { looks, statements, shared } = parseLooks(css);
  const parts = [HEADER('as Tailwind CSS v4 utilities'), '', ...statements, ...shared.map(plainRule)];
  for (const [name, rules] of inOrder(looks)) {
    parts.push('', `@utility ${lookClass(name)} {`, ...nestedBody(rules, 2), '}');
  }
  return parts.join('\n') + '\n';
}

// The files that npm run looks writes, by path, from the text of looks.css.
export function lookFiles(css) {
  return { 'components/_looks.scss': looksScss(css), 'components/looks.tailwind.css': looksTailwind(css) };
}

// components.css with looks.css in place of its @import, as one stylesheet.
export const withLooks = (componentsCss, looksCss) => componentsCss.replace('@import "./looks.css";', looksCss.trim());

const LOOK_CLASS = /\.tm-(look|enter)-([a-z]+(?:-[a-z]+)*)(?![a-z0-9_-])/g;

// The selector list of each :is() and :where() in a selector, made with `list`, from the inside
// out. An empty list removes the selector: the result is null.
function eachInnerList(selector, list) {
  const at = /:(is|where)\(/.exec(selector);
  if (!at) return selector;
  const open = at.index + at[0].length - 1;
  let depth = 0, end = open;
  for (; end < selector.length; end++) {
    if (selector[end] === '(') depth++;
    else if (selector[end] === ')' && --depth === 0) break;
  }
  const inner = list(splitList(selector.slice(open + 1, end)));
  if (!inner.length) return null;
  const rest = eachInnerList(selector.slice(end + 1), list);
  return rest === null ? null : `${selector.slice(0, open + 1)}${inner.join(', ')})${rest}`;
}

// looks.css on another framework's classes. `targets` gives each look a selector list, such as
// { fill: '.btn-primary, .btn-danger' }, and each look's class becomes it: .tm-look-fill:hover
// becomes :is(.btn-primary, .btn-danger):hover. The selectors of looks with no target, and of
// themetron's own components, are left out. The rules keep their order and specificity, so the
// framework's parts act as the looks do. Load it after the framework's CSS: then a look's rule
// wins over the framework's rule of the same specificity.
export function looksOn(css, targets) {
  const target = (match) => targets[lookName(match)];
  // Keep a selector when each look in it has a target, and it names no other themetron class
  // than tm-invert.
  const keep = (selector) => [...selector.matchAll(LOOK_CLASS)].every(target)
    && !/\.tm-(?!invert(?![a-z0-9_-]))/.test(selector.replace(LOOK_CLASS, ''));
  const list = (selectors) => selectors.map((s) => eachInnerList(s, list)).filter((s) => s !== null && keep(s));
  const swap = (selector) => selector.replace(LOOK_CLASS, (...match) => (splitList(target(match)).length > 1 ? `:is(${target(match)})` : target(match)));
  const out = [];
  let open = [];
  for (const rule of readRules(css)) {
    if (rule.statement) { if (rule.statement.startsWith('@property')) out.push(rule.statement); continue; }
    const selectors = list(rule.selectors).map(swap);
    if (!selectors.length) continue;
    // Rules in a row with the same at-rules share one block of them.
    if (open.join('\n') !== rule.context.join('\n')) {
      out.push(...open.map(() => '}'));
      out.push(...rule.context.map((prelude) => `${prelude} {`));
      open = rule.context;
    }
    out.push(`${selectors.join(', ')} { ${declarations(rule.body).join('; ')}; }`);
  }
  out.push(...open.map(() => '}'));
  return out.join('\n') + '\n';
}
