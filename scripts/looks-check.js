// Check that themetron's looks look the same on each framework as on plain elements. For each
// inputs file, it opens each framework's looks preview in headless Chrome, forces each state
// (rest, hover, press, focus) on each part, and compares the part's paint with the reference:
// colors, fill, edge, radius, shadows, shine, and focus ring. Size, padding, and font are the
// framework's own, so it does not compare them. It fails when a part differs, when a part is
// missing, or when an outline has no edge. It writes a contact sheet of the parts to look at.
// Usage: npm run looks:check [-- inputs.json ...] [--out dir]
// Chrome: CHROME_PATH, or Chrome or Chromium where it usually is.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const repo = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? args.splice(outAt, 2)[1] : join(repo, 'test-results/looks-check');
const inputFiles = args.length ? args : ['examples/basic/inputs.json', 'test/fixtures/gradient-inputs.json'];

// ---- What to compare.

// Each page's parts. A part's name is the reference part it should match; a value of
// [reference, selector] compares a part with a reference part of another name. Each page has a
// light and a dark section, in that order.
const BOOTSTRAP = { fill: '.btn-primary', quiet: '.btn-secondary', outline: '.btn-outline-primary', ghost: '.btn-link', danger: '.btn-danger', 'outline-danger': '.btn-outline-danger', field: '.form-control', surface: '.card' };
const PAGES = {
  ref: { sections: 'section', parts: { fill: '.r-fill', tint: '.r-tint', quiet: '.r-quiet', outline: '.r-outline', ghost: '.r-ghost', danger: '.r-danger', 'outline-danger': '.r-outline-danger', field: '.r-field', surface: '.r-surface' } },
  tailwind: { sections: 'section', parts: { fill: 'button.tm-look-fill:not(.theme-danger)', tint: '.tm-look-tint', quiet: '.tm-look-quiet', outline: '.tm-look-outline:not(.theme-danger)', ghost: '.tm-look-ghost', danger: '.theme-danger.tm-look-fill', 'outline-danger': '.theme-danger.tm-look-outline', field: 'input.tm-look-field', surface: '.tm-look-surface' } },
  shadcn: { sections: 'section', parts: { fill: '[data-slot=button][data-variant=default]', quiet: '[data-slot=button][data-variant=secondary]', outline: '[data-slot=button][data-variant=outline]', ghost: '[data-slot=button][data-variant=ghost]', danger: '[data-slot=button][data-variant=destructive]', field: 'input[data-slot=input]', surface: '[data-slot=card]' } },
  daisyui: { sections: 'section', parts: { fill: '.btn.btn-primary:not(.btn-outline, .btn-soft)', tint: '.btn-soft.btn-primary', quiet: '.btn:not([class*="btn-"])', secondary: ['quiet', '.btn.btn-secondary'], outline: '.btn-outline.btn-primary', ghost: '.btn-ghost', danger: '.btn-error:not(.btn-outline)', 'outline-danger': '.btn-outline.btn-error', field: 'input.input', surface: '.card' } },
  bootstrap: { sections: 'section', parts: BOOTSTRAP },
  'bootstrap-css': { sections: 'section', parts: BOOTSTRAP },
  mui: { sections: '.MuiScopedCssBaseline-root', parts: { fill: '.MuiButton-contained.MuiButton-colorPrimary', quiet: '.MuiButton-contained.MuiButton-colorSecondary', outline: '.MuiButton-outlined.MuiButton-colorPrimary', ghost: '.MuiButton-text.MuiButton-colorPrimary', danger: '.MuiButton-contained.MuiButton-colorError', 'outline-danger': '.MuiButton-outlined.MuiButton-colorError', surface: '.MuiCard-root' } },
};
const STATES = ['rest', 'hover', 'active', 'focus-visible'];
const PROPS = ['color', 'background-color', 'background-image', 'border-top-color', 'border-top-width', 'border-top-left-radius', 'border-bottom-right-radius', 'box-shadow', 'text-shadow', 'opacity', 'transform', 'backdrop-filter', 'outline-style', 'outline-color', 'outline-width', 'outline-offset', '-webkit-text-fill-color'];
const PSEUDO = ['content', 'background-image', 'background-color', 'opacity', 'backdrop-filter', 'box-shadow', 'filter'];

