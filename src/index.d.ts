// Types for the public functions in index.js. Written by hand: the engine is plain JavaScript.
// A test checks that every export of index.js is declared here. Keep the two in step.

// ---- Inputs: what you give buildThemes. See spec/inputs.md and spec/inputs.schema.json.

/** A hex color, such as "#1e66f5" or "#fff". */
export type Hex = string;

export type FeelName = 'roundness' | 'spaciousness' | 'depth' | 'softness' | 'thinness' | 'shininess' | 'clarity';
export type PresetName = 'balanced' | 'flat' | 'material' | 'brutalist' | 'neumorphic' | 'glass' | 'glossy' | 'playful' | 'dense';
export type ContrastMethod = 'wcag' | 'apca';
export type ContrastLevel = 'standard' | 'enhanced';
export type ContrastModel = 'oklch' | 'hsl';
export type Purpose = 'text' | 'large' | 'ui';
/** Text of a size in px and a weight, for APCA's font table. */
export interface TextPurpose { size: number; weight: number }
export type Mode = 'light' | 'dark';
export type Role = 'base' | 'action';

/** A number from 0 to 1, a word for one (such as "pill"), or "inherit" for the parent's value. */
export type FeelValue = number | string;

/** One of your own font files. See "Your own font files" in spec/inputs.md. */
export interface FontFile {
  /** The URL of a .woff2, .woff, .ttf, or .otf file. */
  url: string;
  /** One weight, such as 400, or a range for a variable font, such as "100 900". */
  weight?: number | string;
  style?: 'normal' | 'italic';
}

/** A font family name, or a family, a CSS fallback list, and your own font files. */
export type FontInput = string | { family?: string | null; fallback?: string; src?: FontFile[] };

/** A hex color, or { color }. */
export type RoleInput = Hex | { color?: Hex };

export interface ThemeInput {
  /** The parent theme's name. Every theme but "default" needs one. */
  parent?: string;
  /** The name that people see. */
  label?: string;
  /** Sets both roles: base and action. */
  color?: Hex;
  base?: RoleInput;
  action?: RoleInput;
  font?: FontInput;
  headingFont?: FontInput;
  monoFont?: FontInput;
  /** How fast text grows above body size: 0 to 1, or a word such as "classic". */
  typeVariance?: number | string;
  preset?: PresetName;
  feel?: Partial<Record<FeelName, FeelValue>>;
  contrast?: { method?: ContrastMethod; model?: ContrastModel };
}

/** A theme set: a tree of themes. Theme names use lowercase letters, digits, and single hyphens. */
export interface Inputs {
  $schema?: string;
  /** The inputs format. Version 1 is still read. */
  version?: 1 | 2;
  themes?: Record<string, ThemeInput>;
}

// ---- Normalized inputs: what normalizeInputs returns.

export interface Font {
  family: string | null;
  fallback: string;
  /** Your own font files. Weights are strings. */
  src?: { url: string; weight?: string; style?: 'normal' | 'italic' }[];
}

/** A theme's own fields, checked, with words turned into numbers. */
export interface ThemeOwnFields {
  parent?: string;
  label?: string;
  color?: Hex;
  base?: Hex;
  action?: Hex;
  font?: Font;
  headingFont?: Font;
  monoFont?: Font;
  typeVariance?: number;
  preset?: PresetName;
  feel?: Partial<Record<FeelName, number | 'inherit'>>;
  contrast?: { method?: ContrastMethod; model?: ContrastModel };
}

/** A theme's full settings: its own fields over its parent's. */
export interface ResolvedTheme {
  name: string;
  parent: string | null;
  label: string;
  /** "color" if the theme sets only colors, else "full". */
  kind: 'color' | 'full';
  base: Hex;
  action: Hex;
  font: Font;
  headingFont: Font;
  monoFont: Font;
  typeVariance: number;
  preset: PresetName;
  feel: Record<FeelName, number>;
  contrast: { method: ContrastMethod; level: ContrastLevel; model: ContrastModel };
}

export interface NormalizedInputs {
  themes: Record<string, ThemeOwnFields>;
  /** The theme names as a tree, depth first: each theme, then its children. */
  order: string[];
  resolved: Record<string, ResolvedTheme>;
}

// ---- Built themes: what buildThemes returns. See "The theme object" in src/README.md.

export interface Palette {
  key: Hex;
  model: ContrastModel;
  keyGrade: number;
  hue: number;
  chroma: number;
  /** One hex color for each grade: 0, 5, 10, ... 100. */
  steps: Record<number, Hex>;
}

export interface GradeGaps {
  text: number | null;
  large: number | null;
  ui: number | null;
}

