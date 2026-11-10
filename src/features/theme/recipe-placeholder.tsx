// PLACEHOLDER until ticket #268 lands its Theme Recipe type, default recipe,
// provider and hook. Then point the imports of this file at #268's module and
// delete it: `ThemeRecipe` and `ThemeRecipeProvider` are the only names the
// registry and the host use.
import { createContext, useContext, type ReactNode } from "react";

export type ThemeRecipe = Readonly<Record<string, string>>;

const ThemeRecipeContext = createContext<ThemeRecipe>({});

export function ThemeRecipeProvider({
  recipe,
  children,
}: {
  recipe: ThemeRecipe;
  children: ReactNode;
}) {
  return (
    <ThemeRecipeContext.Provider value={recipe}>
      {children}
    </ThemeRecipeContext.Provider>
  );
}

export function useThemeRecipe(): ThemeRecipe {
  return useContext(ThemeRecipeContext);
}
