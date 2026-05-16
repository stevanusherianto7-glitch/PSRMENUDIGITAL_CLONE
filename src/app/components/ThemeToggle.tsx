/**
 * ThemeToggle — Premium Sun/Moon toggle button
 * Switches between Heritage Light and Dark Studio themes.
 */

import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../hooks/useThemeStore";

export function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg border transition-all duration-300 group
        ${isDark
          ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15 shadow-[0_0_10px_rgba(240,137,56,0.15)]"
          : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
        }
      `}
      title={isDark ? "Ganti ke Light Mode" : "Ganti ke Dark Studio"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Studio"}
    >
      <div className="relative w-4 h-4 overflow-hidden">
        {/* Sun icon — visible when dark (to switch to light) */}
        <Sun
          size={16}
          className={`absolute inset-0 transition-all duration-300 ${
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-0 opacity-0"
          }`}
        />
        {/* Moon icon — visible when light (to switch to dark) */}
        <Moon
          size={16}
          className={`absolute inset-0 transition-all duration-300 ${
            isDark
              ? "-rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          }`}
        />
      </div>
    </button>
  );
}