export interface SemanticToken {
  /** The palette and grade, such as "action.60" or "action.key". */
  ref: string;
  grade: number;
  value: Hex;
}

export interface AuditEntry {
  fg: string;
  bg: string;
  fgValue: string;
  bgValue: string;
  /** A purpose, or a text size and weight as "text 18px/700". */
  purpose: string;
  required: boolean;
  wcag: number;
  apca: number;
  pass: boolean;
}

export interface ModeTokens {
  tokens: Record<string, SemanticToken>;
  /** Panel colors and shadows. */
  computed: Record<string, unknown>;
  audit: AuditEntry[];
}

/** The tokens of one theme at one contrast level. */
export interface ThemeLevel {
  settings: ResolvedTheme;
  gaps: GradeGaps;
  /** See spec/tokens.md. The shape can change before 1.0. */
  primitives: Record<string, any>;
  modes: Record<Mode, ModeTokens>;
}

export interface Theme extends ThemeLevel {
  name: string;
  parent: string | null;
  kind: 'color' | 'full';
  palettes: Record<Role, Palette>;
  /** The more-contrast variant, at the enhanced level. Null when the theme is already enhanced. */
  more: ThemeLevel | null;
}

export interface BuiltThemes {
  inputs: NormalizedInputs;
  order: string[];
  themes: Record<string, Theme>;
}

// ---- tokens.js

export const MODES: Mode[];
/** Builds every theme in the tree. Throws InputError when the inputs have problems. */
export function buildThemes(inputs?: Inputs): BuiltThemes;
/** Builds one theme from its resolved settings. */
export function buildTheme(settings: ResolvedTheme): Theme;

// ---- export.js

export interface CssOptions {
  /** The token prefix. Default "tm". */
  prefix?: string;
  /** The theme class prefix. Default "theme-". */
  classPrefix?: string;
  /** Also put the root theme on :root. Default true. */
  root?: boolean;
  /** Add the more-contrast variant. Default true. */
  more?: boolean;
}
export function toCss(built: BuiltThemes, options?: CssOptions): string;
/** Design Tokens Community Group JSON: one group for each theme. */
export function toDtcg(built: BuiltThemes): Record<string, any>;
/** A Tailwind CSS v4 `@theme inline` block. Use it with the output of toCss. */
export function toTailwind(built: BuiltThemes, options?: { prefix?: string }): string;
/** shadcn/ui theme variables, for its globals.css. */
export function toShadcn(built: BuiltThemes, options?: { classPrefix?: string }): string;
/** Bootstrap 5 Sass variables, to import before Bootstrap. The root theme's light values, with *-dark twins. */
export function toBootstrapSass(built: BuiltThemes, options?: { more?: boolean }): string;
/** Bootstrap 5.3 CSS variables, for a page that loads Bootstrap's compiled CSS. */
export function toBootstrapCss(built: BuiltThemes, options?: { classPrefix?: string }): string;
/** A Material UI theme for createTheme(), with light and dark colorSchemes. */
export function toMui(built: BuiltThemes, options?: { theme?: string; more?: boolean }): Record<string, any>;
/** daisyUI 5 themes for a Tailwind CSS v4 stylesheet. Use it with the output of toCss. */
export function toDaisyui(built: BuiltThemes, options?: { prefix?: string; classPrefix?: string; name?: string }): string;
/** A Google Fonts URL for the named font families of all themes, or null. Families with their own files are not in it. */
export function fontImport(built: BuiltThemes): string | null;
/** The @font-face rules for the themes' own font files, or "". */
export function fontFaces(built: BuiltThemes): string;

// ---- inputs.js

