export type AppTheme = 'light' | 'dark';

export interface ThemeResolutionInput {
  storedTheme?: string;
  prefersDark: boolean;
}

export function resolveInitialTheme(input: ThemeResolutionInput): AppTheme {
  if (input.storedTheme === 'dark' || input.storedTheme === 'light') {
    return input.storedTheme;
  }

  return input.prefersDark ? 'dark' : 'light';
}

export function toggleTheme(current: AppTheme): AppTheme {
  return current === 'dark' ? 'light' : 'dark';
}

export function readBrowserTheme(): AppTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return resolveInitialTheme({
    storedTheme: window.localStorage.getItem('cenio-theme') ?? undefined,
    prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  });
}

export function applyBrowserTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('cenio-theme', theme);
  }
}
