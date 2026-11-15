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

// A pre-release version, such as 0.2.0-alpha.1. It never gets a copy in spec/versions/.
export const isPrerelease = (version) => /-/.test(version);

// What `npm run spec:release` does for a package version, a contract version, and the released
// versions: { snapshot: true } copies the contract, { snapshot: false } is an alpha, and
// { error } stops it. An alpha package with a changed contract needs an alpha contract too,
// so that a plain version always means a released copy.
export function releasePlan(packageVersion, contractVersion, released) {
  const alpha = isPrerelease(packageVersion);
  if (isPrerelease(contractVersion) && !alpha) {
    return { error: `The package ${packageVersion} is a release, but the contract ${contractVersion} is an alpha. Set CONTRACT_VERSION in src/manifest.js to ${contractVersion.replace(/-.*$/, '')}.` };
  }
  if (alpha && !isPrerelease(contractVersion) && !released.includes(contractVersion)) {
    return { error: `The package ${packageVersion} is an alpha, but the contract ${contractVersion} is not released. Give CONTRACT_VERSION in src/manifest.js an alpha version too, such as ${contractVersion}-alpha.0.` };
  }
  return { snapshot: !alpha };
}

// The message for stable tokens that went away without a breaking bump.
export const removedMessage = (released, removed, breaking) =>
  `These stable tokens went away since contract ${released}: ${removed.join(', ')}. That is a breaking change. Raise CONTRACT_VERSION in src/manifest.js past ${breaking}, and list the change under Unreleased in spec/consumers.md.`;
