const THEME_KEY = 'brmodelo-plus-theme';

export type ThemeMode = 'light' | 'dark';

export const getStoredTheme = (): ThemeMode => {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'dark' || v === 'light') return v;
  } catch {
    /* ignore */
  }
  return 'light';
};

export const applyTheme = (theme: ThemeMode) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
};

export const toggleTheme = (): ThemeMode => {
  const next: ThemeMode = getStoredTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
};
