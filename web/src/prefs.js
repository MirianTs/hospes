import { useSyncExternalStore } from 'react';

// Language (ka / en) and colour theme (light / dark), remembered in this browser.
//
// Text: L('ქართული', 'English') returns the string for the current language. It works anywhere
// (components, helpers, the demo API), because changing the language remounts the whole app.

const LANG_KEY = 'hospes_lang';
const THEME_KEY = 'hospes_theme';
const subs = new Set();

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: the choice lasts until reload
  }
}

let state = {
  lang: read(LANG_KEY) === 'en' ? 'en' : 'ka',
  theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light', // set by the script in index.html
};
document.documentElement.lang = state.lang;

function set(patch) {
  state = { ...state, ...patch };
  subs.forEach((fn) => fn());
}

export const getLang = () => state.lang;
export const L = (ka, en) => (state.lang === 'en' && en != null ? en : ka);
// Data rows with an English copy: loc(hotel, 'name') -> hotel.name_en in English.
export const loc = (obj, field) => (state.lang === 'en' && obj?.[`${field}_en`]) || obj?.[field];

export function setLang(lang) {
  write(LANG_KEY, lang);
  document.documentElement.lang = lang;
  set({ lang });
}

export function setTheme(theme) {
  write(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121512' : '#365e32');
  set({ theme });
}

export function usePrefs() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => state,
  );
}
