// Write demo/font-choices.json: the Google fonts that the playground's font menu suggests.
// It reads Google's font list (with popularity) and the tags behind the filters on
// fonts.google.com, so the choices follow those filters. Run it with npm run fonts.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const METADATA_URL = 'https://fonts.google.com/metadata/fonts';
const TAGS_URL = 'https://raw.githubusercontent.com/google/fonts/main/tags/all/families.csv';
const OUT = new URL('../demo/font-choices.json', import.meta.url);

// A family has a tag when its score for the tag is at least this, from 0 to 100.
export const MIN_SCORE = 50;

// [group, tag path, how many]. The first groups follow the sections on fonts.google.com, one
// family for each filter in them. Each gets the most popular family that no group before it took.
// The blackletter and pixel families go into feeling groups.
export const PICKS = [
  ['Sans serif', '/Sans/Humanist', 1],
  ['Sans serif', '/Sans/Grotesque', 1],
  ['Sans serif', '/Sans/Neo Grotesque', 1],
  ['Sans serif', '/Sans/Geometric', 1],
  ['Sans serif', '/Sans/Rounded', 1],
  ['Sans serif', '/Sans/Superellipse', 1],
  ['Sans serif', '/Sans/Glyphic', 1],
  ['Serif', '/Serif/Humanist Venetian', 1],
  ['Serif', '/Serif/Old Style Garalde', 1],
  ['Serif', '/Serif/Transitional', 1],
  ['Serif', '/Serif/Modern', 1],
  ['Serif', '/Serif/Scotch', 1],
  ['Serif', '/Serif/Didone', 1],
  ['Serif', '/Serif/Fat Face', 1],
  ['Calligraphy', '/Script/Formal', 1],
  ['Calligraphy', '/Script/Handwritten', 1],
  ['Calligraphy', '/Script/Upright Script', 1],
  ['Calligraphy', '/Script/Informal', 1],
  ['Monospace', '/Monospace/Monospace', 3],
  ['Artistic', '/Theme/Blackletter', 1],
  ['Rugged', '/Theme/Pixel', 1],
];

// Families that a group always has, after its picks: [group, family].
export const ALWAYS = [['Monospace', 'Fira Code']];

// Families that the menu never offers, by hand.
export const NEVER = ['Alien Block'];

// Some of the feelings on fonts.google.com: the three most relevant families for each, the ones
// with the highest score for the feeling. Popularity breaks ties. By popularity alone, the same
// few common families, such as Roboto and Open Sans, would lead most feelings.
export const FEELINGS = ['Business', 'Sincere', 'Sophisticated', 'Vintage', 'Artistic', 'Happy', 'Cute', 'Childlike', 'Rugged', 'Stiff', 'Futuristic'];
export const PER_FEELING = 3;

// The CSS fallback for a family, from its Google category.
export function fallbackOf(family) {
  if (family.category === 'Monospace') return 'monospace';
  if (family.category === 'Handwriting') return 'cursive';
  if (family.category === 'Serif' || family.stroke === 'Serif' || family.stroke === 'Slab Serif') return 'serif';
  return 'sans-serif';
}

// Families that the menu can offer: open source, made for Latin letters, and not Noto or a
// brand's own font. A family whose main script is another one, such as Thai or Japanese, is
// left out even if it has Latin letters too: the playground is for English text.
const usable = (f) => f.isOpenSource !== false && !f.isNoto && !f.isBrandFont && f.subsets.includes('latin') && !f.primaryScript;

// The groups for the menu, from the Google font list and the tag rows ([family, axis, tag, score]).
// Popularity is a rank: 1 is the most popular.
export function pickFonts(families, tagRows, { minScore = MIN_SCORE } = {}) {
  const byName = new Map(families.filter((f) => usable(f) && !NEVER.includes(f.family)).map((f) => [f.family, f]));
  const tagged = new Map();
  for (const [family, axis, tag, score] of tagRows) {
    if (axis || Number(score) < minScore || !byName.has(family)) continue;
    if (!tagged.has(tag)) tagged.set(tag, new Map());
    tagged.get(tag).set(family, Number(score));
  }
  const taken = new Set(ALWAYS.map(([, family]) => family).filter((f) => byName.has(f)));
  const popular = (a, b) => byName.get(a).popularity - byName.get(b).popularity;
  // The first n families with the tag that no group took yet, by popularity, or by score first.
  const top = (tag, n, { byScore = false } = {}) => {
    const scores = tagged.get(tag) ?? new Map();
    const order = byScore ? (a, b) => scores.get(b) - scores.get(a) || popular(a, b) : popular;
    const names = [...scores.keys()].filter((f) => !taken.has(f)).sort(order).slice(0, n);
    names.forEach((f) => taken.add(f));
    return names;
  };
  // The groups in menu order: the sections, then the feelings.
  const groups = [...new Set([...PICKS.map(([group]) => group).filter((g) => !FEELINGS.includes(g)), ...FEELINGS])].map((label) => ({ label, fonts: [] }));
  const add = (label, family) => groups.find((g) => g.label === label).fonts.push({ family, fallback: fallbackOf(byName.get(family)) });
  for (const [group, tag, n] of PICKS) for (const f of top(tag, n)) add(group, f);
  for (const [group, family] of ALWAYS) if (byName.has(family)) add(group, family);
  for (const feeling of FEELINGS) for (const f of top(`/Expressive/${feeling}`, PER_FEELING, { byScore: true })) add(feeling, f);
  return groups.filter((g) => g.fonts.length);
}

// The tag file is a CSV with no quoted fields that hold commas, except family names with none.
export const parseTags = (csv) => csv.trim().split('\n').map((line) => line.split(','));

async function main() {
  const [meta, csv] = await Promise.all([
    fetch(METADATA_URL).then((r) => r.text()),
    fetch(TAGS_URL).then((r) => r.text()),
  ]);
  // The metadata starts with a line that keeps it from running as a script.
  const { familyMetadataList } = JSON.parse(meta.slice(meta.indexOf('{')));
  const groups = pickFonts(familyMetadataList, parseTags(csv));
  writeFileSync(OUT, JSON.stringify({ source: 'fonts.google.com, by npm run fonts', minScore: MIN_SCORE, groups }, null, 2) + '\n');
  console.log(`Wrote ${groups.reduce((n, g) => n + g.fonts.length, 0)} fonts in ${groups.length} groups to demo/font-choices.json.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
