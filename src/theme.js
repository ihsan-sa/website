import { useEffect, useState } from 'react';

// The theme switch's state, shared by the front page (App.js) and the essay pages
// (writing/Writing.js).
const THEME_KEY = 'ihsan-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

// jsdom (tests) ships no matchMedia; treat a missing implementation as light.
function systemPrefersDark() {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

// An explicit choice wins and persists; with no choice, the OS decides.
// The inline script in index.html has already applied any stored choice to
// <html> before React mounts, so read it back rather than re-deriving it.
export function useTheme() {
  const [choice, setChoice] = useState(() =>
    document.documentElement.getAttribute('data-theme')
  );
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const isDark = choice ? choice === 'dark' : systemDark;

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {
      // Private browsing can reject writes; the toggle still works for this visit.
    }
    setChoice(next);
  };

  return [isDark, toggle];
}
