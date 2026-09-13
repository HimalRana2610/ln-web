/**
 * Theme preference: light, dark, or follow the system.
 *
 * The choice lives in localStorage and is applied as `data-theme` on `<html>`.
 * A tiny inline script in the root layout applies it before first paint —
 * doing it in React would flash the wrong theme on every load.
 */

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "ln-theme";

export function parseTheme(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): "light" | "dark" {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

/** Runs inline in `<head>`; must stay self-contained plain ES5. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;
