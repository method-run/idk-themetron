// Read the released contracts in spec/versions/. Node only.
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';

const DIR = new URL('../spec/versions/', import.meta.url);

// The released versions, oldest first.
export async function releasedVersions() {
  if (!existsSync(DIR)) return [];
  return (await readdir(DIR)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

// The token manifest of the newest release, or null when nothing is released.
export async function newestReleasedManifest() {
  const version = (await releasedVersions()).at(-1);
  return version ? JSON.parse(await readFile(new URL(`${version}/tokens.manifest.json`, DIR), 'utf8')) : null;
}

// The message for stable tokens that went away without a breaking bump.
export const removedMessage = (released, removed, breaking) =>
  `These stable tokens went away since contract ${released}: ${removed.join(', ')}. That is a breaking change. Raise CONTRACT_VERSION in src/manifest.js past ${breaking}, and list the change under Unreleased in spec/consumers.md.`;
