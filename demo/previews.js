// Previews of the framework formats: each format on its framework's own stock parts, in an
// iframe, so the framework's CSS stays out of the playground. The playground loads this file,
// and each framework, when you first open a preview. Each preview has two forms: the colors
// only, and with themetron's looks on the framework's parts, as in the format's download.
// Tailwind CSS, daisyUI, and shadcn/ui compile here with Tailwind's own compiler, and Bootstrap
// Sass with Sass. MUI is a React page of its own, mui-preview.html.
import { ROOT, themeName } from '../src/inputs.js';
import { toCss, toTailwind, toShadcn, toDaisyui, toBootstrapSass, toBootstrapCss, toBootstrapLooks, toMui, toMuiLooks } from '../src/export.js';

// ---- Compilers. Each loads once.

const once = (load) => { let p; return () => (p ??= load()); };

const tailwindFiles = once(async () => {
  const [index, theme, preflight, utilities] = await Promise.all([
    import('tailwindcss/index.css?raw'), import('tailwindcss/theme.css?raw'),
    import('tailwindcss/preflight.css?raw'), import('tailwindcss/utilities.css?raw'),
  ]);
  return { tailwindcss: index.default, './theme.css': theme.default, './preflight.css': preflight.default, './utilities.css': utilities.default };
});
const daisyuiModules = once(async () => {
  const [plugin, theme] = await Promise.all([import('daisyui'), import('daisyui/theme')]);
  return { daisyui: plugin.default, 'daisyui/theme': theme.default };
});

// The class names in some HTML: Tailwind makes CSS for these only.
const candidates = (html) => [...new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean))];

// Compile a Tailwind CSS v4 stylesheet for some HTML.
async function tailwind(css, html, modules = {}) {
  const [{ compile }, files] = await Promise.all([import('tailwindcss'), tailwindFiles()]);
  const compiler = await compile(css, {
    base: '/',
    loadStylesheet: async (id, base) => {
      if (!(id in files)) throw new Error(`The preview has no stylesheet ${id}.`);
      return { path: id, base, content: files[id] };
    },
    loadModule: async (id, base) => {
      if (!(id in modules)) throw new Error(`The preview has no module ${id}.`);
      return { path: id, base, module: modules[id] };
    },
  });
  return compiler.build(candidates(html));
}

