// A combobox: a text field with a tm-menu of choices below it. Typing filters the choices,
// and the field still takes any text, so a choice is a suggestion, not a limit.
// The menu is a popover, so it shows over any scrolling panel.
//
//   combobox(input, {
//     groups: () => [{ label, items: [{ value, label, note, font }] }],
//     onPick: (value) => {},          // a row was chosen
//     onOpen: (menu) => {},           // before the menu shows, such as to set its theme class
//     onGroupShown: (group) => {},    // a group scrolled into view, such as to load its fonts
//   });
//
// Keys: Down and Up move, Home and End jump, Enter picks, Escape closes. Enter with no row
// active leaves the field's own change event to the page.
let count = 0;

export function combobox(input, { groups, onPick, onOpen, onGroupShown }) {
  const id = `tm-combobox-${++count}`;
  const menu = document.createElement('div');
  menu.className = 'tm-menu';
  menu.id = id;
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('popover', 'manual');
  document.body.append(menu);
  Object.assign(input, { autocomplete: 'off' });
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-controls', id);
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');

  let rows = [];
  let active = -1;
  const shown = new WeakMap();
  const seen = onGroupShown && new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && shown.has(e.target)) onGroupShown(shown.get(e.target));
  }, { root: menu, rootMargin: '200px 0px' });
  // What the field held when the menu opened. Until the person types, every choice shows.
  let typed = null;

  const isOpen = () => input.getAttribute('aria-expanded') === 'true';

  function render() {
    const query = (typed ?? '').trim().toLowerCase();
    const match = (group, item) => !query || [item.label, item.value, item.note].some((t) => t?.toLowerCase().includes(query)) || group.label?.toLowerCase().startsWith(query);
    rows = [];
    seen?.disconnect();
    menu.replaceChildren();
    for (const [g, group] of groups().entries()) {
      const items = group.items.filter((item) => match(group, item));
      if (!items.length) continue;
      const box = document.createElement('div');
      box.className = 'tm-menu-group';
      box.setAttribute('role', 'group');
      if (group.label) {
        const label = document.createElement('div');
        label.className = 'tm-menu-label';
        label.id = `${id}-g${g}`;
        label.textContent = group.label;
        box.setAttribute('aria-labelledby', label.id);
        box.append(label);
      }
      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'tm-menu-item';
        row.id = `${id}-${rows.length}`;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(item.value === input.value));
        if (item.font) row.style.setProperty('--menu-item-font', item.font);
        const name = document.createElement('span');
        name.textContent = item.label ?? item.value;
        row.append(name);
        if (item.note) {
          const note = document.createElement('span');
          note.className = 'tm-menu-note';
          note.textContent = item.note;
          row.append(note);
        }
        // Keep the focus in the field.
        row.addEventListener('pointerdown', (e) => e.preventDefault());
        row.addEventListener('click', () => pick(item.value));
        rows.push({ row, item });
        box.append(row);
      }
      menu.append(box);
      shown.set(box, group);
      seen?.observe(box);
    }
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'tm-menu-empty';
      empty.textContent = 'No matches. Press Enter to use what you typed.';
      menu.append(empty);
    }
    setActive(query ? 0 : rows.findIndex((r) => r.item.value === input.value));
  }

  function setActive(i) {
    rows[active]?.row.classList.remove('is-active');
    active = rows.length ? Math.max(-1, Math.min(i, rows.length - 1)) : -1;
    const row = rows[active]?.row;
    if (row) {
      row.classList.add('is-active');
      row.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', row.id);
    } else input.removeAttribute('aria-activedescendant');
  }

  // Below the field, or above it when there is more room there. On a phone, the visual
  // viewport leaves out the keyboard, so the menu stays above it.
  function place() {
    const box = input.getBoundingClientRect();
    const gap = 4;
    const view = window.visualViewport ?? { offsetTop: 0, height: innerHeight };
    const below = view.offsetTop + view.height - box.bottom - gap;
    const above = box.top - view.offsetTop - gap;
    menu.style.maxWidth = `${innerWidth - 2 * gap}px`;
    menu.style.minWidth = `${Math.min(box.width, innerWidth - 2 * gap)}px`;
    menu.style.left = `${Math.max(gap, Math.min(box.left, innerWidth - menu.offsetWidth - gap))}px`;
    const up = below < Math.min(menu.scrollHeight, 240) && above > below;
    menu.style.maxHeight = `min(var(--menu-max-height, 20rem), ${(up ? above : below) - gap}px)`;
    menu.style.top = up ? 'auto' : `${box.bottom + gap}px`;
    menu.style.bottom = up ? `${innerHeight - box.top + gap}px` : 'auto';
  }

  function open() {
    if (isOpen()) return;
    typed = null;
    onOpen?.(menu);
    render();
    menu.showPopover?.();
    input.setAttribute('aria-expanded', 'true');
    place();
    rows[active]?.row.scrollIntoView({ block: 'center' });
    addEventListener('resize', place);
    addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
  }

  function close() {
    if (!isOpen()) return;
    menu.hidePopover?.();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    removeEventListener('resize', place);
    removeEventListener('scroll', place, true);
    window.visualViewport?.removeEventListener('resize', place);
  }

  function pick(value) {
    input.value = value;
    close();
    onPick(value);
  }

  input.addEventListener('click', () => (isOpen() ? close() : open()));
  input.addEventListener('input', () => {
    open();
    typed = input.value;
    render();
    place();
  });
  input.addEventListener('blur', close);
  input.addEventListener('keydown', (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 }[e.key];
    if (step) {
      e.preventDefault();
      if (!isOpen()) open();
      else setActive(active < 0 && step < 0 ? rows.length - 1 : active + step);
    } else if ((e.key === 'Home' || e.key === 'End') && isOpen() && rows.length) {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : rows.length - 1);
    } else if (e.key === 'Enter' && isOpen() && rows[active]) {
      e.preventDefault();
      pick(rows[active].item.value);
    } else if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  });

  // Take the menu out of the page, when the field goes away.
  const destroy = () => { close(); seen?.disconnect(); menu.remove(); };

  return { open, close, destroy, menu };
}
