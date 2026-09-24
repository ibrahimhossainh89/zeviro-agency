import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Theme preference: 'light' | 'dark' | 'system'. Default = 'dark'.
// The initial class is set by an inline script in index.html (no flash on load);
// this context keeps it in sync afterwards.
export const THEME_KEY = 'zv_theme';
const ThemeCtx = createContext({ theme: 'dark', resolved: 'dark', setTheme: () => {} });

const systemPrefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;

function readStored() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return ['light', 'dark', 'system'].includes(v) ? v : 'dark';
  } catch {
    return 'dark';
  }
}

function apply(resolved, animate) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 300);
  }
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f6f7fb' : '#06060b');
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  // follow OS changes while "system" is selected
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const f = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);

  useEffect(() => {
    apply(resolved, false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback((t) => {
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* private mode etc. — theme still applies for this visit */
    }
    setThemeState(t);
  }, []);

  useEffect(() => {
    apply(resolved, true);
  }, [resolved]);

  // keep multiple tabs in sync
  useEffect(() => {
    const f = (e) => e.key === THEME_KEY && setThemeState(readStored());
    window.addEventListener('storage', f);
    return () => window.removeEventListener('storage', f);
  }, []);

  return <ThemeCtx.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