// Differences that are fine, each with its reason.
const ACCEPTED = [
  { part: 'surface', state: 'focus-visible', prop: /^outline-/, why: 'A card does not take focus, so its focus ring never shows.' },
];

// ---- Chrome, over the DevTools protocol.

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const mac = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'].find(existsSync);
  if (mac) return mac;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [name], { encoding: 'utf8' }).trim(); } catch { /* next */ }
  }
  throw new Error('No Chrome found. Set CHROME_PATH.');
}

async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'looks-check-'));
  // CI runners do not allow Chrome's sandbox.
  const flags = ['--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--hide-scrollbars', '--no-first-run', ...(process.env.CI ? ['--no-sandbox'] : []), 'about:blank'];
  const chrome = spawn(findChrome(), flags, { stdio: 'ignore' });
  // Chrome writes its port to the profile when it is ready.
  const portFile = join(profile, 'DevToolsActivePort');
  const until = Date.now() + 20000;
  while (!existsSync(portFile) || !readFileSync(portFile, 'utf8').includes('\n')) {
    if (Date.now() > until) throw new Error('Chrome did not start.');
    await new Promise((r) => setTimeout(r, 50));
  }
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); }
    else listeners.get(m.method)?.splice(0).forEach((f) => f(m.params));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  const once = (method) => new Promise((r) => listeners.set(method, [...(listeners.get(method) ?? []), r]));
  const ev = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const navigate = async (url) => { const loaded = once('Page.loadEventFired'); await send('Page.navigate', { url }); await loaded; };
  // Wait for a condition in the page, checking every 50 ms.
  const until_ = async (expression, what, ms = 30000) => {
    const end = Date.now() + ms;
    while (!(await ev(expression).catch(() => false))) {
      if (Date.now() > end) throw new Error(`Timed out waiting for ${what}.`);
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  await send('Page.enable');
  await send('DOM.enable');
  await send('CSS.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  // Chrome writes to its profile until it exits, so remove the profile after that.
  const close = async () => {
    ws.close();
    const exited = new Promise((r) => chrome.once('exit', r));
    chrome.kill();
    await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch { /* a temporary folder: the system removes it */ }
  };
  return { send, ev, navigate, until: until_, close };
}

// ---- One page: put it on screen, then read each part in each state.

const NO_MOTION = '*, *::before, *::after { transition: none !important; animation: none !important; }';

async function open(chrome, base, page) {
  if (page.srcdoc) {
    await chrome.navigate('about:blank');
    const { frameTree } = await chrome.send('Page.getFrameTree');
    await chrome.send('Page.setDocumentContent', { frameId: frameTree.frame.id, html: page.srcdoc });
  } else {
    await chrome.navigate(new URL(page.src, base).href);
    await chrome.ev(`postMessage(${JSON.stringify(page.message)}, location.origin)`);
    await chrome.until(`document.querySelectorAll('.MuiScopedCssBaseline-root').length === 2`, 'the MUI preview');
  }
  // The fonts change the crops, not the colors. Wait a little for them, then go on.
  await chrome.ev(`Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]).then(() => true)`);
  await chrome.ev(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(NO_MOTION)}; document.head.append(s); return true; })()`);
}

async function readParts(chrome, name, shots) {
  const { sections, parts } = PAGES[name];
  const list = Object.entries(parts).map(([key, v]) => [key, ...(Array.isArray(v) ? v : [key, v])]);
  // Mark each part, so the protocol can find it.
  const marked = await chrome.ev(`(() => {
    const secs = document.querySelectorAll(${JSON.stringify(sections)});
    const found = [];
    ['light', 'dark'].forEach((mode, i) => { for (const [key, , q] of ${JSON.stringify(list)}) { const e = secs[i]?.querySelector(q); if (e) { e.dataset.probe = key + ' ' + mode; found.push(key + ' ' + mode); } } });
    return found;
  })()`);
  const missing = list.flatMap(([key]) => ['light', 'dark'].map((mode) => `${key} ${mode}`)).filter((k) => !marked.includes(k));
  const { root } = await chrome.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await chrome.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-probe]' });
  const styles = {};
  const rects = await chrome.ev(`Object.fromEntries([...document.querySelectorAll('[data-probe]')].map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.probe, { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: Math.min(r.height, 140) }]; }))`);
  for (const state of STATES) {
    const forced = state === 'rest' ? [] : [state];
    await Promise.all(nodeIds.map((nodeId) => chrome.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: forced })));
    const read = await chrome.ev(`Object.fromEntries([...document.querySelectorAll('[data-probe]')].map((e) => {
      const c = getComputedStyle(e); const o = {};
      for (const p of ${JSON.stringify(PROPS)}) o[p] = c.getPropertyValue(p);
      for (const ps of ['::before', '::after']) { const b = getComputedStyle(e, ps); if (b.content !== 'none' && b.content !== 'normal') for (const p of ${JSON.stringify(PSEUDO)}) o[ps + ' ' + p] = b.getPropertyValue(p); }
      return [e.dataset.probe, o];
    }))`);
    for (const [probe, o] of Object.entries(read)) (styles[probe] ??= {})[state] = o;
    if (shots) {
      // One picture for each state, around all the parts; the sheet crops it.
      const all = Object.values(rects);
      const x = Math.max(0, Math.min(...all.map((r) => r.x)) - 12), y = Math.max(0, Math.min(...all.map((r) => r.y)) - 12);
      const clip = { x, y, width: Math.max(...all.map((r) => r.x + r.width)) + 12 - x, height: Math.max(...all.map((r) => r.y + r.height)) + 12 - y, scale: 1 };
      const shot = await chrome.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
      writeFileSync(join(shots.dir, `${shots.prefix}${name}-${state}.png`), Buffer.from(shot.data, 'base64'));
      shots.origins[name] = { x, y };
    }
  }
  await Promise.all(nodeIds.map((nodeId) => chrome.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] })));
  const refOf = Object.fromEntries(list.map(([key, ref]) => [key, ref]));
  return { styles, rects, missing, refOf };
}

// ---- Compare.

const norm = (v) => (v ?? '').replace(/\s+/g, ' ').trim();
const clear = (color) => /^(transparent|rgba\(\d+, \d+, \d+, 0\)|oklch\(.* \/ 0\)|color\(.* \/ 0\))$/.test(norm(color));
// An outline that is not drawn has no color, width, or offset to see.
const noOutline = (o) => norm(o['outline-style']) === 'none' || clear(o['outline-color']);
// An outline part's edge: its border, or a gradient ring on ::before.
const hasEdge = (o) => (parseFloat(o['border-top-width']) > 0 && !clear(o['border-top-color'])) || /gradient/.test(o['::before background-image'] ?? '');

function compare(results) {
  const problems = [];
  const ref = results.ref;
  for (const [name, page] of Object.entries(results)) {
    for (const m of page.missing) problems.push(`${name}: no part for ${m}`);
    for (const [probe, byState] of Object.entries(page.styles)) {
      const [key, mode] = probe.split(' ');
      const part = page.refOf[key];
      for (const state of STATES) {
        const got = byState[state];
        if (part.startsWith('outline') && !hasEdge(got)) problems.push(`${name} ${probe} ${state}: the outline has no edge`);
        if (name === 'ref') continue;
        const want = ref.styles[`${part} ${mode}`]?.[state];
        if (!want) continue;
        const hidden = noOutline(want) && noOutline(got);
        const bad = [...new Set([...Object.keys(want), ...Object.keys(got)])].filter((p) => norm(want[p]) !== norm(got[p])
          && !(hidden && p.startsWith('outline-'))
          && !ACCEPTED.some((a) => a.part === part && a.state === state && a.prop.test(p)));
        if (bad.length) problems.push(`${name} ${probe} ${state}: ${bad.map((p) => `${p}: ${norm(got[p]).slice(0, 100)} ≠ ${norm(want[p]).slice(0, 100)}`).join(' | ')}`);
      }
    }
  }
  return problems;
}

// A page of crops: a row for each part, mode, and state, and a column for each page.
function sheet(runs) {
  const names = Object.keys(PAGES);
  const crop = (prefix, name, state, rect, origin) => `<div style="width:${Math.ceil(rect.width) + 16}px;height:${Math.ceil(rect.height) + 16}px;background:url('${prefix}${name}-${state}.png') ${-(rect.x - origin.x - 8)}px ${-(rect.y - origin.y - 8)}px no-repeat"></div>`;
  const tables = runs.map(({ file, prefix, results, origins }) => {
    const probes = Object.keys(results.ref.styles);
    const rows = probes.flatMap((probe) => STATES.map((state) => `<tr><th>${probe} ${state}</th>${names.map((name) => {
      const page = results[name];
      const key = Object.keys(page.styles).find((k) => k === probe) ?? Object.keys(page.styles).find((k) => `${page.refOf[k.split(' ')[0]]} ${k.split(' ')[1]}` === probe);
      return `<td>${key ? crop(prefix, name, state, page.rects[key], origins[name]) : ''}</td>`;
    }).join('')}</tr>`));
    return `<h2>${file}</h2><table><tr><th></th>${names.map((n) => `<th>${n}</th>`).join('')}</tr>${rows.join('')}</table>`;
  });
  return `<!doctype html><meta charset="utf-8"><title>Looks check</title><style>body{font:12px system-ui;background:#888;margin:16px}th{text-align:left;padding:4px 8px}td{padding:2px}</style>${tables.join('')}`;
}

