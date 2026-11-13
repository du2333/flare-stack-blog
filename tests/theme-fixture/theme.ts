import { z } from "zod/mini";
import { DEFAULT_THEME_RECIPE } from "@/features/theme/theme-recipe";
import type { Theme } from "@/features/theme/themes";
import { fixtureShell } from "./fixture-shell";
import { FixtureThumbnail } from "./fixture-thumbnail";
import stylesheet from "./fixture.css?url";
import { FIXTURE_THEME_ID } from "./theme-id";

/**
 * A second Theme for tests and the production style check only; it is never
 * in the registry of a real build (scripts/vite-theme-fixture.ts).
 */
export const fixtureTheme: Theme = {
  id: FIXTURE_THEME_ID,
  name: () => "Fixture",
  shell: fixtureShell,
  stylesheet,
  // Not the default look, so a test can tell which recipe reached the content.
  recipe: { ...DEFAULT_THEME_RECIPE, postCard: "row", meta: "inline" },
  options: z.object({ marker: z.catch(z.enum(["on", "off"]), "on") }),
  optionFields: [
    {
      key: "marker",
      label: () => "Marker",
      hint: () => "Shows the fixture's marker.",
      choices: [
        { value: "on", label: () => "On" },
        { value: "off", label: () => "Off" },
      ],
    },
  ],
  thumbnail: FixtureThumbnail,
};
