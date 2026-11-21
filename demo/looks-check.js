// The page that scripts/looks-check.js drives: it makes each framework's looks preview for some
// inputs, and a reference page with plain themetron looks on plain elements. The check opens
// each page on its own and compares their parts. The playground does not use this page.
import looksCss from '../components/looks.css?raw';
import { buildThemes, toCss } from '../src/index.js';
import { PREVIEWS } from './previews.js';

// The reference: each look on a plain element, in a light and a dark section.
const section = (mode) => `<section data-tm-mode="${mode}" style="padding:24px;background:var(--tm-bg-canvas);color:var(--tm-fg-base);font-family:var(--tm-font-body)">
<p><button class="tm-look-fill r-fill">Primary</button> <button class="tm-look-tint r-tint">Tint</button> <button class="tm-look-quiet r-quiet">Quiet</button> <button class="tm-look-outline r-outline">Outline</button> <button class="tm-look-ghost r-ghost">Ghost</button> <button class="theme-danger tm-look-fill r-danger">Danger</button> <button class="theme-danger tm-look-outline r-outline-danger">Outline</button></p>
<p><input class="tm-look-field r-field" placeholder="ada@example.org"></p>
<div class="tm-look-surface r-surface" style="padding:16px">Card</div></section>`;
const reference = (built) => `<!doctype html><meta charset="utf-8"><style>${toCss(built, { icons: false })}\n${looksCss}\nbutton{padding:8px 16px;font:inherit}</style><body style="margin:0;display:grid;grid-template-columns:1fr 1fr">${section('light')}${section('dark')}</body>`;

window.looksCheck = {
  // Each page, by name: { srcdoc } or { src, message }, as the previews make them. With
  // looks: false, the previews have the colors only.
  async pages(inputs, { looks = true } = {}) {
    const built = buildThemes(inputs);
    const pages = { ref: { srcdoc: reference(built) } };
    for (const [format, preview] of Object.entries(PREVIEWS)) pages[format] = await preview.frame({ built, looksCss: looks ? looksCss : undefined });
    return pages;
  },
};
