import { ScriptOnce } from "@tanstack/react-router";
import { createClientOnlyFn, createIsomorphicFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { createContext, use, useEffect, useState } from "react";
import { z } from "zod";

const ColourSchemePreferenceSchema = z
  .enum(["light", "dark", "system"])
  .catch("system");
const _ColourSchemeSchema = z.enum(["light", "dark"]).catch("light");

export type ColourSchemePreference = z.infer<
  typeof ColourSchemePreferenceSchema
>;
/** The colour scheme actually shown: a "system" preference resolved to light or dark. */
export type ColourScheme = z.infer<typeof _ColourSchemeSchema>;

/**
 * Kept as "ui-theme" from before the rename so visitors keep their saved
 * choice. The pre-paint script below is built from this same constant.
 */
export const colourSchemeStorageKey = "ui-theme";

const getStoredPreference = createIsomorphicFn()
  .server((): ColourSchemePreference => "system")
  .client((): ColourSchemePreference => {
    const stored = localStorage.getItem(colourSchemeStorageKey);
    return ColourSchemePreferenceSchema.parse(stored);
  });

const setStoredPreference = createClientOnlyFn(
  (preference: ColourSchemePreference) => {
    const validated = ColourSchemePreferenceSchema.parse(preference);
    localStorage.setItem(colourSchemeStorageKey, validated);
  },
);

const getSystemColourScheme = createIsomorphicFn()
  .server((): ColourScheme => "light")
  .client((): ColourScheme => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

const applyColourScheme = createClientOnlyFn(
  (preference: ColourSchemePreference, systemScheme: ColourScheme) => {
    const validated = ColourSchemePreferenceSchema.parse(preference);

    const root = document.documentElement;
    root.classList.remove("light", "dark", "system");

    if (validated === "system") {
      root.classList.add(systemScheme, "system");
    } else {
      root.classList.add(validated);
    }
  },
);

const setupPreferredListener = createClientOnlyFn(
  (onChange: (systemScheme: ColourScheme) => void) => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => onChange(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  },
);

/** Runs before first paint so the page never flashes the wrong scheme. */
export const colourSchemeScript = (() => {
  function colourSchemeFn(storageKey: string) {
    try {
      const stored = localStorage.getItem(storageKey) || "system";
      const valid = ["light", "dark", "system"].includes(stored)
        ? stored
        : "system";

      if (valid === "system") {
        const systemScheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        document.documentElement.classList.add(systemScheme, "system");
      } else {
        document.documentElement.classList.add(valid);
      }
    } catch {
      const systemScheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      document.documentElement.classList.add(systemScheme, "system");
    }
  }
  return `(${colourSchemeFn.toString()})(${JSON.stringify(colourSchemeStorageKey)});`;
})();

interface ColourSchemeContextProps {
  colourSchemePreference: ColourSchemePreference;
  colourScheme: ColourScheme;
  setColourScheme: (preference: ColourSchemePreference) => void;
}
const ColourSchemeContext = createContext<ColourSchemeContextProps | undefined>(
  undefined,
);

interface ColourSchemeProviderProps {
  children: ReactNode;
}
export function ColourSchemeProvider({ children }: ColourSchemeProviderProps) {
  const [colourSchemePreference, setColourSchemePreference] =
    useState<ColourSchemePreference>(getStoredPreference);
  const [systemScheme, setSystemScheme] = useState<ColourScheme>(
    getSystemColourScheme,
  );

  useEffect(() => {
    if (colourSchemePreference !== "system") return;
    return setupPreferredListener((nextSystemScheme) => {
      setSystemScheme(nextSystemScheme);
      applyColourScheme("system", nextSystemScheme);
    });
  }, [colourSchemePreference]);

  const colourScheme =
    colourSchemePreference === "system" ? systemScheme : colourSchemePreference;

  const setColourScheme = (newPreference: ColourSchemePreference) => {
    const validated = ColourSchemePreferenceSchema.parse(newPreference);
    // The OS scheme is only watched while the preference is "system"; re-read it.
    const currentSystemScheme = getSystemColourScheme();
    setColourSchemePreference(validated);
    setSystemScheme(currentSystemScheme);
    setStoredPreference(validated);
    applyColourScheme(validated, currentSystemScheme);
  };

  return (
    <ColourSchemeContext
      value={{ colourSchemePreference, colourScheme, setColourScheme }}
    >
      <ScriptOnce>{colourSchemeScript}</ScriptOnce>

      {children}
    </ColourSchemeContext>
  );
}

export function useColourScheme() {
  const context = use(ColourSchemeContext);
  if (!context) {
    throw new Error(
      "useColourScheme must be used within a ColourSchemeProvider",
    );
  }
  return context;
}
