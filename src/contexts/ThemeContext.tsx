import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeName = "default" | "ocean" | "forest" | "rose" | "slate" | "sunset";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  isDark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  setTheme: () => {},
  isDark: false,
  toggleDark: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const THEME_OPTIONS: { value: ThemeName; label: string; preview: string }[] = [
  { value: "default", label: "Amber", preview: "hsl(37 92% 50%)" },
  { value: "ocean", label: "Ocean", preview: "hsl(221 83% 53%)" },
  { value: "forest", label: "Forest", preview: "hsl(142 71% 35%)" },
  { value: "rose", label: "Rose", preview: "hsl(346 77% 50%)" },
  { value: "slate", label: "Slate", preview: "hsl(215 16% 47%)" },
  { value: "sunset", label: "Sunset", preview: "hsl(25 95% 53%)" },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem("app-theme") as ThemeName) || "default";
  });
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("app-dark") === "true";
  });

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem("app-theme", t);
  };

  const toggleDark = () => {
    setIsDark((prev) => {
      localStorage.setItem("app-dark", String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    root.classList.remove("dark", "theme-default", "theme-ocean", "theme-forest", "theme-rose", "theme-slate", "theme-sunset");
    root.classList.add(`theme-${theme}`);
    if (isDark) root.classList.add("dark");
  }, [theme, isDark]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