// ---- Run.

const started = Date.now();
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const server = await createServer({
  configFile: join(repo, 'vite.config.js'),
  logLevel: 'error',
  server: { port: Number(process.env.PORT ?? 4390), open: false },
  // Find every dependency at the start, so Vite does not reload the page to add one.
  optimizeDeps: { entries: ['looks-check.html', 'mui-preview.html'] },
});
await server.listen();
const base = server.resolvedUrls.local[0];
const chrome = await launch();
const runs = [];
let problems = [];
try {
  const inputs = inputFiles.map((f) => JSON.parse(readFileSync(join(repo, f), 'utf8')));
  await chrome.navigate(new URL('looks-check.html', base).href);
  await chrome.until(`typeof looksCheck === 'object'`, 'the check page', 120000);
  const made = [];
  for (const i of inputs) made.push(await chrome.ev(`looksCheck.pages(${JSON.stringify(i)})`));
  for (const [n, pages] of made.entries()) {
    const file = inputFiles[n];
    const shots = { dir: out, prefix: `${basename(file, '.json')}-${n}-`, origins: {} };
    const results = {};
    for (const name of Object.keys(PAGES)) {
      const t = Date.now();
      await open(chrome, base, pages[name]);
      results[name] = await readParts(chrome, name, shots);
      console.log(`${file}: ${name} in ${Date.now() - t} ms`);
    }
    const found = compare(results);
    problems = problems.concat(found.map((p) => `${file}: ${p}`));
    runs.push({ file, prefix: shots.prefix, results, origins: shots.origins });
  }
} finally {
  await chrome.close();
  await server.close();
}
writeFileSync(join(out, 'results.json'), JSON.stringify(runs.map(({ file, results }) => ({ file, results })), null, 1));
writeFileSync(join(out, 'sheet.html'), sheet(runs));
writeFileSync(join(out, 'problems.txt'), problems.join('\n'));
console.log(`\n${problems.length ? `${problems.length} problems:\n${problems.join('\n')}` : 'Every part matches the reference.'}\nSheet: ${join(out, 'sheet.html')}\nTook ${((Date.now() - started) / 1000).toFixed(1)} s.`);
process.exitCode = problems.length ? 1 : 0;
