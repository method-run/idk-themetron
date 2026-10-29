#!/usr/bin/env node
// themetron check <file.css>...: list the themetron tokens that a stylesheet reads. Exits 1
// when it reads a token that the contract does not have. --strict also fails on experimental
// tokens. --prefix <p> is for CSS made with another prefix than "tm".
import { readFile } from 'node:fs/promises';
import { checkCss, CONTRACT_VERSION } from '../src/manifest.js';

const args = process.argv.slice(2);
const [command] = args;
const strict = args.includes('--strict');
const prefixAt = args.indexOf('--prefix');
const prefix = prefixAt >= 0 ? args[prefixAt + 1] : 'tm';
const files = args.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--prefix');

if (command !== 'check' || !files.length) {
  console.log('Usage: themetron check <file.css>... [--strict] [--prefix tm]');
  process.exit(command ? 1 : 0);
}

let failed = false;
for (const file of files) {
  const { unknown, experimental, stable } = checkCss(await readFile(file, 'utf8'), { prefix });
  console.log(`${file}: ${stable.length} stable, ${experimental.length} experimental, ${unknown.length} unknown tokens (contract ${CONTRACT_VERSION}).`);
  for (const name of unknown) console.log(`  ✕ --${prefix}-${name}: not in the contract.`);
  for (const name of experimental) console.log(`  ${strict ? '✕' : '!'} --${prefix}-${name}: experimental. It can change in any version.`);
  if (unknown.length || (strict && experimental.length)) failed = true;
}
process.exit(failed ? 1 : 0);
