// The playground: a tree of themes on the left, the selected theme live on the right.
import '../components/components.css';
// The same file as text, for the Stylesheet download.
import componentsCss from '../components/components.css?raw';
import { buildThemes, toCss, toDtcg, toTailwind, toShadcn, FEELS, TYPE_VARIANCE, PRESETS, GRADES, THRESHOLDS, ROOT, INHERIT, INPUTS_VERSION, themeName, defaultLabel, measure, feelWord, gradeGaps, contrastTest, InputError } from '../src/index.js';

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...children.flat().filter((c) => c !== null && c !== undefined));
  return node;
};

const FEEL_HINTS = {
  spaciousness: 'Padding, gaps, text size, and line height.',
  roundness: 'Corners, as a share of the most a part can round.',
  depth: 'Soft shadows, and how far buttons rise on hover.',
  shininess: 'Gloss on buttons, thumbs, and bars.',
};

const FONT_CHOICES = {
  sans: ['Atkinson Hyperlegible', 'DM Sans', 'Figtree', 'Work Sans', 'Manrope', 'Nunito', 'Outfit', 'Public Sans', 'Rubik', 'Bricolage Grotesque', 'Syne', 'Archivo', 'Lexend', 'IBM Plex Sans', 'Inter'],
  serif: ['Fraunces', 'Newsreader', 'Lora', 'Playfair Display', 'Instrument Serif', 'Literata', 'Source Serif 4', 'DM Serif Display', 'Young Serif'],
  display: ['Archivo Black', 'Bungee', 'Righteous', 'Press Start 2P', 'Monoton', 'Rubik Mono One'],
  mono: ['JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'Space Mono', 'DM Mono', 'Martian Mono'],
};
const FONT_FIELDS = [['font', 'Body'], ['headingFont', 'Heading'], ['monoFont', 'Mono']];
const fallbackFor = (family, field) => {
  if (field === 'monoFont' || FONT_CHOICES.mono.includes(family)) return 'monospace';
  if (FONT_CHOICES.serif.includes(family)) return 'serif';
  return 'sans-serif';
};

const START = {
  selected: ROOT,
  themes: { [ROOT]: { action: '#0000ee' } },
};

const STORE_KEY = 'themetron-playground-v2';
let state = load(STORE_KEY) ?? structuredClone(START);
if (!state.themes?.[ROOT]) state = structuredClone(START);
if (!state.themes[state.selected]) state.selected = ROOT;
// The playground keeps base and action apart. A saved state with `neutral` or `color` is from
// version 1 of the inputs, where `color` was the action color only.
toRoles(state.themes, 1);
// Presets are a one-time stamp in the playground: a saved preset becomes the theme's own feels.
expandPresets(state.themes);
// CIE LCh is gone. Themes that used it go back to the default model.
for (const t of Object.values(state.themes)) if (t.contrast?.model === 'lch') delete t.contrast.model;
// "Both" is gone: APCA now keeps the WCAG 2 minimums as a floor.
for (const t of Object.values(state.themes)) if (t.contrast?.method === 'both') t.contrast.method = 'apca';
// ?preset=glass opens the playground with a preset on the root theme, for links and screenshots.
const askedPreset = new URLSearchParams(location.search).get('preset');
if (PRESETS[askedPreset]) { state.themes[ROOT].preset = askedPreset; delete state.themes[ROOT].feel; }
let ui = { view: 'preview', mode: 'both', contrast: 'base', format: 'stylesheet', pickA: null, pickB: null };
let built = null;

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
}

// The raw inputs for buildThemes. The UI keeps fonts as family names.
function rawInputs(themes = state.themes) {
  const out = {};
  for (const [name, own] of Object.entries(themes)) {
    const t = { ...own };
    for (const [field] of FONT_FIELDS) {
      if (typeof t[field] === 'string') {
        if (t[field].trim()) t[field] = { family: t[field].trim(), fallback: fallbackFor(t[field].trim(), field) };
        else delete t[field];
      }
    }
    out[name] = t;
  }
  return { themes: out };
}

const own = () => state.themes[state.selected];
const selected = () => built.themes[state.selected];
const isRoot = () => state.selected === ROOT;

// ---- Rebuild

let queued = false;
function update() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    try {
      built = buildThemes(rawInputs());
      $('#error').hidden = true;
    } catch (err) {
      if (!(err instanceof InputError)) throw err;
      $('#error').textContent = err.message;
      $('#error').hidden = false;
      return;
    }
    store(STORE_KEY, state);
    $('#theme-css').textContent = toCss(built, { root: false });
    renderControlsState();
    renderView();
  });
}

// ---- The theme tree: one card for each theme. The open card edits that theme.

// Theme names as a tree: each theme, then its children and their children, depth first.
function treeOrder() {
  const order = [];
  const visit = (n) => {
    if (order.includes(n)) return;
    order.push(n);
    for (const [child, t] of Object.entries(state.themes)) if (t.parent === n) visit(child);
  };
  visit(ROOT);
  // Themes that the tree does not reach, such as ones in a loop, go last.
  for (const n of Object.keys(state.themes)) visit(n);
  return order;
}
const depthOf = (name) => { let d = 0; for (let p = state.themes[name]?.parent; p; p = state.themes[p]?.parent) d++; return d; };

// Themes that can be the parent of `name`: all but itself and its descendants.
function possibleParents(name) {
  const isBelow = (n) => { for (let p = n; p; p = state.themes[p]?.parent) if (p === name) return true; return false; };
  return treeOrder().filter((n) => !isBelow(n));
}

// The sections of a theme, in order, and the fields that each one sets.
const SECTIONS = [
  ['contrast', 'Contrast', ['contrast']],
  ['base', 'Base color', ['base']],
  ['color', 'Action color', ['action']],
  ['fonts', 'Typography', ['font', 'headingFont', 'monoFont', 'typeVariance']],
  ['feel', 'Feel', ['preset', 'feel']],
];
// Sections that the playground does not show for now. Their values still load and apply.
const HIDDEN_SECTIONS = [];
// Sections that a child shows: the ones it overrides, and the ones you just added.
const added = {};
const shows = (name, key) => name === ROOT || key === 'color' || (added[name]?.has(key) ?? false) || SECTIONS.find((s) => s[0] === key)[2].some((f) => f in state.themes[name]);

let openCard = state.selected;

function renderThemes() {
  $('#themes').replaceChildren(...treeOrder().map((name) => {
    const t = state.themes[name];
    const root = name === ROOT;
    const open = name === openCard;
    return el('div', { class: `card ${themeClass(name)} ${open ? 'open' : ''}`, style: `--depth: ${depthOf(name)}`, 'data-card': name },
      el('div', { class: 'card-bar', onclick: (e) => { if (e.target === e.currentTarget) toggleCard(name); } },
        el('button', { class: 'card-toggle', type: 'button', 'aria-expanded': String(open), onclick: () => toggleCard(name) },
          el('span', { class: 'chev', 'aria-hidden': 'true' }, '▸'),
          el('span', { class: 'title' }, el('i', { class: 'dot', 'data-dot': name }), labelOf(name)),
          el('span', { class: 'color-meta', 'data-meta': name }),
        ),
        root ? el('span') : el('button', { class: 'x', type: 'button', 'aria-label': `Remove the ${labelOf(name)} theme`, title: 'Remove theme', onclick: () => removeTheme(name) }, '×'),
      ),
      open ? cardBody(name) : null,
      el('button', { class: 'add-child', type: 'button', onclick: () => addChild(name) }, '+ Add a child of ', el('b', {}, labelOf(name))),
    );
  }));
  if (built?.themes[state.selected]) renderControlsState();
}

function toggleCard(name) {
  openCard = openCard === name ? null : name;
  if (openCard) state.selected = name;
  renderThemes();
  update();
}

