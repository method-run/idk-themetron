# Audit

Made by `npm run examples`. Each row counts the required pairs that pass the theme's contrast setting. "More" is the more-contrast variant.

| Theme | Kind | Level | Mode | Pass | Fail |
|---|---|---|---|---|---|
| default | full | base: wcag standard | light | 20 | 0 |
| default | full | base: wcag standard | dark | 20 | 0 |
| default | full | more: wcag enhanced | light | 20 | 0 |
| default | full | more: wcag enhanced | dark | 20 | 0 |
| success | color | base: wcag standard | light | 20 | 0 |
| success | color | base: wcag standard | dark | 20 | 0 |
| success | color | more: wcag enhanced | light | 20 | 0 |
| success | color | more: wcag enhanced | dark | 20 | 0 |
| warning | color | base: wcag standard | light | 20 | 0 |
| warning | color | base: wcag standard | dark | 20 | 0 |
| warning | color | more: wcag enhanced | light | 20 | 0 |
| warning | color | more: wcag enhanced | dark | 20 | 0 |
| danger | color | base: wcag standard | light | 20 | 0 |
| danger | color | base: wcag standard | dark | 20 | 0 |
| danger | color | more: wcag enhanced | light | 20 | 0 |
| danger | color | more: wcag enhanced | dark | 20 | 0 |
| promo | full | base: wcag standard | light | 20 | 0 |
| promo | full | base: wcag standard | dark | 20 | 0 |
| promo | full | more: wcag enhanced | light | 20 | 0 |
| promo | full | more: wcag enhanced | dark | 20 | 0 |
| sale | color | base: wcag standard | light | 20 | 0 |
| sale | color | base: wcag standard | dark | 20 | 0 |
| sale | color | more: wcag enhanced | light | 20 | 0 |
| sale | color | more: wcag enhanced | dark | 20 | 0 |

No required pair fails.

## Warnings

Pairs that are not required, but miss the contrast setting, such as the exact button.

- success, base, light: `on-fill.action-exact-active` on `fill.action-exact-active`, text: 3.93:1, Lc -25.7
- success, base, dark: `on-fill.action-exact-active` on `fill.action-exact-active`, text: 3.93:1, Lc 28.1
- warning, more, light: `on-fill.action-exact-active` on `fill.action-exact-active`, text: 6.21:1, Lc -40.9
- warning, more, dark: `on-fill.action-exact-active` on `fill.action-exact-active`, text: 6.21:1, Lc 43.2
- danger, base, light: `on-fill.action-exact-hover` on `fill.action-exact-hover`, text: 3.95:1, Lc -71.2
- danger, base, dark: `on-fill.action-exact-hover` on `fill.action-exact-hover`, text: 3.95:1, Lc 65.7
- promo, base, light: `on-fill.action-exact-active` on `fill.action-exact-active`, text: 3.94:1, Lc -26.1
- promo, base, dark: `on-fill.action-exact-active` on `fill.action-exact-active`, text: 3.94:1, Lc 28.4
