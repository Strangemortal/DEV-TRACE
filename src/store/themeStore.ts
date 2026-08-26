"use client";

import { create } from "zustand";

export type ThemeMode = "dark" | "light" | "midnight";

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",
  setTheme: (theme: ThemeMode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("devtrace_theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      if (theme === "light") {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
      }
    }
    set({ theme });
  },
  toggleTheme: () => {
    const current = get().theme;
    const next: ThemeMode = current === "dark" ? "light" : current === "light" ? "midnight" : "dark";
    get().setTheme(next);
  },
}));