// The controls of one theme. Ids are unique, because only one card is open.
function cardBody(name) {
  const root = name === ROOT;
  const t = state.themes[name];
  const parts = [];
  // The Name field shows the label. The hint shows the class that the name makes.
  const nameField = el('div', { class: 'field' }, el('label', { for: 'theme-name' }, 'Name'),
    el('input', { id: 'theme-name', value: labelOf(name), spellcheck: 'false', onchange: (e) => rename(name, e.target.value) }));
  const classHint = el('div', { class: 'fader-hint' }, 'Class: ', el('code', {}, `theme-${name}`), root ? '. The root theme is always "default" in code.' : '. Made from the name.');
  if (root) parts.push(el('div', { class: 'group' }, nameField, classHint));
  else {
    parts.push(el('div', { class: 'group' },
      nameField,
      classHint,
      el('div', { class: 'field' }, el('label', { for: 'theme-parent' }, 'Parent'),
        el('select', { id: 'theme-parent', onchange: (e) => { t.parent = e.target.value; renderThemes(); update(); } },
          ...possibleParents(name).map((p) => el('option', { value: p, selected: p === t.parent }, labelOf(p))))),
      el('div', { class: 'fader-hint', id: 'theme-kind' }),
    ));
  }
  const missing = [];
  for (const [key, label] of SECTIONS) {
    if (HIDDEN_SECTIONS.includes(key)) continue;
    if (!shows(name, key)) { missing.push([key, label]); continue; }
    const closed = pane.closedSections.includes(key);
    const head = el('div', { class: 'group-head' },
      el('button', { class: 'section-toggle', type: 'button', 'aria-expanded': String(!closed), onclick: () => toggleSection(key) },
        el('span', { class: 'chev', 'aria-hidden': 'true' }, '▸'), el('h2', {}, label)),
      root || key === 'color' ? null : el('button', { class: 'x', type: 'button', 'aria-label': `Stop overriding ${label.toLowerCase()}`, title: `Use the parent's ${label.toLowerCase()}`, onclick: () => removeSection(name, key) }, '×'));
    parts.push(el('section', { class: `group ${closed ? 'collapsed' : ''}`, 'data-section': key }, head, ...SECTION_CONTROLS[key]()));
  }
  if (missing.length) {
    parts.push(el('div', { class: 'overrides' }, 'Override:',
      ...missing.map(([key, label]) => el('button', { class: 'small-btn', type: 'button', onclick: () => addSection(name, key) }, `+ ${label}`))));
  }
  // A rule between sections.
  return el('div', { class: 'card-body' }, ...parts.flatMap((p, i) => (i ? [el('hr'), p] : [p])));
}

// Add an override section, open it, and scroll the inputs pane to it.
function addSection(name, key) {
  (added[name] ??= new Set()).add(key);
  pane.closedSections = pane.closedSections.filter((k) => k !== key);
  applyPane();
  renderThemes();
  requestAnimationFrame(() => document.querySelector(`[data-card="${name}"] [data-section="${key}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

// Sections open and close from their heading, for every theme at once.
function toggleSection(key) {
  pane.closedSections = pane.closedSections.includes(key) ? pane.closedSections.filter((k) => k !== key) : [...pane.closedSections, key];
  applyPane();
  for (const section of document.querySelectorAll(`[data-section="${key}"]`)) {
    const closed = pane.closedSections.includes(key);
    section.classList.toggle('collapsed', closed);
    section.querySelector('.section-toggle').setAttribute('aria-expanded', String(!closed));
  }
}

// Turn each theme's preset into its own feels, the preset's values under any it already sets.
// "inherit" means the parent's value, which in this model is simply a feel that is not set.
// Each theme's colors as `base` and `action`, never `color`, so that each picker edits one role.
// In version 1 of the inputs, `neutral` was base, `color` was action only, and `fillLabel`
// flipped the fills. Version 2 has no fillLabel.
function toRoles(themes, version) {
  for (const t of Object.values(themes)) {
    delete t.fillLabel;
    // Every theme now ships both contrast levels, so a saved level goes away.
    if (t.contrast) delete t.contrast.level;
    // Removed feels stay in the saved themes, so they come back on a branch that has them.
    // The engine skips them.
    if (version === 1 && 'neutral' in t) { t.base ??= t.neutral; delete t.neutral; }
    if ('color' in t) {
      if (version !== 1) t.base ??= t.color;
      t.action ??= t.color;
      delete t.color;
    }
  }
  return themes;
}

function expandPresets(themes) {
  for (const t of Object.values(themes)) {
    if (!t.preset) continue;
    const full = Object.fromEntries(Object.entries(FEELS).map(([k, spec]) => [k, PRESETS[t.preset]?.feel[k] ?? spec.default]));
    const feel = { ...full, ...t.feel };
    for (const [k, v] of Object.entries(feel)) if (v === INHERIT) delete feel[k];
    t.feel = feel;
    delete t.preset;
  }
  return themes;
}

function removeSection(name, key) {
  added[name]?.delete(key);
  for (const field of SECTIONS.find((s) => s[0] === key)[2]) delete state.themes[name][field];
  renderThemes();
  update();
}

// What people see for a theme: its label, or one made from its name, such as "Warning".
const labelOf = (name) => state.themes[name]?.label ?? defaultLabel(name);
const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// The Name field sets the label, any text, and makes the theme name from it: "Big Sale" is
// big-sale. The root keeps the name "default". If the name is taken, the theme keeps its old one.
function rename(from, raw) {
  const label = raw.trim();
  if (!label) { renderThemes(); return; }
  const wanted = from === ROOT ? ROOT : themeName(label) || from;
  const to = wanted !== from && state.themes[wanted] ? from : wanted;
  const t = state.themes[from];
  if (label === defaultLabel(to)) delete t.label; else t.label = label;
  if (to === from) { renderThemes(); update(); return; }
  state.themes = Object.fromEntries(Object.entries(state.themes).map(([k, v]) => [k === from ? to : k, v]));
  for (const t of Object.values(state.themes)) if (t.parent === from) t.parent = to;
  if (added[from]) { added[to] = added[from]; delete added[from]; }
  if (state.selected === from) state.selected = to;
  if (openCard === from) openCard = to;
  renderThemes();
  update();
}

function removeTheme(name) {
  const { parent } = state.themes[name];
  for (const t of Object.values(state.themes)) if (t.parent === name) t.parent = parent;
  delete state.themes[name];
  delete added[name];
  if (state.selected === name) state.selected = parent;
  if (openCard === name) openCard = parent;
  renderThemes();
  update();
}

const NEW_COLORS = ['#d6336c', '#0f9d8a', '#8a4fff', '#f2b705', '#2b8a3e', '#e8590c'];
function addChild(parent) {
  let i = 1;
  while (state.themes[`child-${i}`]) i++;
  const name = `child-${i}`;
  state.themes[name] = { parent, action: NEW_COLORS[(i - 1) % NEW_COLORS.length] };
  state.selected = name;
  openCard = name;
  renderThemes();
  update();
}

// ---- The controls in each section. They change the open theme's own fields.

const FEEL_COUNT = Object.keys(FEELS).length;

const SECTION_CONTROLS = {
  contrast: () => [
    el('div', { class: 'contrast-row' },
      el('div', { class: 'tm-segmented tm-segmented--sm', id: 'method', role: 'group', 'aria-label': 'Contrast method' })),
    el('div', { class: 'fader-hint', id: 'contrast-note' }),
    el('div', { class: 'model-row' }, el('span', { class: 'font-label' }, 'Color model'),
      el('div', { class: 'tm-segmented tm-segmented--sm', id: 'model', role: 'group', 'aria-label': 'Color model' })),
    el('div', { class: 'fader-hint', id: 'model-note' }),
  ],
  color: () => [
    el('div', { class: 'color-row single' },
      el('input', { type: 'color', id: 'theme-color', 'aria-label': 'Action color', oninput: (e) => { own().action = e.target.value; update(); } }),
      el('span', { class: 'fader-hint', id: 'color-note' },
        el('span', { id: 'color-hex' }),
        el('button', { class: 'x', type: 'button', id: 'color-x', 'aria-label': "Use the parent's action color", title: "Use the parent's action color", onclick: () => { delete own().action; update(); } }, '×'))),
    el('div', { class: 'fader-hint' }, 'For links, buttons, checks, focus rings, and other parts that you act on, or that show their state.'),
    el('div', { class: 'fader-hint' }, 'Solid fills have light labels in light mode, and dark labels in dark mode, for every key color. To flip a part, give it the class tm-invert.'),
  ],
  base: () => [
    el('div', { class: 'color-row single' },
      el('input', { type: 'color', id: 'base-color', 'aria-label': 'Base color', oninput: (e) => { own().base = e.target.value; update(); } }),
      el('span', { class: 'fader-hint', id: 'base-note' })),
    el('div', { class: 'fader-hint' }, 'For backgrounds, text, borders, and quiet buttons. A gray makes pure grays.'),
  ],
  // Each role is a Google font picker. Empty means the font comes from the parent, or
  // for the root, the browser. "Browser default" turns a parent's web font off.
  fonts: () => {
    $('#font-list').replaceChildren(el('option', { value: BROWSER_FONT }), ...Object.values(FONT_CHOICES).flat().map((f) => el('option', { value: f })));
    return FONT_FIELDS.map(([field, label]) => el('div', { class: 'font-row', 'data-font-row': field },
      el('label', { class: 'font-label', for: `font-${field}` }, label),
      el('input', {
        id: `font-${field}`, list: 'font-list', spellcheck: 'false', autocomplete: 'off',
        onchange: (e) => setFont(field, e.target.value.trim()),
      }),
      el('button', { class: 'x', type: 'button', id: `font-x-${field}`, 'aria-label': `Clear the ${label.toLowerCase()} font`, title: 'Clear', onclick: () => setFont(field, '') }, '×'),
    )).concat(varianceFader());
  },
  feel: () => [
    // Apply a preset: a one-time stamp. It sets every feel as the theme's own, and the theme
    // keeps no link to the preset. Then each feel can be changed or removed on its own.
    el('details', { class: 'preset-menu', id: 'preset-menu' },
      el('summary', { class: 'tm-button tm-button--outline tm-button--sm' }, 'Apply a preset ▾'),
      el('div', { class: 'preset-list', role: 'menu', 'aria-label': 'Presets' },
        ...Object.entries(PRESETS).map(([key, p]) => el('button', {
          type: 'button',
          role: 'menuitem',
          'data-preset': key,
          onclick: () => {
            const preset = p.feel;
            // Removed feels stay, so they come back on a branch that has them.
            const kept = Object.fromEntries(Object.entries(own().feel ?? {}).filter(([k]) => !FEELS[k]));
            own().feel = { ...kept, ...Object.fromEntries(Object.entries(FEELS).map(([k, spec]) => [k, preset[k] ?? spec.default])) };
            delete own().preset;
            $('#preset-menu').open = false;
            update();
          },
        }, p.label)))),
    el('div', { class: 'preset-note', id: 'preset-note' }),
    el('details', { class: 'feels', id: 'feel-details' }, el('summary', {}, 'Adjust the feels'), el('div', { class: 'group', style: 'gap: 16px' }, ...Object.entries(FEELS).map(([name, spec]) => {
      const setFeel = (v) => { own().feel = { ...own().feel, [name]: v }; update(); };
      return el('div', { class: 'fader', 'data-fader': name },
        el('div', { class: 'fader-head' }, el('label', { for: `feel-${name}` }, spec.label),
          el('span', { class: 'fader-right' }, el('output', { id: `out-${name}`, for: `feel-${name}` }),
            el('button', { class: 'x', type: 'button', id: `feel-x-${name}`, 'aria-label': `Use the parent's ${spec.label.toLowerCase()}`, title: "Use the parent's value", onclick: () => unsetFeel(name) }, '×'))),
        el('div', { class: 'fader-hint' }, FEEL_HINTS[name]),
        el('input', { type: 'range', id: `feel-${name}`, min: 0, max: 100, step: 1, oninput: (e) => setFeel(Number(e.target.value) / 100) }),
        el('div', { class: 'words' }, ...Object.entries(spec.stops).map(([word, value]) => el('button', {
          type: 'button', style: `left: ${value * 100}%`, 'data-word': word, onclick: () => setFeel(value),
        }, word))),
      );
    }))),
  ],
};