// Bootstrap's Sass files, by path under bootstrap/scss/.
const bootstrapScss = once(async () => {
  const files = import.meta.glob('../node_modules/bootstrap/scss/**/*.scss', { query: '?raw', import: 'default' });
  const entries = await Promise.all(Object.entries(files).map(async ([path, load]) => [path.replace(/^.*\/bootstrap\/scss\//, ''), await load()]));
  return Object.fromEntries(entries);
});

// Compile Sass that imports Bootstrap. A result is kept for each text, since Sass is slow.
const sassResults = new Map();
async function bootstrapSass(scss) {
  if (sassResults.has(scss)) return sassResults.get(scss);
  const [sass, files] = await Promise.all([import('sass'), bootstrapScss()]);
  // A path in an @import: _name.scss, name.scss, or name/_index.scss, next to the file.
  const find = (url, from) => {
    const dir = from ? from.split('/').slice(0, -1) : [];
    const parts = url.replace(/^bootstrap\/scss\//, '').split('/');
    const path = [...(url.startsWith('bootstrap/scss/') ? [] : dir), ...parts].reduce((out, p) => (p === '..' ? out.slice(0, -1) : p === '.' ? out : [...out, p]), []);
    const name = path.pop();
    const stem = path.length ? `${path.join('/')}/` : '';
    return [`${stem}_${name}.scss`, `${stem}${name}.scss`, `${stem}${name}/_index.scss`].find((p) => p in files);
  };
  const importer = {
    canonicalize: (url, { containingUrl }) => {
      const from = containingUrl?.protocol === 'bootstrap:' ? containingUrl.pathname : null;
      const path = find(url, from);
      return path ? new URL(`bootstrap:${path}`) : null;
    },
    load: (url) => ({ contents: files[url.pathname], syntax: 'scss' }),
  };
  const { css } = await sass.compileStringAsync(scss, {
    importers: [importer],
    logger: sass.Logger.silent,
    quietDeps: true,
    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'mixed-decls', 'abs-percent', 'if-function'].filter((d) => d in sass.deprecations),
  });
  sassResults.set(scss, css);
  return css;
}

// ---- Pages. Each sample has a light and a dark section, side by side, and a row for each
// child theme.

const page = (head, body) => `<!doctype html><meta charset="utf-8">${head}
<style>body { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); }</style>
${body}`;
const style = (css) => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`;
const childrenOf = (built) => built.order.filter((name) => name !== ROOT);
const title = (mode) => (mode === 'light' ? 'Light' : 'Dark');

function bootstrapSample(mode, children) {
  return `<section data-bs-theme="${mode}" class="p-4 bg-body text-body">
  <h2 class="h5 mb-3">${title(mode)}</h2>
  <div class="d-flex flex-wrap gap-2 mb-3">
    <button class="btn btn-primary">Primary</button><button class="btn btn-secondary">Secondary</button>
    <button class="btn btn-success">Success</button><button class="btn btn-danger">Danger</button>
    <button class="btn btn-warning">Warning</button><button class="btn btn-info">Info</button>
    <button class="btn btn-outline-primary">Outline</button><button class="btn btn-outline-danger">Outline</button><button class="btn btn-link">Link</button>
  </div>
  <p>Body text with <a href="#">a link</a>, <strong>strong</strong> text, and <code>code</code>. <span class="text-body-secondary">Secondary text.</span></p>
  <div class="d-flex flex-wrap gap-2 mb-3">
    <span class="badge text-bg-primary">Primary</span><span class="badge text-bg-success">Success</span>
    <span class="badge text-bg-danger">Danger</span><span class="badge text-bg-warning">Warning</span>
    <span class="badge rounded-pill text-bg-info">Info</span>
  </div>
  <div class="alert alert-primary">A primary alert, with <a href="#" class="alert-link">a link</a>.</div>
  <div class="alert alert-danger">A danger alert.</div>
  <div class="row g-3 mb-3">
    <div class="col-sm-6">
      <label class="form-label" for="e-${mode}">Email</label>
      <input class="form-control" id="e-${mode}" placeholder="ada@example.org">
      <div class="form-text">A hint under the field.</div>
    </div>
    <div class="col-sm-6">
      <label class="form-label" for="s-${mode}">City</label>
      <select class="form-select" id="s-${mode}"><option>Harbor</option><option>Tide</option></select>
    </div>
    <div class="col-12 d-flex flex-wrap gap-3">
      <div class="form-check"><input class="form-check-input" type="checkbox" id="c-${mode}" checked><label class="form-check-label" for="c-${mode}">Check</label></div>
      <div class="form-check"><input class="form-check-input" type="radio" name="r-${mode}" id="r-${mode}" checked><label class="form-check-label" for="r-${mode}">Radio</label></div>
      <div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="w-${mode}" checked><label class="form-check-label" for="w-${mode}">Switch</label></div>
      <input type="range" class="form-range w-auto flex-grow-1">
    </div>
  </div>
  <ul class="nav nav-tabs mb-3"><li class="nav-item"><a class="nav-link active" href="#">Active</a></li><li class="nav-item"><a class="nav-link" href="#">Tab</a></li><li class="nav-item"><a class="nav-link disabled">Disabled</a></li></ul>
  <div class="row g-3 mb-3">
    <div class="col-sm-6"><div class="card"><div class="card-header">Card</div><div class="card-body"><h3 class="card-title h6">Card title</h3><p class="card-text">Some text in a card.</p><a href="#" class="btn btn-primary btn-sm">Go</a></div></div></div>
    <div class="col-sm-6"><ul class="list-group"><li class="list-group-item active">Active item</li><li class="list-group-item">Item</li><li class="list-group-item list-group-item-action">Action item</li></ul></div>
  </div>
  <div class="progress mb-3" role="progressbar" aria-label="Progress"><div class="progress-bar" style="width: 60%">60%</div></div>
  <nav aria-label="Pages"><ul class="pagination"><li class="page-item"><a class="page-link" href="#">1</a></li><li class="page-item active"><a class="page-link" href="#">2</a></li><li class="page-item"><a class="page-link" href="#">3</a></li></ul></nav>
  ${children.length ? `<h3 class="h6 mt-4">Child themes</h3>${children.map((name) => `<div class="theme-${name} d-flex flex-wrap align-items-center gap-2 mb-2"><button class="btn btn-primary btn-sm">${name}</button><button class="btn btn-outline-primary btn-sm">Outline</button><span class="badge text-bg-primary">Badge</span><a href="#">A link</a></div>`).join('')}` : ''}
</section>`;
}
const bootstrapBody = (built) => ['light', 'dark'].map((mode) => bootstrapSample(mode, childrenOf(built))).join('\n');

// Tailwind CSS has no parts of its own, so this sample makes them from utilities: with the
// colors only, from the theme's color names, and with looks, from the tm-look-* utilities.
function tailwindSample(mode, children, looks) {
  const c = (colors, look) => (looks ? look : colors);
  const btn = 'px-4 py-2 text-sm font-medium';
  const button = (label, colors, look, extra = '') => `<button class="${btn} ${c(`rounded-control ${colors}`, look)} ${extra}">${label}</button>`;
  const solid = (label, extra) => button(label, 'bg-fill-action text-on-fill-action hover:opacity-90', 'tm-look-fill', extra);
  return `<section data-tm-mode="${mode}" class="p-6 bg-bg-canvas text-fg-base font-sans">
  <h2 class="font-heading text-lg font-semibold mb-4">${title(mode)}</h2>
  <div class="flex flex-wrap gap-2 mb-4">
    ${solid('Primary')}
    ${button('Tint', 'bg-tint-action text-on-tint-action hover:opacity-90', 'tm-look-tint')}
    ${button('Quiet', 'bg-tint-base text-on-tint-base hover:opacity-90', 'tm-look-quiet')}
    ${button('Outline', 'border border-border-action text-fg-action hover:bg-tint-action', 'tm-look-outline')}
    ${button('Ghost', 'text-fg-action hover:bg-tint-action', 'tm-look-ghost')}
    ${solid('Danger', 'theme-danger')}
    ${button('Outline', 'border border-border-action text-fg-action hover:bg-tint-action', 'tm-look-outline', 'theme-danger')}
  </div>
  <p class="mb-4">Body text with <a href="#" class="${c('text-fg-action underline', 'tm-look-gradient-text underline')}">a link</a>. <span class="text-fg-base-muted">Muted text.</span></p>
  <div class="grid gap-4 sm:grid-cols-2 mb-4">
    <div class="p-5 ${c('rounded-lg border border-border-base bg-bg-surface shadow-md', 'tm-look-surface')}">
      <h3 class="font-heading font-semibold mb-1">Card title</h3>
      <p class="text-sm text-fg-base-muted mb-3">Some text in a card.</p>
      ${button('Go', 'bg-fill-action text-on-fill-action', 'tm-look-fill')}
    </div>
    <div class="flex flex-col gap-3">
      <label class="text-sm font-medium">Email
        <input class="mt-1 block w-full px-3 py-2 text-sm ${c('rounded-control border border-border-base-field bg-bg-field', 'tm-look-field')}" placeholder="ada@example.org"></label>
      <label class="text-sm font-medium">Notes
        <textarea class="mt-1 block w-full px-3 py-2 text-sm ${c('rounded-control border border-border-base-field bg-bg-field', 'tm-look-field')}" rows="2"></textarea></label>
      <div class="flex items-center gap-3 p-3 ${c('rounded-lg border-2 border-border-action', 'tm-look-ring rounded-lg')}">A ring</div>
    </div>
  </div>
  ${children.length ? `<h3 class="font-heading font-semibold mb-2">Child themes</h3>${children.map((name) => `<div class="theme-${name} flex flex-wrap items-center gap-2 mb-2">${solid(name)}${button('Outline', 'border border-border-action text-fg-action', 'tm-look-outline')}<a href="#" class="${c('text-fg-action underline', 'tm-look-gradient-text underline')}">A link</a></div>`).join('')}` : ''}
</section>`;
}

function daisyuiSample(mode, children, name) {
  return `<section data-theme="${mode === 'light' ? name : `${name}-dark`}" class="p-6 bg-base-200 text-base-content">
  <h2 class="text-lg font-semibold mb-4">${title(mode)}</h2>
  <div class="flex flex-wrap gap-2 mb-4">
    <button class="btn btn-primary">Primary</button><button class="btn btn-secondary">Secondary</button><button class="btn btn-accent">Accent</button><button class="btn">Plain</button>
    <button class="btn btn-outline btn-primary">Outline</button><button class="btn btn-soft btn-primary">Soft</button><button class="btn btn-ghost">Ghost</button><button class="btn btn-link">Link</button>
  </div>
  <div class="flex flex-wrap gap-2 mb-4">
    <button class="btn btn-error">Error</button><button class="btn btn-warning">Warning</button><button class="btn btn-success">Success</button><button class="btn btn-info">Info</button><button class="btn btn-outline btn-error">Outline</button>
  </div>
  <div class="flex flex-wrap gap-2 mb-4">
    <span class="badge badge-primary">Primary</span><span class="badge badge-secondary">Secondary</span><span class="badge badge-error">Error</span><span class="badge badge-warning">Warning</span><span class="badge badge-outline">Outline</span>
  </div>
  <p class="mb-4">Body text with <a href="#" class="link link-primary">a link</a>.</p>
  <div role="alert" class="alert alert-info mb-2"><span>An info alert.</span></div>
  <div role="alert" class="alert alert-error mb-4"><span>An error alert.</span></div>
  <div class="grid gap-4 sm:grid-cols-2 mb-4">
    <div class="card bg-base-100 shadow-sm"><div class="card-body"><h3 class="card-title">Card title</h3><p>Some text in a card.</p><div class="card-actions justify-end"><button class="btn btn-primary btn-sm">Go</button></div></div></div>
    <div class="flex flex-col gap-3">
      <input class="input w-full" placeholder="ada@example.org">
      <select class="select w-full"><option>Harbor</option><option>Tide</option></select>
      <textarea class="textarea w-full" rows="2" placeholder="Notes"></textarea>
      <div class="flex flex-wrap items-center gap-4"><input type="checkbox" class="checkbox checkbox-primary" checked><input type="radio" class="radio radio-primary" checked><input type="checkbox" class="toggle toggle-primary" checked></div>
      <input type="range" class="range range-primary range-sm" value="60">
    </div>
  </div>
  <div role="tablist" class="tabs tabs-box mb-4"><a role="tab" class="tab tab-active">Active</a><a role="tab" class="tab">Tab</a><a role="tab" class="tab tab-disabled">Disabled</a></div>
  <progress class="progress progress-primary w-full mb-4" value="60" max="100"></progress>
  <div class="join mb-2"><button class="join-item btn">1</button><button class="join-item btn btn-active">2</button><button class="join-item btn">3</button></div>
  ${children.length ? `<h3 class="font-semibold mt-4 mb-2">Child themes</h3>${children.map((n) => `<div class="theme-${n} flex flex-wrap items-center gap-2 mb-2"><button class="btn btn-primary btn-sm">${n}</button><button class="btn btn-outline btn-primary btn-sm">Outline</button><span class="badge badge-primary">Badge</span><a href="#" class="link link-primary">A link</a></div>`).join('')}` : ''}
</section>`;
}

// shadcn/ui's parts are React components. This sample is the HTML they make, with the classes of
// shadcn/ui's new-york-v4 registry.
const SHADCN_BUTTON = {
  base: "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2",
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
  outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
  link: 'text-primary underline-offset-4 hover:underline',
};
const SHADCN_BADGE = {
  base: 'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-white dark:bg-destructive/60',
  outline: 'border-border text-foreground',
};
const SHADCN_INPUT = 'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground md:text-sm dark:bg-input/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';
const shadcnButton = (variant, label, extra = '') => `<button data-slot="button" data-variant="${variant}" data-size="default" class="${SHADCN_BUTTON.base} ${SHADCN_BUTTON[variant]} ${extra}">${label}</button>`;
const shadcnBadge = (variant, label) => `<span data-slot="badge" data-variant="${variant}" class="${SHADCN_BADGE.base} ${SHADCN_BADGE[variant]}">${label}</span>`;

function shadcnSample(mode, children) {
  return `<section class="${mode === 'dark' ? 'dark ' : ''}p-6 bg-background text-foreground">
  <h2 class="text-lg font-semibold mb-4">${title(mode)}</h2>
  <div class="flex flex-wrap gap-2 mb-4">
    ${['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'].map((v) => shadcnButton(v, v[0].toUpperCase() + v.slice(1))).join('')}
  </div>
  <div class="flex flex-wrap gap-2 mb-4">${['default', 'secondary', 'destructive', 'outline'].map((v) => shadcnBadge(v, v[0].toUpperCase() + v.slice(1))).join('')}</div>
  <div data-slot="alert" role="alert" class="relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm bg-card text-card-foreground mb-4"><div data-slot="alert-title" class="col-start-2 font-medium tracking-tight">An alert</div><div data-slot="alert-description" class="col-start-2 text-sm text-muted-foreground">With a description.</div></div>
  <div class="grid gap-4 sm:grid-cols-2 mb-4">
    <div data-slot="card" class="flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm">
      <div data-slot="card-header" class="grid auto-rows-min items-start gap-2 px-6"><div data-slot="card-title" class="leading-none font-semibold">Card title</div><div data-slot="card-description" class="text-sm text-muted-foreground">Some text in a card.</div></div>
      <div data-slot="card-footer" class="flex items-center gap-2 px-6">${shadcnButton('default', 'Go')}${shadcnButton('outline', 'Later')}</div>
    </div>
    <div class="flex flex-col gap-3">
      <label class="grid gap-2 text-sm font-medium">Email<input data-slot="input" class="${SHADCN_INPUT}" placeholder="ada@example.org"></label>
      <label class="grid gap-2 text-sm font-medium">Notes<textarea data-slot="textarea" rows="2" class="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground md:text-sm dark:bg-input/30"></textarea></label>
      <div class="flex items-center gap-4 text-sm">
        <span class="flex items-center gap-2"><button role="checkbox" aria-checked="true" data-slot="checkbox" data-state="checked" class="peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"></button>Check</span>
        <span class="flex items-center gap-2"><button role="switch" aria-checked="true" data-slot="switch" data-state="checked" data-size="default" class="peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"><span data-slot="switch-thumb" data-state="checked" class="pointer-events-none block size-4 rounded-full bg-background ring-0 data-[state=checked]:translate-x-[calc(100%-2px)] dark:data-[state=checked]:bg-primary-foreground"></span></button>Switch</span>
      </div>
      <div data-slot="progress" class="relative h-2 w-full overflow-hidden rounded-full bg-primary/20"><div data-slot="progress-indicator" class="h-full w-3/5 bg-primary"></div></div>
    </div>
  </div>
  ${children.length ? `<h3 class="font-semibold mb-2">Child themes</h3>${children.map((n) => `<div class="theme-${n} flex flex-wrap items-center gap-2 mb-2">${shadcnButton('default', n)}${shadcnButton('outline', 'Outline')}${shadcnBadge('default', 'Badge')}</div>`).join('')}` : ''}
</section>`;
}

// shadcn/ui's globals.css, after its :root and .dark blocks: the Tailwind names for its variables.
const SHADCN_THEME = `@custom-variant dark (&:is(.dark *));
@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
${['background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'border', 'input', 'ring'].map((n) => `  --color-${n}: var(--${n});`).join('\n')}
}
@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}`;

// ---- The previews, by format. Each makes the frame's page: { srcdoc } or { src, message }.
// `set` is the theme set's name, and `looksCss` is the text of looks.css when the looks are on.

export const PREVIEWS = {
  tailwind: {
    label: 'Tailwind CSS 4',
    async frame({ built, set, looksCss }) {
      const body = ['light', 'dark'].map((mode) => tailwindSample(mode, childrenOf(built), Boolean(looksCss))).join('\n');
      const css = await tailwind(toTailwind(built, { set, looksCss }), body);
      // With the colors only, the page adds the tokens, as the format's note says.
      return { srcdoc: page(looksCss ? style(css) : `${style(toCss(built, { icons: false }))}${style(css)}`, body) };
    },
  },
  shadcn: {
    label: 'shadcn/ui',
    async frame({ built, set, looksCss }) {
      const body = ['light', 'dark'].map((mode) => shadcnSample(mode, childrenOf(built))).join('\n');
      const css = await tailwind(`@import "tailwindcss";\n${toShadcn(built, { set, looksCss })}\n${SHADCN_THEME}`, body);
      return { srcdoc: page(style(css), body) };
    },
  },
  daisyui: {
    label: 'daisyUI 5',
    async frame({ built, set, looksCss }) {
      const name = themeName(set ?? '') || 'themetron';
      const body = ['light', 'dark'].map((mode) => daisyuiSample(mode, childrenOf(built), name)).join('\n');
      const css = await tailwind(toDaisyui(built, { set, looksCss }), body, await daisyuiModules());
      return { srcdoc: page(looksCss ? style(css) : `${style(toCss(built, { icons: false }))}${style(css)}`, body) };
    },
  },
  bootstrap: {
    label: 'Bootstrap 5.3, built from Sass',
    async frame({ built, set, looksCss }) {
      // The format's note: import the variables before Bootstrap.
      const css = await bootstrapSass(`${toBootstrapSass(built, { set })}\n@import "bootstrap/scss/bootstrap";`);
      return { srcdoc: page(`${style(css)}${looksCss ? style(toBootstrapLooks(built, { set, looksCss })) : ''}`, bootstrapBody(built)) };
    },
  },
  'bootstrap-css': {
    label: 'Bootstrap 5.3',
    async frame({ built, set, looksCss }) {
      const { default: bootstrap } = await import('bootstrap/dist/css/bootstrap.min.css?raw');
      return { srcdoc: page(`${style(bootstrap)}${style(toBootstrapCss(built, { set, looksCss }))}`, bootstrapBody(built)) };
    },
  },
  mui: {
    label: 'Material UI',
    async frame({ built, set, looksCss }) {
      return { src: 'mui-preview.html', message: { theme: toMui(built), css: looksCss ? toMuiLooks(built, { set, looksCss }) : '', children: childrenOf(built) } };
    },
  },
};
