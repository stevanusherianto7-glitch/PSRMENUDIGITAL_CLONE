/**
 * useThemeStore — Dual Theme Manager
 * Manages light/dark theme toggling with localStorage persistence.
 * Applies the `.dark` class to <html> element for CSS variable switching.
 */

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pawon_theme";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // localStorage not available
  }
  // Default: light (Heritage Modern)
  return "light";
}

function applyThemeToDOM(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  // Update meta theme-color for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#0F0F12" : "#F7F1E6");
  }
}

export function useThemeStore() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply theme on mount and changes
  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage not available
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === "light" ? "dark" : "light");
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  return { theme, toggleTheme, setTheme, isDark: theme === "dark" };
}

// Apply theme immediately on script load to prevent flash
(function initTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch {
    // silent
  }
})();