// A feel is the theme's own when it sets it.
const ownsFeel = (mine, name) => mine.feel?.[name] !== undefined && mine.feel[name] !== INHERIT;

// Remove one feel, so the parent's value (or for the root, the default) shows through.
function unsetFeel(name) {
  const mine = own();
  const feel = { ...mine.feel };
  delete feel[name];
  if (Object.keys(feel).length) mine.feel = feel;
  else delete mine.feel;
  update();
}

// The type variance: a slider like a feel's, in the typography section.
function varianceFader() {
  const spec = TYPE_VARIANCE;
  const setVariance = (v) => { own().typeVariance = v; update(); };
  return el('div', { class: 'fader', 'data-fader': 'typeVariance' },
    el('div', { class: 'fader-head' }, el('label', { for: 'type-variance' }, spec.label),
      el('span', { class: 'fader-right' }, el('output', { id: 'out-typeVariance', for: 'type-variance' }),
        el('button', { class: 'x', type: 'button', id: 'variance-x', 'aria-label': "Use the parent's type variance", title: "Use the parent's value", onclick: () => { delete own().typeVariance; update(); } }, '×'))),
    el('div', { class: 'fader-hint' }, 'How fast headings grow. Small and body text barely move.'),
    el('input', { type: 'range', id: 'type-variance', min: 0, max: 100, step: 1, oninput: (e) => setVariance(Number(e.target.value) / 100) }),
    el('div', { class: 'words' }, ...Object.entries(spec.stops).map(([word, value]) => el('button', {
      type: 'button', style: `left: ${value * 100}%`, 'data-word': word, onclick: () => setVariance(value),
    }, word))),
  );
}

const BROWSER_FONT = 'Browser default';

// Empty clears the theme's own font. "Browser default" sets the browser's font on
// purpose; on the root that is the same as empty.
function setFont(field, value) {
  if (!value || (value === BROWSER_FONT && isRoot())) delete own()[field];
  else own()[field] = value === BROWSER_FONT ? { family: null } : value;
  update();
}
function renderSegs() {
  const seg = (box, options, current, onPick) => box && box.replaceChildren(...options.map(([value, label]) => el('button', {
    type: 'button', 'aria-pressed': String(value === current), onclick: () => onPick(value),
  }, label)));
  const contrast = built?.themes[state.selected] ? selected().settings.contrast : { method: 'wcag', level: 'standard', model: 'oklch' };
  const setContrast = (key, v) => { own().contrast = { ...own().contrast, [key]: v }; update(); };
  seg($('#method'), [['wcag', 'WCAG 2'], ['apca', 'APCA']], contrast.method, (v) => setContrast('method', v));
  seg($('#model'), [['oklch', 'OKLCH'], ['hsl', 'HSL']], contrast.model, (v) => setContrast('model', v));
  seg($('#mode'), [['light', 'Light'], ['dark', 'Dark'], ['both', 'Both']], ui.mode, (v) => { ui.mode = v; renderSegs(); renderView(); });
  seg($('#contrast-view'), [['base', 'Base'], ['more', 'More contrast']], ui.contrast, (v) => { ui.contrast = v; renderSegs(); renderControlsState(); renderView(); });
  const modeLabel = { light: 'Light', dark: 'Dark', both: 'Both modes' }[ui.mode];
  $('#view-summary').textContent = `· ${ui.view === 'tokens' ? 'Both modes' : modeLabel}${ui.contrast === 'more' && ui.view !== 'tokens' ? ' · More contrast' : ''}`;
  seg($('#format'), [['stylesheet', 'Stylesheet'], ['css', 'CSS tokens'], ['dtcg', 'DTCG JSON'], ['tailwind', 'Tailwind'], ['shadcn', 'shadcn/ui'], ['inputs', 'Inputs']], ui.format, (v) => { ui.format = v; renderSegs(); renderView(); });
}

const MODEL_NOTES = {
  oklch: 'Ramps keep the hue in OKLCH, so blues stay blue. Grade lightness has an exact formula.',
  hsl: 'Ramps keep the hue and saturation in HSL, like themetron-3. Hues can shift, and mid grades can look dull or loud.',
};

