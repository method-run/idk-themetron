#!/usr/bin/env node
// themetron build <inputs.json>: make the tokens from an inputs file, in one export format, to
// stdout or to --out <file>. Exits 1 when the inputs have problems, and prints each one. The CSS
// flags are the options of toCss, toTailwind, and toShadcn.
// themetron check <file.css>...: list the themetron tokens that a stylesheet reads. Exits 1
// when it reads a token that the contract does not have. --strict also fails on experimental
// tokens. --prefix <p> is for CSS made with another prefix than "tm".
// Both commands stop at a flag that they do not know. A build flag that the chosen format does
// not use gets a warning, and the build goes on without it.
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { buildThemes, toCss, toDtcg, toTailwind, toShadcn, toBootstrapSass, InputError } from '../src/index.js';
import { checkCss, CONTRACT_VERSION } from '../src/manifest.js';

const USAGE = `Usage:
  themetron build <inputs.json> [--format css] [--out <file>]
                  [--prefix tm] [--class-prefix theme-] [--no-root] [--no-more]
  themetron check <file.css>... [--strict] [--prefix tm]

A flag that the command does not know stops it. A build flag that the format does not use, such
as --prefix with dtcg, prints a warning, and the build goes on without it.

build formats:
  css         The tokens as CSS custom properties, one rule for each theme. The default.
  stylesheet  The tokens and the components in one file.
  dtcg        Design Tokens Community Group JSON.
  tailwind    A Tailwind CSS v4 theme. Add the CSS tokens too.
  shadcn      Variables for shadcn/ui's globals.css.
  bootstrap   Bootstrap 5 Sass variables. Import the file before Bootstrap.

build flags for CSS:
  --prefix p          Token names start with --p-. The default is tm. For css and tailwind.
  --class-prefix c    Theme classes are .c<name>. The default is theme-. For css, stylesheet,
                      and shadcn.
  --no-root           The root theme's rule leaves out :root. For css and stylesheet.
  --no-more           Leave out the more-contrast rules. For css and stylesheet.`;

// The same formats as the playground's download, except "inputs". `flags` lists the CSS flags
// that each format uses. The components read --tm-* tokens, so stylesheet takes no --prefix.
const FORMATS = {
  css: { flags: ['prefix', 'class-prefix', 'no-root', 'no-more'], make: (built, o) => toCss(built, o) },
  stylesheet: { flags: ['class-prefix', 'no-root', 'no-more'], make: async (built, o) => `${toCss(built, o)}\n/* ---- themetron components */\n\n${await readFile(new URL('../components/components.css', import.meta.url), 'utf8')}` },
  dtcg: { flags: [], make: (built) => `${JSON.stringify(toDtcg(built), null, 2)}\n` },
  tailwind: { flags: ['prefix'], make: (built, o) => toTailwind(built, o) },
  shadcn: { flags: ['class-prefix'], make: (built, o) => toShadcn(built, o) },
  bootstrap: { flags: [], make: (built) => toBootstrapSass(built) },
};
const CSS_FLAGS = {
  prefix: { type: 'string' },
  'class-prefix': { type: 'string' },
  'no-root': { type: 'boolean' },
  'no-more': { type: 'boolean' },
};

// A problem that the user can fix: print the message and exit 1, without a stack trace.
// A UsageError also prints the usage.
class Problem extends Error {}
class UsageError extends Problem {}

// Read the arguments of a command. A flag that the command does not know, or a flag with a
// missing or extra value, is an error. Not strict, parseArgs does not check these itself, but
// its own messages are long, so this gives short ones.
function parse(args, options) {
  const { values, positionals, tokens } = parseArgs({ args, allowPositionals: true, strict: false, tokens: true, options });
  for (const token of tokens) {
    if (token.kind !== 'option') continue;
    const option = options[token.name];
    if (!option) throw new UsageError(`${token.rawName}: unknown flag.`);
    if ((option.type === 'string') !== (typeof token.value === 'string')) {
      throw new UsageError(option.type === 'string' ? `${token.rawName} needs a value.` : `${token.rawName} takes no value.`);
    }
  }
  return { values, positionals };
}

async function build(args) {
  const { values, positionals } = parse(args, {
    format: { type: 'string', short: 'f', default: 'css' },
    out: { type: 'string', short: 'o' },
    ...CSS_FLAGS,
  });
  if (positionals.length !== 1) throw new UsageError('build needs one inputs file.');
  const format = FORMATS[values.format];
  if (!format) throw new UsageError(`--format: use one of ${Object.keys(FORMATS).join(', ')}, not "${values.format}".`);
  for (const flag of Object.keys(CSS_FLAGS)) {
    if (flag in values && !format.flags.includes(flag)) console.error(`Warning: skipped --${flag}: it does nothing with --format ${values.format}.`);
  }
  const options = {
    prefix: format.flags.includes('prefix') ? values.prefix : undefined,
    classPrefix: format.flags.includes('class-prefix') ? values['class-prefix'] : undefined,
    root: !(format.flags.includes('no-root') && values['no-root']),
    more: !(format.flags.includes('no-more') && values['no-more']),
  };
  const [file] = positionals;
  let inputs;
  try {
    inputs = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Problem(`${file}: ${error.code === 'ENOENT' ? 'no such file' : error.message}.`);
  }
  const text = await format.make(buildThemes(inputs), options);
  if (values.out) await writeFile(values.out, text);
  else process.stdout.write(text);
}

async function check(args) {
  const { values, positionals: files } = parse(args, {
    strict: { type: 'boolean', default: false },
    prefix: { type: 'string', default: 'tm' },
  });
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
