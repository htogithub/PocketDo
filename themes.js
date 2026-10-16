/* PocketDo - themes, accent and list colours.
   Loaded synchronously in <head> so the right colours are painted before the app starts. */
(function () {
  'use strict';

  var THEMES = {
    light:    { scheme: 'light', bg: '#FFFFFF', surface: '#F3F4F6', surface2: '#E7E9ED', sheet: '#FFFFFF', raise: '#FFFFFF', line: '#E6E8EC', text: '#16181D', text2: '#5E636E', text3: '#9CA1AB', accent: '#3B5BFD', danger: '#E5484D' },
    dark:     { scheme: 'dark',  bg: '#131417', surface: '#1D1E23', surface2: '#282A30', sheet: '#1D1E23', raise: '#2A2C33', line: '#2C2E35', text: '#EDEEF0', text2: '#A3A6AE', text3: '#6C707A', accent: '#6E86FF', danger: '#FF6369' },
    amoled:   { scheme: 'dark',  bg: '#000000', surface: '#0E0E10', surface2: '#1A1A1D', sheet: '#0E0E10', raise: '#1C1C20', line: '#1F2024', text: '#F2F2F3', text2: '#9EA0A6', text3: '#62646B', accent: '#7B8CFF', danger: '#FF6369' },
    glacier:  { scheme: 'light', bg: '#EEF3F8', surface: '#E1E9F2', surface2: '#D3DEEA', sheet: '#F8FAFD', raise: '#FFFFFF', line: '#D6E0EB', text: '#18222E', text2: '#566576', text3: '#8E9AA8', accent: '#2F7DD1', danger: '#D64545' },
    lavender: { scheme: 'light', bg: '#F6F4FC', surface: '#ECE8F8', surface2: '#E1DBF3', sheet: '#FFFFFF', raise: '#FFFFFF', line: '#E3DEF3', text: '#211C33', text2: '#655D80', text3: '#9C95B3', accent: '#7457F0', danger: '#D9455F' },
    rose:     { scheme: 'light', bg: '#FDF5F6', surface: '#F7E7EA', surface2: '#F0DADF', sheet: '#FFFFFF', raise: '#FFFFFF', line: '#F0DDE1', text: '#2C1A1F', text2: '#7E5D66', text3: '#B2959C', accent: '#D9466F', danger: '#C93636' },
    matcha:   { scheme: 'light', bg: '#F2F5EE', surface: '#E5EBDE', surface2: '#D9E1D0', sheet: '#FBFCF9', raise: '#FFFFFF', line: '#DDE4D5', text: '#1C2619', text2: '#5A6853', text3: '#8F9A88', accent: '#4C8A3A', danger: '#C8453B' },
    midnight: { scheme: 'dark',  bg: '#0E1424', surface: '#162036', surface2: '#1F2A44', sheet: '#162036', raise: '#22304D', line: '#24314F', text: '#E6EBF6', text2: '#97A3BF', text3: '#5F6B88', accent: '#7EA6FF', danger: '#FF6B7A' },
    forest:   { scheme: 'dark',  bg: '#0D1714', surface: '#15221D', surface2: '#1D2E27', sheet: '#15221D', raise: '#22352D', line: '#22362D', text: '#E2EEE7', text2: '#90A99B', text3: '#5C7367', accent: '#5ACF95', danger: '#FF7366' },
    ember:    { scheme: 'dark',  bg: '#1A1314', surface: '#251B1D', surface2: '#312427', sheet: '#251B1D', raise: '#36282B', line: '#3A2B2F', text: '#F5E9E5', text2: '#B89F99', text3: '#7E6863', accent: '#FF8C5A', danger: '#FF6B6B' },
    mono:     { scheme: 'light', bg: '#FFFFFF', surface: '#F2F2F2', surface2: '#E6E6E6', sheet: '#FFFFFF', raise: '#FFFFFF', line: '#E5E5E5', text: '#111111', text2: '#5C5C5C', text3: '#9A9A9A', accent: '#111111', danger: '#D33A3A' }
  };

  var ORDER = ['auto', 'light', 'dark', 'amoled', 'glacier', 'lavender', 'rose', 'matcha', 'midnight', 'forest', 'ember', 'mono'];

  var ACCENTS = ['#3B5BFD', '#7457F0', '#D9466F', '#E5484D', '#F2762E', '#E6A100', '#2FAE6B', '#12A594', '#2E9BEA', '#5E6572'];

  var LIST_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
                     '#38BDF8', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E', '#64748B'];

  function luminance(hex) {
    var n = parseInt(String(hex).replace('#', '').slice(0, 6), 16);
    if (isNaN(n)) return 0;
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function onColor(hex) { return luminance(hex) > 0.3 ? '#111111' : '#FFFFFF'; }

  function resolve(name) {
    if (name === 'auto' || !THEMES[name]) {
      var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return name === 'auto' || !name ? (dark ? 'dark' : 'light') : 'light';
    }
    return name;
  }

  function apply(name, accent) {
    var key = resolve(name);
    var th = THEMES[key];
    var root = document.documentElement;
    var s = root.style;
    s.setProperty('--bg', th.bg);
    s.setProperty('--surface', th.surface);
    s.setProperty('--surface-2', th.surface2);
    s.setProperty('--sheet', th.sheet);
    s.setProperty('--raise', th.raise);
    s.setProperty('--line', th.line);
    s.setProperty('--text', th.text);
    s.setProperty('--text-2', th.text2);
    s.setProperty('--text-3', th.text3);
    s.setProperty('--danger', th.danger);
    var acc = accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : th.accent;
    s.setProperty('--accent', acc);
    s.setProperty('--on-accent', onColor(acc));
    s.colorScheme = th.scheme;
    root.setAttribute('data-scheme', th.scheme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', th.bg);
    return key;
  }

  window.PT_THEMES = THEMES;
  window.PT_THEME_ORDER = ORDER;
  window.PT_ACCENTS = ACCENTS;
  window.PT_LIST_COLORS = LIST_COLORS;
  window.PT_onColor = onColor;
  window.PT_applyTheme = apply;
  window.PT_resolveTheme = resolve;
})();
