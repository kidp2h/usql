"use client";

import React from "react";

export type Theme = "dark" | "light";

const storageKey = "theme";

function getPreferredTheme(): Theme {
    if (typeof window === "undefined") return "light";

    const stored = localStorage.getItem(storageKey);
    if (stored === "dark" || stored === "light") return stored;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

type ThemeContextType = {
    theme: Theme;
    setThemeMode: (theme: Theme) => void;
    toggleTheme: () => void;
};

export const ThemeContext = React.createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = React.useState<Theme>(() => getPreferredTheme());

    React.useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        localStorage.setItem(storageKey, theme);
    }, [theme]);

    const toggleTheme = React.useCallback(() => {
        setTheme((t) => (t === "dark" ? "light" : "dark"));
    }, []);

    const setThemeMode = React.useCallback((mode: Theme) => {
        setTheme(mode);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

