// Icons: Google's Material Symbols, a variable icon font. An icon is a word in the font, such
// as "star", which the font draws as one glyph. A theme's `icons` input sets the style, the
// fill, and the line weight. They are not feels: icons are a choice of their own, so filled
// icons can go with thin borders, and sharp icons with round buttons.

// The icons that the CSS loads. Google Fonts sends only these, about 25 KB for each style.
// A name that the font does not have shows as its word, so keep to the names on
// fonts.google.com/icons.
export const ICONS = [
  'add', 'arrow_back', 'arrow_forward', 'check', 'check_circle', 'chevron_left', 'chevron_right',
  'close', 'content_copy', 'delete', 'edit', 'error', 'expand_less', 'expand_more', 'favorite',
  'info', 'menu', 'more_horiz', 'more_vert', 'photo_camera', 'remove', 'search', 'settings',
  'share', 'star', 'thumb_down', 'thumb_up', 'upload', 'upload_file', 'warning',
];

// The icon styles, from square to round corners. Each is a Material Symbols family. Google calls
// the standard one "Outlined", but fill is a setting of its own, so here it is "standard".
export const ICON_STYLES = ['sharp', 'standard', 'rounded'];
const FAMILIES = { sharp: 'Sharp', standard: 'Outlined', rounded: 'Rounded' };
// The line weights that the font has, from thin to bold.
export const ICON_WEIGHT = { min: 100, max: 700 };

// The root theme's icons: outlines, at the weight of body text.
export const ICON_DEFAULTS = { style: 'standard', fill: false, weight: 400 };

// The icon tokens for a theme's icon settings:
// - family: the Material Symbols family of the style, such as "Material Symbols Outlined" for standard.
// - fill: 1 (filled) or 0 (outlines), for the font's FILL axis.
// - weight: the line weight, for the font's wght axis. Filled icons have a weight too: it sets
//   the parts that stay lines.
export function iconStyle({ style, fill, weight }) {
  return {
    family: `Material Symbols ${FAMILIES[style]}`,
    fill: fill ? 1 : 0,
    weight,
  };
}

// A Google Fonts URL for the icon styles of all themes. Each style loads with its full
// ranges of fill, weight, grade, and optical size, but only the ICONS glyphs. display=block
// hides an icon's word while its font loads.
export function iconImport(built) {
  const families = [...new Set(Object.values(built.themes).map((t) => t.primitives.icon.family))];
  const q = families.map((f) => `family=${f.replace(/ /g, '+')}:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`).join('&');
  return `https://fonts.googleapis.com/css2?${q}&icon_names=${ICONS.join(',')}&display=block`;
}