// True when the feels are a preset's feels with no changes.
function isPresetAsIs({ preset, feel }) {
  const expected = { ...Object.fromEntries(Object.entries(FEELS).map(([k, s]) => [k, s.default])), ...PRESETS[preset].feel };
  return Object.keys(FEELS).every((k) => Math.abs(feel[k] - expected[k]) < 1e-9);
}

// Show the built values: in the title bars, and in the open card. Values that the
// open theme sets itself are bold. The rest say which parent they come from.
function renderControlsState() {
  for (const name of built.order) {
    const t = built.themes[name];
    const dot = document.querySelector(`[data-dot="${name}"]`);
    if (dot) dot.style.background = t.settings.action;
    const meta = document.querySelector(`[data-meta="${name}"]`);
    if (meta) {
      meta.replaceChildren(
        el('span', {}, name === ROOT ? 'root' : `${t.kind} · ↳ ${labelOf(t.parent)}`),
        el('span', { class: 'strip' }, ...GRADES.slice(1, -1).map((g) => el('i', { style: `background:${t.palettes.action.steps[g]}` }))),
      );
    }
  }
  renderSegs();
  const fails = built.order.flatMap((n) => MODES().flatMap((m) => atLevel(built.themes[n]).modes[m].audit)).filter((a) => a.required && !a.pass).length;
  $('#audit-count').textContent = fails ? ` ${fails}✕` : ' ✓';

  if (openCard !== state.selected) return;
  const theme = selected();
  const { settings } = theme;
  const mine = own();
  const fromParent = isRoot() ? '' : ` (from ${theme.parent})`;

  const kind = $('#theme-kind');
  if (kind) kind.textContent = theme.kind === 'color' ? 'A color theme: it sets only colors. Its fonts and feels come from its parent. It looks the same wherever it is on a page.' : 'A full theme: it sets its own fonts or feels too. It looks the same wherever it is on a page.';

  if ($('#contrast-note')) {
    const t = THRESHOLDS;
    const { method } = settings.contrast;
    const line = (m, level) => (m === 'wcag' ? `WCAG ${t.wcag[level].text}:1 for text, ${t.wcag[level].ui}:1 for controls` : `APCA Lc ${t.apca[level].text} for text, Lc ${t.apca[level].ui} for controls`);
    const both = (level) => (method === 'apca' ? `${line('apca', level)}, and never below ${line('wcag', level).replace('WCAG ', 'WCAG 2 ')}` : line(method, level));
    // Every theme ships both levels: the standard one, and the enhanced one as its more-contrast variant.
    $('#contrast-note').textContent = `${both('standard')}${'contrast' in mine || isRoot() ? '' : fromParent}. Readers who ask for more contrast get the enhanced level: ${both('enhanced')}.`;
    $('#model-note').textContent = MODEL_NOTES[settings.contrast.model];
  }

  const color = $('#theme-color');
  if (color) {
    if (document.activeElement !== color) color.value = settings.action;
    $('#color-hex').replaceChildren(el('span', { class: 'action' in mine ? 'own' : '' }, settings.action), 'action' in mine || isRoot() ? '' : fromParent);
    $('#color-x').hidden = isRoot() || !('action' in mine);
  }

  const base = $('#base-color');
  if (base) {
    if (document.activeElement !== base) base.value = settings.base;
    $('#base-note').replaceChildren(el('span', { class: 'base' in mine ? 'own' : '' }, settings.base), 'base' in mine || isRoot() ? '' : fromParent);
  }

  for (const [field] of FONT_FIELDS) {
    const input = $(`#font-${field}`);
    if (!input) continue;
    const font = settings[field];
    const mineFont = mine[field];
    const sameAsBody = field === 'headingFont' && font.family === settings.font.family && font.fallback === settings.font.fallback;
    if (document.activeElement !== input) {
      input.value = mineFont === undefined ? '' : typeof mineFont === 'string' ? mineFont : mineFont.family ?? BROWSER_FONT;
    }
    const shown = sameAsBody ? 'Same as body' : font.family ? font.family : `Browser ${font.fallback}`;
    input.placeholder = shown + (isRoot() || sameAsBody ? '' : fromParent);
    $(`#font-x-${field}`).hidden = !(field in mine);
  }

  if ($('#type-variance')) {
    const value = settings.typeVariance;
    const word = feelWord('typeVariance', value);
    const size = theme.primitives.font.size;
    $('#type-variance').value = Math.round(value * 100);
    $('#out-typeVariance').textContent = `${word} · ${value.toFixed(2)} · h1 ${size['3xl']} px`;
    document.querySelector('[data-fader="typeVariance"]').classList.toggle('own-feel', 'typeVariance' in mine);
    $('#variance-x').hidden = !('typeVariance' in mine);
    for (const b of document.querySelectorAll('#type-variance ~ .words button')) b.setAttribute('aria-current', String(b.dataset.word === word));
  }

  if ($('#preset-menu')) {
    // The preset whose feels match these exactly, if any. The menu marks it.
    const match = Object.keys(PRESETS).find((p) => isPresetAsIs({ preset: p, feel: settings.feel }));
    for (const item of document.querySelectorAll('#preset-menu [data-preset]')) item.setAttribute('aria-current', String(item.dataset.preset === match));
    if (!match) $('#feel-details').open = true;
    $('#feel-details > summary').textContent = match ? 'Adjust the feels' : 'Feels';
    const mineCount = Object.keys(FEELS).filter((k) => ownsFeel(mine, k)).length;
    const rest = isRoot() ? 'the defaults' : theme.parent;
    $('#preset-note').textContent = `${match ? `Matches ${PRESETS[match].label}.` : 'Custom.'} ${
      mineCount === FEEL_COUNT ? 'Every feel is this theme\'s own.' : mineCount === 0 ? `All feels come from ${rest}.` : `${mineCount} of ${FEEL_COUNT} feels are this theme's own; the rest come from ${rest}.`}`;
    for (const [name, value] of Object.entries(settings.feel)) {
      $(`#feel-${name}`).value = Math.round(value * 100);
      const word = feelWord(name, value);
      $(`#out-${name}`).textContent = `${word} · ${value.toFixed(2)}`;
      document.querySelector(`[data-fader="${name}"]`).classList.toggle('own-feel', ownsFeel(mine, name));
      $(`#feel-x-${name}`).hidden = !ownsFeel(mine, name);
      for (const b of document.querySelectorAll(`#feel-${name} ~ .words button`)) b.setAttribute('aria-current', String(b.dataset.word === word));
    }
  }
}

const MODES = () => (ui.mode === 'both' ? ['light', 'dark'] : [ui.mode]);
// The theme at the contrast level that the view shows: its own, or the more-contrast variant.
const atLevel = (theme) => (ui.contrast === 'more' && theme.more ? { ...theme, ...theme.more } : theme);

// The theme class for an element that shows `name`. Each theme class sets every token, from the
// theme's place in the tree, so one class is enough.
const themeClass = (name) => `theme-${name}`;

// ---- Views

// Each view has a link: #preview, #palettes, #tokens, or #audit.
const VIEWS = ['preview', 'palettes', 'tokens', 'audit'];
function showView(view) {
  ui.view = view;
  for (const t of document.querySelectorAll('[role="tab"][data-view]')) t.setAttribute('aria-selected', String(t.dataset.view === view));
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== view;
  // Tokens hold both modes, so the mode switch does not apply there.
  $('#mode').hidden = view === 'tokens';
  $('#menu-contrast').hidden = view === 'tokens';
  $('#mode-note').hidden = view !== 'tokens';
  // What the preview shows applies to the Preview tab only.
  $('#preview-bar').hidden = view !== 'preview';
  $('#preview-note').hidden = view === 'preview';
  renderSegs();
  renderView();
}
for (const tab of document.querySelectorAll('[role="tab"][data-view]')) {
  tab.addEventListener('click', () => {
    showView(tab.dataset.view);
    try { history.replaceState(null, '', `#${tab.dataset.view}`); } catch { /* the frame can refuse this */ }
  });
}

