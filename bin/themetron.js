#!/usr/bin/env node
// themetron build <inputs.json>: make the tokens from an inputs file, in one export format, to
// stdout or to --out <file>. Exits 1 when the inputs have problems, and prints each one.
// themetron check <file.css>...: list the themetron tokens that a stylesheet reads. Exits 1
// when it reads a token that the contract does not have. --strict also fails on experimental
// tokens. --prefix <p> is for CSS made with another prefix than "tm".
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { buildThemes, toCss, toDtcg, toTailwind, toShadcn, InputError } from '../src/index.js';
import { checkCss, CONTRACT_VERSION } from '../src/manifest.js';

const USAGE = `Usage:
  themetron build <inputs.json> [--format css] [--out <file>]
  themetron check <file.css>... [--strict] [--prefix tm]

build formats:
  css         The tokens as CSS custom properties, one rule for each theme. The default.
  stylesheet  The tokens and the components in one file.
  dtcg        Design Tokens Community Group JSON.
  tailwind    A Tailwind CSS v4 theme. Add the CSS tokens too.
  shadcn      Variables for shadcn/ui's globals.css.`;

// The same formats as the playground's download, except "inputs".
const FORMATS = {
  css: (built) => toCss(built),
  stylesheet: async (built) => `${toCss(built)}\n/* ---- themetron components */\n\n${await readFile(new URL('../components/components.css', import.meta.url), 'utf8')}`,
  dtcg: (built) => `${JSON.stringify(toDtcg(built), null, 2)}\n`,
  tailwind: (built) => toTailwind(built),
  shadcn: (built) => toShadcn(built),
};

// A problem that the user can fix: print the message and exit 1, without a stack trace.
// A UsageError also prints the usage.
class Problem extends Error {}
class UsageError extends Problem {}

async function build(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    format: { type: 'string', short: 'f', default: 'css' },
    out: { type: 'string', short: 'o' },
  } });
  if (positionals.length !== 1) throw new UsageError('build needs one inputs file.');
  const format = FORMATS[values.format];
  if (!format) throw new UsageError(`--format: use one of ${Object.keys(FORMATS).join(', ')}, not "${values.format}".`);
  const [file] = positionals;
  let inputs;
  try {
    inputs = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Problem(`${file}: ${error.code === 'ENOENT' ? 'no such file' : error.message}.`);
  }
  const text = await format(buildThemes(inputs));
  if (values.out) await writeFile(values.out, text);
  else process.stdout.write(text);
}

async function check(args) {
  const { values, positionals: files } = parseArgs({ args, allowPositionals: true, options: {
    strict: { type: 'boolean', default: false },
    prefix: { type: 'string', default: 'tm' },
  } });
  if (!files.length) throw new UsageError('check needs one or more CSS files.');
  const { strict, prefix } = values;
  let failed = false;
  for (const file of files) {
    const { unknown, experimental, stable } = checkCss(await readFile(file, 'utf8'), { prefix });
    console.log(`${file}: ${stable.length} stable, ${experimental.length} experimental, ${unknown.length} unknown tokens (contract ${CONTRACT_VERSION}).`);
    for (const name of unknown) console.log(`  ✕ --${prefix}-${name}: not in the contract.`);
    for (const name of experimental) console.log(`  ${strict ? '✕' : '!'} --${prefix}-${name}: experimental. It can change in any version.`);
    if (unknown.length || (strict && experimental.length)) failed = true;
  }
  return failed ? 1 : 0;
}

const [command, ...rest] = process.argv.slice(2);
if (!command || command === '--help' || command === '-h' || rest.includes('--help') || rest.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}
const commands = { build, check };
try {
  if (!commands[command]) throw new UsageError(`Unknown command "${command}".`);
  process.exitCode = (await commands[command](rest)) ?? 0;
} catch (error) {
  // parseArgs throws TypeErrors with a code, such as ERR_PARSE_ARGS_UNKNOWN_OPTION.
  if (error instanceof InputError || (error instanceof Problem && !(error instanceof UsageError))) console.error(error.message);
  else if (error instanceof UsageError || error.code?.startsWith('ERR_PARSE_ARGS')) console.error(`${error.message}\n\n${USAGE}`);
  else throw error;
  process.exitCode = 1;
}
