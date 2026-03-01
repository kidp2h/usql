import * as React from "react";

const storageKey = "theme";

export type Theme = "dark" | "light";

export function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = window.localStorage.getItem(storageKey);
  if (stored === "dark" || stored === "light") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(getPreferredTheme());

  React.useEffect(() => {
    const preferred = getPreferredTheme();
    setTheme(preferred);
    document.documentElement.classList.toggle("dark", preferred === "dark");
  }, [theme]);

  const toggleTheme = React.useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem(storageKey, next);
      return next;
    });
  }, []);

  const setThemeMode = React.useCallback((mode: Theme) => {
    setTheme(mode);
    document.documentElement.classList.toggle("dark", mode === "dark");
    window.localStorage.setItem(storageKey, mode);
  }, []);

  return { theme, toggleTheme, setThemeMode };
}