// The view menu opens under its button, at its right edge. The popover closes on Escape and on
// a click outside it.
$('#view-menu').addEventListener('toggle', (e) => {
  if (e.newState !== 'open') return;
  const r = $('#view-menu-btn').getBoundingClientRect();
  Object.assign($('#view-menu').style, { top: `${r.bottom + 6}px`, right: `${Math.max(16, innerWidth - r.right)}px`, left: 'auto' });
});

function renderView() {
  if (!built) return;
  if (ui.view === 'preview') renderPreview();
  if (ui.view === 'palettes') renderPalettes();
  if (ui.view === 'tokens') renderTokens();
  if (ui.view === 'audit') renderAudit();
}

// Which themes the preview shows. By default it follows the open theme. Picking
// themes yourself turns that off; "Follow" turns it on again.
const preview = { follow: true, shown: [], closed: new Set(), compare: 'side', details: { inverted: false, descendants: true } };
function shownThemes() {
  const picked = preview.follow ? [] : built.order.filter((n) => preview.shown.includes(n));
  // If the picked themes were removed or renamed, show the open theme.
  return picked.length ? picked : [state.selected];
}

function renderPreviewBar() {
  const shown = shownThemes();
  const chip = (label, pressed, onclick, swatch) => el('button', { class: 'chip', type: 'button', 'aria-pressed': String(pressed), onclick },
    swatch ? el('i', { style: `background:${swatch}` }) : null, label);
  const setShown = (names) => { preview.follow = false; preview.shown = names; renderView(); };
  $('#preview-bar').replaceChildren(
    'Show',
    chip('Follow the open theme', preview.follow, () => { preview.follow = !preview.follow; if (!preview.follow) preview.shown = [state.selected]; renderView(); }),
    el('span', { class: 'sep' }),
    ...built.order.map((n) => chip(labelOf(n), shown.includes(n), () => {
      const next = shown.includes(n) ? shown.filter((x) => x !== n) : [...shown, n];
      setShown(next.length ? next : [n]);
    }, built.themes[n].settings.action)),
    el('span', { class: 'sep' }),
    chip('All', !preview.follow && shown.length === built.order.length, () => setShown([...built.order])),
    el('span', { class: 'break' }),
    el('button', { class: 'chip', type: 'button', 'aria-pressed': String(pane.grid), title: 'Show the rhythm grid. Shortcut: the period key.', onclick: toggleGrid }, 'Grid ·'),
    el('button', { class: 'chip', type: 'button', 'aria-pressed': String(pane.photo), title: 'Show a photo behind the samples, colored with each theme\'s ramps.', onclick: () => { pane.photo = !pane.photo; applyPane(); renderPreviewBar(); paintPhotos(); } }, 'Photo backdrop'),
    ...(pane.photo ? [el('span', { class: 'break' }), ...photoSliders()] : []),
  );
}

let previewKey = '';
function renderPreview() {
  renderPreviewBar();
  const box = $('#previews');
  const shown = shownThemes();
  // Build the stages again only when their structure changes, so that form fields keep their state.
  // Labels are in the key too: the stages show them in headings, buttons, and descendant rows.
  const key = [MODES().join(), ui.contrast, ...shown.map((n) => `${themeClass(n)}:${built.themes[n].kind}`), JSON.stringify(built.order.map(labelOf))].join('|');
  if (key !== previewKey) {
    previewKey = key;
    box.replaceChildren(shown.length > 1 ? compareStrip(shown) : '', ...shown.map((name) => {
      const t = built.themes[name];
      const section = el('details', {
        class: 'theme-preview', open: !preview.closed.has(name), 'data-preview': name,
        ontoggle: (e) => { if (e.target.open) preview.closed.delete(name); else preview.closed.add(name); },
      },
        el('summary', {}, labelOf(name), el('span', {}, `theme-${name} · ${name === ROOT ? 'root' : `${t.kind} theme · ↳ ${labelOf(t.parent)}`}`)),
        el('div', { class: `stages ${ui.mode === 'both' ? 'both' : ''}` }, ...MODES().map((mode) => stageFor(name, mode))),
      );
      return section;
    }));
  }
  paintPhotos();
}

// ---- Photo backdrop: a photo behind each stage, as a gradient map of that theme's ramps.
// Each pixel's lightness picks the grade with the same luminance, from the base ramp, the
// action ramp, or a mix of the two. Contrast and brightness change the lightness first.
// Each stage draws it on its own canvas. Blur is a CSS filter, so it needs no new image.
const PHOTO = { hue: 0, blur: 8, contrast: 1, brightness: 0 };
let photoPixels = null; // the photo's lightness, 0 to 1 (the cube root of its luminance)
const photoImages = new Map(); // ramps and settings → the colored photo, as ImageData

async function loadPhoto() {
  if (photoPixels) return photoPixels;
  const img = new Image();
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = new URL('./backdrop.jpg', import.meta.url).href; });
  const w = 960;
  const h = Math.round((img.height * w) / img.width);
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const light = new Float32Array(w * h);
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  for (let i = 0; i < light.length; i++) light[i] = Math.cbrt(0.2126 * lin(data[4 * i]) + 0.7152 * lin(data[4 * i + 1]) + 0.0722 * lin(data[4 * i + 2]));
  photoPixels = { w, h, light };
  return photoPixels;
}

