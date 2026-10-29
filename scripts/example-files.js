// The files of one example, made from its inputs: { file name: text }. Each file is one level
// of the pipeline. examples/README.md says what each one is, and which spec covers it.
import { buildThemes, normalizeInputs, toCss, toDtcg, toTailwind, toShadcn, MODES } from '../src/index.js';
import { checkCss } from '../src/manifest.js';

const json = (data) => `${JSON.stringify(data, null, 2)}\n`;

// `pageCss` is the example's own page.css, which is written by hand, like inputs.json.
export function exampleFiles(inputs, pageCss) {
  const { order, resolved } = normalizeInputs(inputs);
  const built = buildThemes(inputs);
  return {
    'resolved.json': json({ $comment: 'Not part of a spec: what the engine works out from the inputs. Each theme has every setting, its own or its parents\'.', order, themes: resolved }),
    'tokens.css': toCss(built),
    'tokens.dtcg.json': json(toDtcg(built)),
    'tailwind.css': toTailwind(built),
    'shadcn.css': toShadcn(built),
    'audit.md': audit(built),
    'check.txt': check(pageCss),
  };
}

// Every required pair of every theme, mode, and contrast level, as a short report.
function audit(built) {
  const lines = ['# Audit', '', 'Made by `npm run examples`. Each row counts the required pairs that pass the theme\'s contrast setting. "More" is the more-contrast variant.', '', '| Theme | Kind | Level | Mode | Pass | Fail |', '|---|---|---|---|---|---|'];
  const failures = [];
  const warnings = [];
  for (const name of built.order) {
    const theme = built.themes[name];
    for (const [label, level] of [['base', theme], ['more', theme.more]]) {
      if (!level) continue;
      const { method, level: l } = level.settings.contrast;
      for (const mode of MODES) {
        const required = level.modes[mode].audit.filter((a) => a.required);
        const failed = required.filter((a) => !a.pass);
        lines.push(`| ${name} | ${theme.kind} | ${label}: ${method} ${l} | ${mode} | ${required.length - failed.length} | ${failed.length} |`);
        const line = (a) => `- ${name}, ${label}, ${mode}: \`${a.fg}\` on \`${a.bg}\`, ${a.purpose}: ${a.wcag}:1, Lc ${a.apca}`;
        failures.push(...failed.map(line));
        warnings.push(...level.modes[mode].audit.filter((a) => a.warn).map(line));
      }
    }
  }
  lines.push('', failures.length ? '## Failures' : 'No required pair fails.', ...(failures.length ? ['', ...failures] : []));
  lines.push('', warnings.length ? '## Warnings' : 'No warnings.', ...(warnings.length ? ['', 'Pairs that are not required, but miss the contrast setting, such as the exact button.', '', ...warnings] : []));
  return `${lines.join('\n')}\n`;
}

// What `themetron check page.css` reports. Experimental reads are allowed, with a fallback.
function check(css) {
  const { unknown, experimental, stable } = checkCss(css);
  return [
    `$ npx themetron check page.css`,
    `page.css: ${stable.length} stable, ${experimental.length} experimental, ${unknown.length} unknown tokens.`,
    ...unknown.map((n) => `  ✕ --tm-${n}: not in the contract.`),
    ...experimental.map((n) => `  ! --tm-${n}: experimental. It can change in any version.`),
    `Stable tokens read: ${stable.map((n) => `--tm-${n}`).join(', ')}`,
    '',
  ].join('\n');
}
