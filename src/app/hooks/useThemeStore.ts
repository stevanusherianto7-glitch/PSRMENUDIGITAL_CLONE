/** 
 * ⚠️ DILARANG KERAS UNTUK MENGUBAH ATAU MEMODIFIKASI FILE INI TANPA IZIN SENIOR ARCHITECT.
 * FILE INI BERISI LOGIKA DUAL THEME (LIGHT/DARK) DENGAN PERSISTENSI LOCALSTORAGE.
 * KESALAHAN MODIFIKASI DAPAT MENYEBABKAN TEMA TIDAK TERSIMPAN ATAU FLASH SAAT LOAD. ⚠️
 */
/**
 * useThemeStore — Dual Theme Manager
 * Manages light/dark theme toggling with localStorage persistence.
 * Applies the `.dark` class to <html> element for CSS variable switching.
 */

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pawon_theme";

type Theme = "light" | "dark";

let globalTheme: Theme = getInitialTheme();
const listeners = new Set<(t: Theme) => void>();

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
  const [theme, setThemeState] = useState<Theme>(globalTheme);

  useEffect(() => {
    const handleChange = (newTheme: Theme) => {
      setThemeState(newTheme);
    };
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const setTheme = useCallback((t: Theme) => {
    globalTheme = t;
    applyThemeToDOM(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // silent
    }
    listeners.forEach(listener => listener(t));
  }, []);

  const toggleTheme = useCallback(() => {
    const next = globalTheme === "light" ? "dark" : "light";
    setTheme(next);
  }, [setTheme]);

  // Ensure DOM is in sync on mount
  useEffect(() => {
    applyThemeToDOM(globalTheme);
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
