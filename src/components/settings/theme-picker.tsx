"use client";

import { useEffect, useSyncExternalStore } from "react";

import { parseTheme, resolveTheme, THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const CHOICES: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readPreference(): ThemePreference {
  try {
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function apply(preference: ThemePreference) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = resolveTheme(preference, systemDark);
}

/** Replaces the old ThemeContext; only this page changes the theme. */
export function ThemePicker() {
  // The server cannot know the stored choice, so it renders "system".
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);

  // While following the system, follow it live too.
  useEffect(() => {
    if (preference !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  function choose(value: ThemePreference) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Private mode: the theme still applies for this page view.
    }
    apply(value);
    listeners.forEach((listener) => listener());
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="flex gap-2">
      {CHOICES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          onClick={() => choose(value)}
          className={cn(
            "h-9 rounded-lg px-3 text-sm font-medium transition-colors",
            preference === value
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