// 1024 colors, one for each lightness: the grade with that luminance, between ramp steps, in
// linear RGB. Grades of the same number have the same luminance in both ramps, so a linear mix
// of the two keeps it.
function photoLut(base, action) {
  const lin = (hex) => [1, 3, 5].map((i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const enc = (c) => Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
  const ramps = [base, action].map((steps) => GRADES.map((g) => lin(steps[g])));
  const lut = new Uint8ClampedArray(1024 * 3);
  for (let i = 0; i < 1024; i++) {
    const l = Math.min(1, Math.max(0, ((i / 1023 - 0.5) * PHOTO.contrast) + 0.5 + PHOTO.brightness));
    const y = l ** 3;
    const grade = Math.min(100, Math.max(0, (-100 * Math.log((y + 0.05) / 1.05)) / Math.log(21)));
    const k = Math.min(GRADES.length - 2, Math.floor(grade / 5));
    const f = grade / 5 - k;
    const at = (ramp, ch) => ramp[k][ch] * (1 - f) + ramp[k + 1][ch] * f;
    for (let ch = 0; ch < 3; ch++) lut[3 * i + ch] = enc(at(ramps[0], ch) * (1 - PHOTO.hue) + at(ramps[1], ch) * PHOTO.hue);
  }
  return lut;
}

async function photoImage(name) {
  const { base, action } = built.themes[name].palettes;
  const key = JSON.stringify([base.steps, action.steps, PHOTO.hue, PHOTO.contrast, PHOTO.brightness]);
  if (photoImages.has(key)) return photoImages.get(key);
  const { w, h, light } = await loadPhoto();
  const lut = photoLut(base.steps, action.steps);
  const out = new ImageData(w, h);
  for (let i = 0; i < light.length; i++) {
    const j = 3 * Math.round(light[i] * 1023);
    out.data[4 * i] = lut[j]; out.data[4 * i + 1] = lut[j + 1]; out.data[4 * i + 2] = lut[j + 2]; out.data[4 * i + 3] = 255;
  }
  // Keep a few: old settings are rarely needed again.
  if (photoImages.size > 24) photoImages.clear();
  photoImages.set(key, out);
  return out;
}

let photoRun = 0;
async function paintPhotos() {
  $('#previews').style.setProperty('--photo-blur', `${PHOTO.blur}px`);
  if (!pane.photo) return;
  const run = ++photoRun;
  for (const stage of document.querySelectorAll('#previews .stage[data-stage-theme]')) {
    const name = stage.dataset.stageTheme;
    if (!built.themes[name]) continue;
    const image = await photoImage(name);
    if (run !== photoRun) return; // newer settings started painting
    let canvas = stage.querySelector(':scope > canvas.stage-photo');
    if (!canvas) { canvas = el('canvas', { class: 'stage-photo', 'aria-hidden': 'true' }); stage.prepend(canvas); }
    if (canvas.width !== image.width) Object.assign(canvas, { width: image.width, height: image.height });
    canvas.getContext('2d').putImageData(image, 0, 0);
  }
}

// Sliders for the photo. Blur only changes CSS; the others color the photo again, at most once
// per frame while you drag.
let photoFrame = 0;
function photoSliders() {
  const slider = (label, key, min, max, step, show) => {
    const out = el('output', {}, show(PHOTO[key]));
    const input = el('input', { type: 'range', min, max, step, value: PHOTO[key], 'aria-label': label, oninput: (e) => {
      PHOTO[key] = Number(e.target.value);
      out.textContent = show(PHOTO[key]);
      pane.photoSettings = { ...PHOTO };
      store(PANE_KEY, pane);
      cancelAnimationFrame(photoFrame);
      photoFrame = requestAnimationFrame(paintPhotos);
    } });
    return el('label', { class: 'photo-slider' }, el('span', {}, label), input, out);
  };
  return [
    slider('Hue', 'hue', 0, 1, 0.05, (v) => (v === 0 ? 'base' : v === 1 ? 'action' : `${Math.round(v * 100)}% action`)),
    slider('Blur', 'blur', 0, 40, 1, (v) => `${v}px`),
    slider('Contrast', 'contrast', 0.2, 2, 0.05, (v) => `${Math.round(v * 100)}%`),
    slider('Brightness', 'brightness', -0.5, 0.5, 0.02, (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`),
  ];
}

// With more than one theme shown: each theme's button and a card, side by side,
// or nested, with each child's zone inside its parent's zone. One row for each mode.
function compareStrip(names) {
  const toggle = (value, label) => el('button', {
    type: 'button', 'aria-pressed': String(preview.compare === value),
    onclick: () => { preview.compare = value; previewKey = ''; renderView(); },
  }, label);
  return el('details', { class: 'theme-preview', open: !preview.closed.has('*compare'), ontoggle: (e) => { if (e.target.open) preview.closed.delete('*compare'); else preview.closed.add('*compare'); } },
    el('summary', {}, 'Compare', el('span', {}, `${names.length} themes`)),
    el('div', { class: 'seg compare-seg', role: 'group', 'aria-label': 'Compare layout' }, toggle('side', 'Side by side'), toggle('nested', 'Nested')),
    ...MODES().map((mode) => (preview.compare === 'nested'
      ? el('div', { class: 'nest-row' }, ...nestRoots(names).map((name) => zone(name, names, mode, true)))
      : el('div', { class: 'compare-row' }, ...names.map((name) => zone(name, [], mode, true))))),
  );
}

// The nearest shown parent of a theme, or null.
function shownParent(name, names) {
  for (let p = state.themes[name]?.parent; p; p = state.themes[p]?.parent) if (names.includes(p)) return p;
  return null;
}
const nestRoots = (names) => names.filter((n) => !shownParent(n, names));

// One theme's button and card, in the theme's class. Each zone paints its own canvas, so a
// theme with its own base color shows it.
function zone(name, names, mode, top) {
  const t = built.themes[name];
  const classes = top ? `stage tm-theme ${themeClass(name)}` : `nest-zone tm-theme ${themeClass(name)}`;
  const children = names.filter((n) => shownParent(n, names) === name);
  return el('div', { class: `${classes} compare-tile`, 'data-tm-mode': top ? mode : null, 'data-tm-contrast': top ? ui.contrast : null, 'data-stage-theme': name },
    el('span', { class: top ? 'stage-label' : 'zone-label' }, `${labelOf(name)}${top ? ` · ${mode}` : ` · ${t.kind}`}`),
    el('div', { class: 'tm-row' },
      el('button', { class: 'tm-button', type: 'button' }, `${labelOf(name)} button`),
      el('button', { class: 'tm-button tm-button--quiet', type: 'button' }, 'Quiet'),
      el('button', { class: 'tm-button tm-button--soft', type: 'button' }, 'Soft')),
    el('div', { class: 'tm-card' },
      el('h3', { class: 'tm-h3' }, `${labelOf(name)} card`),
      el('p', { class: 'tm-text tm-muted tm-small' }, 'A surface with its border, radius, and shadow.'),
      el('div', { class: 'tm-row' }, el('span', { class: 'tm-badge' }, 'Badge'), el('a', { class: 'tm-link', href: '#preview' }, 'Link'))),
    ...children.map((child) => zone(child, names, mode, false)),
  );
}

// The sample page in one theme and mode. The stage has the classes of the theme and
// all its parents, so a color theme shows its parent's look with its own color.
function stageFor(name, mode) {
  // NAME keeps ids unique on the page. {{theme}} names the parts after the theme, so each section is clear.
  const html = $('#sample').innerHTML.replaceAll('NAME', `${name}-${mode}`).replaceAll('{{theme}}', escapeHtml(labelOf(name)));
  const stage = el('div', { class: `stage tm-theme ${themeClass(name)}`, 'data-tm-mode': mode, 'data-tm-contrast': ui.contrast, 'data-stage-theme': name });
  stage.innerHTML = `<span class="stage-label">${escapeHtml(labelOf(name))} · ${mode}</span>${html}`;
  for (const play of stage.querySelectorAll('[data-play]')) play.addEventListener('click', () => stage.querySelector('[data-track]').classList.toggle('on'));
  // Every theme's button on this stage's background: the normal button, then the exact one.
  // Each theme class sets every token, so each button has its own theme's shape.
  // The buttons of this theme's descendants, in tree order, on this stage's background. A theme
  // with no children has no section.
  const isBelow = (n) => { for (let p = state.themes[n]?.parent; p; p = state.themes[p]?.parent) if (p === name) return true; return false; };
  const descendants = built.order.filter(isBelow);
  stage.querySelector('[data-descendant-buttons]').replaceChildren(...descendants.map((n) => el('button', { class: `tm-button theme-${n}`, type: 'button' }, labelOf(n))));
  stage.querySelector('[data-descendants-details]').hidden = !descendants.length;
  // Each collapsible section stays open or closed in every stage at once.
  for (const details of stage.querySelectorAll('[data-preview-details]')) {
    const key = details.dataset.previewDetails;
    details.open = preview.details[key];
    details.addEventListener('toggle', () => {
      preview.details[key] = details.open;
      for (const other of document.querySelectorAll(`[data-preview-details="${key}"]`)) other.open = details.open;
    });
  }
  for (const button of stage.querySelectorAll('[data-open]')) button.addEventListener('click', () => openDialog(stage.querySelector(`#${button.dataset.open}`)));
  for (const dialog of stage.querySelectorAll('dialog')) {
    for (const button of dialog.querySelectorAll('[data-close]')) button.addEventListener('click', () => closeDialog(dialog));
    // Escape and a click on the backdrop close it with the exit motion too.
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeDialog(dialog); });
    dialog.addEventListener('click', (e) => {
      const r = dialog.getBoundingClientRect();
      const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (e.target === dialog && outside) closeDialog(dialog);
    });
  }
  return stage;
}

// Open: show it, then add .is-open on the next frame, so the move in can run.
function openDialog(dialog) {
  dialog.showModal();
  requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-open')));
}

// Close: move it out, then close it when the move ends (or after a time limit).
function closeDialog(dialog) {
  if (!dialog.open) return;
  dialog.classList.remove('is-open');
  const done = () => { clearTimeout(timer); dialog.removeEventListener('transitionend', onEnd); dialog.close(); };
  const onEnd = (e) => { if (e.target === dialog && e.propertyName === 'transform') done(); };
  const timer = setTimeout(done, 1500);
  dialog.addEventListener('transitionend', onEnd);
}

function renderPalettes() {
  const view = $('#view-palettes');
  const theme = atLevel(selected());
  const { method, level } = theme.settings.contrast;
  // The selected theme's base, and the action color of every theme.
  const rows = [
    { id: 'base', label: `base of ${labelOf(state.selected)}`, palette: theme.palettes.base, theme: theme, ramp: 'base' },
    ...built.order.map((n) => ({ id: n, label: labelOf(n), palette: built.themes[n].palettes.action, note: `${built.themes[n].kind} theme`, theme: atLevel(built.themes[n]), ramp: 'action' })),
  ];
  // The tokens that use each grade of a row, in one mode.
  const usage = (row, mode) => {
    const used = {};
    for (const [token, t] of Object.entries(row.theme.modes[mode].tokens)) {
      const [ramp, g] = t.ref.split('.');
      if (ramp === row.ramp) (used[g] ??= []).push(token);
    }
    return used;
  };
  const byId = Object.fromEntries(rows.map((r) => [r.id, r.palette]));
  const gaps = gradeGaps(rows.map((r) => r.palette), contrastTest(theme.settings.contrast));
  const gap = (purpose, label) => el('span', {}, `${label} `, el('b', {}, gaps[purpose] ?? '—'));
  const swatch = (row, g, used) => {
    const hex = row.palette.steps[g];
    const id = `${row.id}.${g}`;
    const isKey = nearestGrade(row.palette.keyGrade) === g;
    const tokens = used[g] ?? [];
    return el('button', {
      type: 'button', class: `sw ${isKey ? 'key' : ''} ${ui.pickA === id ? 'pick-a' : ''} ${ui.pickB === id ? 'pick-b' : ''}`,
      style: `background:${hex};color:${g >= 50 ? '#fff' : '#000'}`,
      title: `${id} ${hex}${isKey ? ' (nearest to the key color)' : ''}${tokens.length ? `\nUsed by: ${tokens.join(', ')}` : ''}`,
      onclick: () => {
        if (!ui.pickA || ui.pickB) { ui.pickA = id; ui.pickB = null; } else ui.pickB = id;
        renderPalettes();
      },
    }, el('b', {}, g));
  };
  const hexOf = (id) => { const i = id.lastIndexOf('.'); return byId[id.slice(0, i)]?.steps[id.slice(i + 1)]; };
  const compare = () => {
    if (!ui.pickA) return el('div', { class: 'compare' }, el('span', { class: 'fader-hint' }, 'Select two swatches to compare them: text first, then background.'));
    const a = hexOf(ui.pickA);
    const b = ui.pickB ? hexOf(ui.pickB) : null;
    if (!a) { ui.pickA = null; return compare(); }
    // The hex codes are not on the chips, to keep each ramp on one row: copy them from here.
    const copy = (id, hex) => el('button', { type: 'button', class: 'small-btn', title: `Copy ${hex}`, onclick: (e) => { navigator.clipboard?.writeText(hex); e.currentTarget.textContent = 'Copied'; } }, `${id} ${hex} ⧉`);
    if (!b) return el('div', { class: 'compare' }, copy(ui.pickA, a), el('span', {}, 'Text. Now select a background.'));
    const m = measure(a, b);
    const grade = (id) => Number(id.slice(id.lastIndexOf('.') + 1));
    return el('div', { class: 'compare' },
      el('span', { class: 'demo-text', style: `color:${a};background:${b}` }, 'Field report'),
      copy(ui.pickA, a), el('span', {}, 'on'), copy(ui.pickB, b),
      el('span', { class: 'fader-hint' }, `grade difference ${Math.abs(grade(ui.pickA) - grade(ui.pickB))}`),
      el('b', {}, `${m.wcag}:1`), el('b', {}, `Lc ${m.apca}`),
      ...['text', 'large', 'ui'].map((p) => passPill(p, a, b)),
    );
  };
  view.replaceChildren(
    el('div', { class: 'gaps' },
      el('strong', {}, 'Grade gaps'), gap('text', 'text'), gap('large', 'large text'), gap('ui', 'controls'),
      el('p', {}, `Any two grades at least this far apart pass ${method === 'apca' ? 'APCA, with the WCAG 2 floor,' : 'WCAG 2'} (${level}, the setting of ${labelOf(state.selected)}), in every palette below, in both directions. Grades with the same number have the same luminance.`)),
    // One panel for each mode, on that mode's canvas. ×n on a swatch counts the tokens that use it in that mode.
    ...MODES().map((mode) => {
      const tokens = theme.modes[mode].tokens;
      return el('div', { class: 'pal-mode', style: `background:${tokens['bg.canvas'].value};color:${tokens['fg.base'].value}` },
        el('h3', {}, `${mode} mode`),
        ...rows.map((row) => el('div', { class: 'pal' },
          el('div', { class: 'pal-head' }, el('h3', {}, row.label), el('span', {}, `key ${row.palette.key} · grade ${row.palette.keyGrade}`), row.note ? el('span', {}, row.note) : null),
          el('div', { class: 'swatches' }, ...GRADES.map((g) => swatch(row, g, usage(row, mode)))))));
    }),
    compare(),
  );
}

function passPill(purpose, fg, bg) {
  const { method, level } = selected().settings.contrast;
  const m = measure(fg, bg);
  // WCAG 2 always applies. APCA mode adds the APCA threshold on top.
  const ok = m.wcag >= THRESHOLDS.wcag[level][purpose] && (method !== 'apca' || Math.abs(m.apca) >= THRESHOLDS.apca[level][purpose]);
  return el('span', { class: `pill ${ok ? 'pass' : 'fail'}` }, `${purpose} ${ok ? 'pass' : 'fail'}`);
}

const nearestGrade = (g) => GRADES.reduce((best, x) => (Math.abs(x - g) < Math.abs(best - g) ? x : best));

// Each format, and a line that says how to use it.
const FORMAT_NOTES = {
  stylesheet: 'Ready to use: the tokens and the components in one file. Link it, then use class="tm-button", class="theme-danger", and the other classes.',
  css: 'The tokens as CSS custom properties, one rule for each theme. Use them with your own CSS.',
  dtcg: 'The tokens as Design Tokens Community Group JSON, for design tools and token pipelines such as Style Dictionary.',
  tailwind: 'A Tailwind CSS v4 theme. Add the CSS tokens too: these names point at them.',
  shadcn: 'For shadcn/ui: paste into globals.css in place of its :root and .dark blocks. Child themes become classes, such as .theme-danger.',
  inputs: 'Your themes as inputs. Open this file again here, or build the tokens from it with the engine.',
};

function tokenText() {
  if (ui.format === 'stylesheet') return `${toCss(built)}\n/* ---- themetron components */\n\n${componentsCss}`;
  if (ui.format === 'shadcn') return toShadcn(built);
  if (ui.format === 'css') return toCss(built);
  if (ui.format === 'dtcg') return JSON.stringify(toDtcg(built), null, 2);
  if (ui.format === 'tailwind') return toTailwind(built);
  return JSON.stringify({ version: INPUTS_VERSION, ...rawInputs() }, null, 2);
}

function renderTokens() {
  $('#format-note').textContent = FORMAT_NOTES[ui.format];
  const inputs = ui.format === 'inputs';
  $('#code').hidden = inputs;
  $('#io').hidden = !inputs;
  if (inputs) {
    if (document.activeElement !== $('#io-text')) $('#io-text').value = tokenText();
  } else {
    $('#code').textContent = tokenText();
  }
}

$('#copy').addEventListener('click', async (e) => {
  const text = ui.format === 'inputs' ? $('#io-text').value : tokenText();
  try {
    await navigator.clipboard.writeText(text);
    e.target.textContent = 'Copied';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(ui.format === 'inputs' ? $('#io-text') : $('#code'));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    e.target.textContent = 'Selected. Press Ctrl+C or ⌘C';
  }
  setTimeout(() => { e.target.textContent = 'Copy'; }, 1800);
});

// ---- Import and export: the inputs as JSON text, a file, or a link.

// Load inputs ({ themes }) in place of the current ones. Throws if they are not valid.
// Without a version, inputs are the current version.
function loadInputs(next, version = next?.version ?? INPUTS_VERSION) {
  if (!next || typeof next !== 'object' || typeof next.themes !== 'object') throw new Error('Use an object with a "themes" field, as in the Inputs view.');
  buildThemes({ version, ...rawInputs(next.themes) });
  state = { selected: ROOT, themes: expandPresets(toRoles({ [ROOT]: {}, ...structuredClone(next.themes) }, version)) };
  renderAll();
}
const loadMessage = (err) => (err instanceof SyntaxError ? `The JSON is not valid: ${err.message}` : err.message);

$('#io-apply').addEventListener('click', () => {
  try {
    loadInputs(JSON.parse($('#io-text').value));
    $('#io-note').textContent = 'Applied.';
  } catch (err) {
    $('#io-note').textContent = loadMessage(err);
  }
});

$('#io-open').addEventListener('click', () => $('#io-file').click());
$('#io-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    loadInputs(JSON.parse(await file.text()));
    $('#io-note').textContent = `Opened ${file.name}.`;
  } catch (err) {
    $('#io-note').textContent = `${file.name}: ${loadMessage(err)}`;
  }
});

// Download the format on screen as a file.
const DOWNLOADS = {
  stylesheet: ['themetron.bundle.css', 'text/css'],
  shadcn: ['themetron.shadcn.css', 'text/css'],
  css: ['themetron.css', 'text/css'],
  dtcg: ['themetron.tokens.json', 'application/json'],
  tailwind: ['themetron.tailwind.css', 'text/css'],
  inputs: ['themetron-inputs.json', 'application/json'],
};
$('#download').addEventListener('click', () => {
  const [name, type] = DOWNLOADS[ui.format];
  const text = ui.format === 'inputs' ? $('#io-text').value : tokenText();
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// A share link holds the inputs, compressed, in ?t=. Opening it loads them.
const toBase64Url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}
async function shareLink() {
  const bytes = await pipe(new TextEncoder().encode(JSON.stringify({ version: INPUTS_VERSION, ...rawInputs() })), new CompressionStream('deflate-raw'));
  const url = new URL(location.href);
  url.search = `?t=${toBase64Url(bytes)}`;
  url.hash = ui.view === 'preview' ? '' : ui.view;
  return url.href;
}
$('#share').addEventListener('click', async (e) => {
  const button = e.currentTarget;
  const url = await shareLink();
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = 'Link copied';
  } catch {
    prompt('Copy this link:', url);
  }
  setTimeout(() => { button.textContent = 'Copy share link'; }, 1800);
});

async function loadSharedLink() {
  const t = new URLSearchParams(location.search).get('t');
  if (!t) return;
  try {
    const json = new TextDecoder().decode(await pipe(fromBase64Url(t), new DecompressionStream('deflate-raw')));
    // Links from before version 2 have no version.
    const next = JSON.parse(json);
    loadInputs(next, next.version ?? 1);
  } catch (err) {
    $('#error').textContent = `The link's themes could not load: ${loadMessage(err)}`;
    $('#error').hidden = false;
  }
  // Take the themes out of the address, so a reload keeps your later changes.
  try { history.replaceState(null, '', location.pathname + location.hash); } catch { /* the frame can refuse this */ }
}

function renderAudit() {
  const view = $('#view-audit');
  const theme = atLevel(selected());
  const { method, level } = theme.settings.contrast;
  const all = MODES().flatMap((m) => theme.modes[m].audit);
  const fails = all.filter((a) => a.required && !a.pass);
  const std = `${method === 'apca' ? 'APCA, with the WCAG 2 floor,' : 'WCAG 2'} (${level})`;
  view.replaceChildren(
    el('p', { class: 'audit-sum' }, `The ${labelOf(state.selected)} theme. `, fails.length
      ? `${fails.length} of ${all.filter((a) => a.required).length} required pairs fail ${std}. No grade in the palette can pass, so themetron used the grade with the most contrast.`
      : `All ${all.filter((a) => a.required).length} required pairs pass ${std}. "Warn" marks the exact button where its colors miss the setting: it uses the key color exactly, so it cannot always pass.`),
    ...MODES().map((mode) => {
      const { audit, tokens } = theme.modes[mode];
      return el('div', { class: 'tablewrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ...[`${mode} mode`, 'Text or part', 'On', 'Purpose', 'WCAG', 'APCA', 'Result'].map((h) => el('th', {}, h)))),
        el('tbody', {}, ...audit.map((a) => el('tr', {},
          el('td', {}, el('span', { class: 'aa', style: `color:${tokens[a.fg].value};background:${tokens[a.bg].value}` }, a.purpose === 'ui' ? '■ ▲' : 'Aa')),
          el('td', {}, el('code', {}, a.fg), el('span', { class: 'fader-hint' }, ` ${tokens[a.fg].ref}`)),
          el('td', {}, el('code', {}, a.bg), el('span', { class: 'fader-hint' }, ` ${tokens[a.bg].ref}`)),
          el('td', {}, a.purpose),
          el('td', { class: 'num' }, `${a.wcag.toFixed(2)}:1`),
          el('td', { class: 'num' }, `Lc ${a.apca.toFixed(1)}`),
          el('td', {}, (() => {
            // Every pair is guaranteed, except the exact button's, which warns where it misses.
            const status = a.pass ? 'pass' : a.warn ? 'warn' : 'fail';
            return el('span', { class: `pill ${status}` }, status);
          })()),
        ))),
      ));
    }),
  );
}

// ---- The rhythm grid overlay: the Grid button in Preview, or the period key.

function toggleGrid() {
  pane.grid = !pane.grid;
  applyPane();
  renderPreviewBar();
}
document.addEventListener('keydown', (e) => {
  if (e.key !== '.' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return;
  toggleGrid();
});

// ---- The inputs pane: drag or arrow keys to resize, a button to hide it.

const PANE_KEY = 'themetron-playground-pane';
const pane = { width: 340, collapsed: false, grid: false, photo: false, closedSections: [], ...load(PANE_KEY) };
Object.assign(PHOTO, pane.photoSettings);
const MIN_W = 260;
const MAX_W = 640;
function applyPane() {
  pane.width = Math.min(MAX_W, Math.max(MIN_W, Math.round(pane.width)));
  const app = $('.app');
  app.style.setProperty('--controls-w', `${pane.width}px`);
  app.classList.toggle('collapsed', pane.collapsed);
  $('#previews').classList.toggle('show-grid', pane.grid);
  $('#previews').classList.toggle('photo-backdrop', pane.photo);
  $('#splitter').setAttribute('aria-valuenow', pane.width);
  // A chevron on screen, which CSS turns when the pane is hidden. The label says what it does.
  const label = pane.collapsed ? 'Show inputs' : 'Hide inputs';
  $('#pane-toggle').setAttribute('aria-label', label);
  $('#pane-toggle').title = label;
  $('#pane-toggle').setAttribute('aria-expanded', String(!pane.collapsed));
  store(PANE_KEY, pane);
}
$('#pane-toggle').addEventListener('click', () => { pane.collapsed = !pane.collapsed; applyPane(); });
const splitter = $('#splitter');
splitter.addEventListener('pointerdown', (e) => {
  splitter.setPointerCapture(e.pointerId);
  splitter.classList.add('dragging');
  const move = (ev) => { pane.width = ev.clientX - $('.app').getBoundingClientRect().left; applyPane(); };
  const up = () => { splitter.classList.remove('dragging'); splitter.removeEventListener('pointermove', move); splitter.removeEventListener('pointerup', up); };
  splitter.addEventListener('pointermove', move);
  splitter.addEventListener('pointerup', up);
});
splitter.addEventListener('keydown', (e) => {
  const step = e.shiftKey ? 64 : 16;
  if (e.key === 'ArrowLeft') pane.width -= step;
  else if (e.key === 'ArrowRight') pane.width += step;
  else if (e.key === 'Home') pane.width = MIN_W;
  else if (e.key === 'End') pane.width = MAX_W;
  else return;
  e.preventDefault();
  applyPane();
});

function renderAll() {
  previewKey = '';
  built = null;
  openCard = state.selected;
  renderThemes();
  update();
}

applyPane();
renderAll();
loadSharedLink();
if (VIEWS.includes(location.hash.slice(1))) showView(location.hash.slice(1));

// The preset menu closes when you click outside it, or press Escape.
document.addEventListener('click', (e) => {
  const menu = $('#preset-menu');
  if (menu?.open && !menu.contains(e.target)) menu.open = false;
});
document.addEventListener('keydown', (e) => {
  const menu = $('#preset-menu');
  if (e.key === 'Escape' && menu?.open) { menu.open = false; menu.querySelector('summary').focus(); }
});