export interface FeelSpec {
  label: string;
  default: number;
  stops: Record<string, number>;
}
export const FEELS: Record<FeelName, FeelSpec>;
export const REMOVED_FEELS: string[];
export const TYPE_VARIANCE: FeelSpec;
export const PRESETS: Record<PresetName, { label: string; feel: Partial<Record<FeelName, number>> }>;
/** The root theme's name: "default". */
export const ROOT: 'default';
export const ROLES: Role[];
export const INHERIT: 'inherit';
export const ROOT_DEFAULTS: {
  base: Hex;
  action: Hex;
  font: Font;
  monoFont: Font;
  typeVariance: number;
  preset: PresetName;
  contrast: { method: ContrastMethod; level: ContrastLevel; model: ContrastModel };
};
export const THEME_FIELDS: (keyof ThemeInput)[];
export const FONT_FIELDS: ('font' | 'headingFont' | 'monoFont')[];
/** The pattern of a font file URL. */
export const FONT_URL: RegExp;
/** The pattern of a font file weight: "400", or a range such as "100 900". */
export const FONT_WEIGHT: RegExp;
export const FONT_STYLES: ('normal' | 'italic')[];
export const CONTRAST_METHODS: ContrastMethod[];
export const CONTRAST_LEVELS: ContrastLevel[];
export const CONTRAST_MODELS: ContrastModel[];
export const INPUTS_VERSION: 2;
export const THEME_NAME: RegExp;
/** A valid theme name from any text. "Big Sale!" becomes "big-sale". */
export function themeName(text: unknown): string;
/** A theme's label from its name. "big-sale" becomes "Big sale". */
export function defaultLabel(name: string): string;
/** The inputs have problems. The message has one line for each problem. */
export class InputError extends Error {}
/** Checks the inputs and fills in defaults. Throws InputError when they have problems. */
export function normalizeInputs(inputs?: Inputs): NormalizedInputs;
/** The word nearest to a value of a feel, or of the type variance ("typeVariance"). */
export function feelWord(name: FeelName | 'typeVariance', value: number): string;
/** A feel object with old feels (solidity, thickness) moved to their new names. */
export function turnOldFeels<T>(feel: T): T;

// ---- palette.js

/** The grades: 0, 5, 10, ... 100. */
export const GRADES: number[];
export const COLOR_MODELS: Record<ContrastModel, {
  label: string;
  keyOf: (rgb: Rgb) => [number, number];
  at: (hue: number, chroma: number, luminance: number) => Rgb;
}>;
export const THRESHOLDS: Record<ContrastMethod, Record<ContrastLevel, Record<Purpose, number>>>;
/** The WCAG luminance of a grade. */
export function gradeLuminance(grade: number): number;
export function makePalette(keyHex: Hex, model?: ContrastModel): Palette;
/** The WCAG 2 ratio and the APCA Lc of a pair. */
export function measure(fgHex: Hex, bgHex: Hex): { wcag: number; apca: number };
export type ContrastTest = (fgHex: Hex, bgHex: Hex, purpose: Purpose | TextPurpose) => boolean;
export function contrastTest(setting?: { method?: ContrastMethod; level?: ContrastLevel }): ContrastTest;
export function gradeGaps(palettes: Palette[], test: ContrastTest): GradeGaps;
/** The smallest APCA Lc in its font table for text of this size (px) and weight. Infinity where no row fits. */
export function apcaMinLc(size: number, weight: number): number;
/** The minimum contrast for a method, level, and purpose: a WCAG 2 ratio or an APCA Lc. */
export function minContrast(method: ContrastMethod, level: ContrastLevel, purpose: Purpose | TextPurpose): number;
/** A short name for a purpose: "text", or "text 18px/700". */
export function purposeName(purpose: Purpose | TextPurpose): string;

// ---- color.js

/** sRGB channels from 0 to 1. */
export type Rgb = [number, number, number];
/** The OKLCH lightness that gives this WCAG luminance at this hue and chroma. */
export function lightnessForLuminance(hue: number, chroma: number, luminance: number): number;
/** The color with this hue, and as much of this chroma as sRGB allows, at this WCAG luminance. */
export function colorAtLuminance(hue: number, chroma: number, luminance: number): Rgb;
export function wcagContrast(a: Rgb, b: Rgb): number;
/** APCA Lc: positive for dark text on light, negative for light text on dark. */
export function apcaContrast(text: Rgb, bg: Rgb): number;

// ---- manifest.js

export interface TokenInfo {
  tier: 'primitive' | 'semantic';
  type: string;
  modes: boolean;
  role?: Role;
  global?: boolean;
  stability: 'stable' | 'experimental';
  meaning?: string;
}
export interface TokenManifest {
  contract: string;
  prefix: string;
  note: string;
  selectors: Record<string, string>;
  pairs: { fg: string[]; bg: string[]; purpose: Purpose }[];
  tokens: Record<string, TokenInfo>;
}
/** The token contract, as in spec/tokens.manifest.json. */
export function tokenManifest(): TokenManifest;
/** The JSON Schema of the inputs, as in spec/inputs.schema.json. */
export function inputsSchema(): Record<string, any>;
/** The version of the token contract. It is not the package version. */
export const CONTRACT_VERSION: string;
/** The base URL where the site publishes the manifest and the inputs schema. */
export const SPEC_URL: string;
/** The URL of a published contract file: the latest one, or a released version's copy. */
export function specUrl(file: string, version?: string): string;
/** The URL of the latest inputs schema. It is also the schema's $id. */
export const INPUTS_SCHEMA_URL: string;
/** The URL of the latest token manifest. */
export const MANIFEST_URL: string;
