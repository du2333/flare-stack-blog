import { ScriptOnce } from "@tanstack/react-router";
import { createClientOnlyFn, createIsomorphicFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { createContext, use, useEffect, useState } from "react";
import { z } from "zod";

const UserThemeSchema = z.enum(["light", "dark", "system"]).catch("system");
const _AppThemeSchema = z.enum(["light", "dark"]).catch("light");

// yozora 主题默认亮色（纸面原稿）；其他主题沿用 system
const DEFAULT_USER_THEME: UserTheme =
  __THEME_NAME__ === "yozora" ? "light" : "system";
const defaultUserThemeJson = JSON.stringify(DEFAULT_USER_THEME);

export type UserTheme = z.infer<typeof UserThemeSchema>;
export type AppTheme = z.infer<typeof _AppThemeSchema>;

const themeStorageKey = "ui-theme";

const getStoredUserTheme = createIsomorphicFn()
  .server((): UserTheme => DEFAULT_USER_THEME)
  .client((): UserTheme => {
    const stored = localStorage.getItem(themeStorageKey);
    return UserThemeSchema.parse(stored ?? DEFAULT_USER_THEME);
  });

const setStoredTheme = createClientOnlyFn((theme: UserTheme) => {
  const validatedTheme = UserThemeSchema.parse(theme);
  localStorage.setItem(themeStorageKey, validatedTheme);
});

const getSystemTheme = createIsomorphicFn()
  .server((): AppTheme => "light")
  .client((): AppTheme => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

const handleThemeChange = createClientOnlyFn((userTheme: UserTheme) => {
  const validatedTheme = UserThemeSchema.parse(userTheme);

  const root = document.documentElement;
  root.classList.remove("light", "dark", "system");

  if (validatedTheme === "system") {
    const systemTheme = getSystemTheme();
    root.classList.add(systemTheme, "system");
  } else {
    root.classList.add(validatedTheme);
  }
});

const setupPreferredListener = createClientOnlyFn(() => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => handleThemeChange("system");
  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
});

const themeScript = (() => {
  function themeFn() {
    try {
      const storedTheme =
        localStorage.getItem("ui-theme") || "__DEFAULT_USER_THEME__";
      const validTheme = ["light", "dark", "system"].includes(storedTheme)
        ? storedTheme
        : "__DEFAULT_USER_THEME__";

      if (validTheme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        document.documentElement.classList.add(systemTheme, "system");
      } else {
        document.documentElement.classList.add(validTheme);
      }
    } catch {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      document.documentElement.classList.add(systemTheme, "system");
    }
  }
  return `(${themeFn.toString().replaceAll('"__DEFAULT_USER_THEME__"', defaultUserThemeJson)})();`;
})();

interface ThemeContextProps {
  userTheme: UserTheme;
  appTheme: AppTheme;
  setTheme: (theme: UserTheme) => void;
}
const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [userTheme, setUserTheme] = useState<UserTheme>(getStoredUserTheme);

  useEffect(() => {
    if (userTheme !== "system") return;
    return setupPreferredListener();
  }, [userTheme]);

  const appTheme = userTheme === "system" ? getSystemTheme() : userTheme;

  const setTheme = (newUserTheme: UserTheme) => {
    const validatedTheme = UserThemeSchema.parse(newUserTheme);
    setUserTheme(validatedTheme);
    setStoredTheme(validatedTheme);
    handleThemeChange(validatedTheme);
  };

  return (
    <ThemeContext value={{ userTheme, appTheme, setTheme }}>
      <ScriptOnce>{themeScript}</ScriptOnce>

      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
