import type { ComponentProps } from "react";
import { PublicPageHeading } from "@/components/ui/page-heading";
import { useThemeRecipe } from "./theme-recipe";

/** A public page's heading, with the accent bar where the Theme Recipe keeps it. */
export function ThemedPageHeading(
  props: Omit<ComponentProps<typeof PublicPageHeading>, "accent">,
) {
  const { headingAccent } = useThemeRecipe();
  return <PublicPageHeading {...props} accent={headingAccent === "on"} />;
}
