export type Theme = 'light' | 'dark' | 'auto';

export class ThemeManager {
  static getStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'auto';
    return (localStorage.getItem('theme') as Theme) || 'auto';
  }

  static setStoredTheme(theme: Theme) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('theme', theme);
    this.applyTheme(theme);
  }

  static applyTheme(theme: Theme) {
    if (typeof window === 'undefined') return;

    const body = window.document.body;
    body.classList.remove('light', 'dark');

    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      body.classList.add(isDark ? 'dark' : 'light');
    } else {
      body.classList.add(theme);
    }
  }

  static initialize() {
    if (typeof window === 'undefined') return;
    
    const theme = this.getStoredTheme();
    this.applyTheme(theme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.getStoredTheme() === 'auto') {
        this.applyTheme('auto');
      }
    });
  }
}