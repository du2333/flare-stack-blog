import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_THEME_RECIPE, type ThemeRecipe } from "../theme-recipe";

const ThemeRecipeContext = createContext<ThemeRecipe>(DEFAULT_THEME_RECIPE);

/**
 * The host provides the current Theme's recipe around the public pages. The
 * page skeletons render inside it too, so a navigation never shows the other
 * form for a moment.
 */
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

/** The current Theme's recipe; today's look outside the public pages. */
export function useThemeRecipe(): ThemeRecipe {
  return useContext(ThemeRecipeContext);
}
