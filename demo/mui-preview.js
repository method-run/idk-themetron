// The playground's MUI preview: stock Material UI parts, in a light and a dark section, with the
// theme from the MUI format. The playground sends { theme, css, children } in a message: css
// holds themetron's looks for MUI when they are on.
import { createElement as h, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createTheme, ThemeProvider, ScopedCssBaseline, Box, Stack, Typography, Button, Chip, Alert, TextField, MenuItem,
  Checkbox, Radio, Switch, Slider, FormControlLabel, Tabs, Tab, Card, CardContent, CardActions, LinearProgress, Pagination, Link,
} from '@mui/material';

const root = createRoot(document.getElementById('root'));
const STATUSES = ['error', 'warning', 'success', 'info'];

function Sample({ theme, mode, children }) {
  // The format's theme has both modes in colorSchemes. Each section takes one as its palette.
  const { colorSchemes, ...rest } = theme;
  const muiTheme = createTheme({ ...rest, palette: colorSchemes[mode].palette });
  const row = (...items) => h(Stack, { direction: 'row', spacing: 1, useFlexGap: true, sx: { flexWrap: 'wrap', mb: 2 } }, ...items);
  return h(ThemeProvider, { theme: muiTheme },
    h(ScopedCssBaseline, { 'data-tm-mode': mode, sx: { p: 3, bgcolor: 'background.default' } },
      h(Typography, { variant: 'h6', sx: { mb: 2 } }, mode === 'light' ? 'Light' : 'Dark'),
      row(
        h(Button, { variant: 'contained' }, 'Contained'),
        h(Button, { variant: 'contained', color: 'secondary' }, 'Secondary'),
        h(Button, { variant: 'outlined' }, 'Outlined'),
        h(Button, { variant: 'text' }, 'Text'),
      ),
      row(...STATUSES.map((c) => h(Button, { key: c, variant: 'contained', color: c }, c)), h(Button, { variant: 'outlined', color: 'error' }, 'Outlined')),
      row(h(Chip, { label: 'Chip', color: 'primary' }), h(Chip, { label: 'Outlined', variant: 'outlined', color: 'primary' }), h(Chip, { label: 'Error', color: 'error' }), h(Chip, { label: 'Default' })),
      h(Typography, { sx: { mb: 2 } }, 'Body text with ', h(Link, { href: '#' }, 'a link'), '. ', h(Typography, { component: 'span', color: 'text.secondary' }, 'Secondary text.')),
      h(Alert, { severity: 'info', sx: { mb: 1 } }, 'An info alert.'),
      h(Alert, { severity: 'error', sx: { mb: 2 } }, 'An error alert.'),
      h(Box, { sx: { display: 'grid', gap: 2, gridTemplateColumns: { sm: '1fr 1fr' }, mb: 2 } },
        h(Card, null,
          h(CardContent, null, h(Typography, { variant: 'subtitle1', fontWeight: 600 }, 'Card title'), h(Typography, { variant: 'body2', color: 'text.secondary' }, 'Some text in a card.')),
          h(CardActions, null, h(Button, { size: 'small', variant: 'contained' }, 'Go'), h(Button, { size: 'small' }, 'Later'))),
        h(Stack, { spacing: 2 },
          h(TextField, { label: 'Email', placeholder: 'ada@example.org', size: 'small' }),
          h(TextField, { select: true, label: 'City', value: 'harbor', size: 'small' }, h(MenuItem, { value: 'harbor' }, 'Harbor'), h(MenuItem, { value: 'tide' }, 'Tide')),
          h(Stack, { direction: 'row', sx: { flexWrap: 'wrap' } },
            h(FormControlLabel, { control: h(Checkbox, { defaultChecked: true }), label: 'Check' }),
            h(FormControlLabel, { control: h(Radio, { checked: true }), label: 'Radio' }),
            h(FormControlLabel, { control: h(Switch, { defaultChecked: true }), label: 'Switch' })),
          h(Slider, { defaultValue: 60, size: 'small' }))),
      h(Tabs, { value: 0, sx: { mb: 2 } }, h(Tab, { label: 'Active' }), h(Tab, { label: 'Tab' }), h(Tab, { label: 'Disabled', disabled: true })),
      h(LinearProgress, { variant: 'determinate', value: 60, sx: { mb: 2 } }),
      h(Pagination, { count: 3, page: 2, color: 'primary' }),
      children.length ? h(Fragment, null,
        h(Typography, { variant: 'subtitle2', sx: { mt: 3, mb: 1 } }, 'Child themes'),
        ...children.map((name) => h(Stack, { key: name, className: `theme-${name}`, direction: 'row', spacing: 1, sx: { mb: 1, alignItems: 'center' } },
          h(Button, { size: 'small', variant: 'contained' }, name), h(Button, { size: 'small', variant: 'outlined' }, 'Outlined'), h(Link, { href: '#' }, 'A link')))) : null,
    ));
}

addEventListener('message', ({ origin, data }) => {
  if (origin !== location.origin || !data?.theme) return;
  document.getElementById('looks').textContent = data.css;
  root.render(h(Fragment, null, ...['light', 'dark'].map((mode) => h(Sample, { key: mode, theme: data.theme, mode, children: data.children }))));
});
// Tell the playground that the page can take a message.
parent.postMessage({ muiPreviewReady: true }, location.origin);
