import type { ComponentType } from "react";
import { useThemeRecipe } from "@/features/theme/components/theme-recipe";
import type { ThemeRecipe } from "@/features/theme/theme-recipe";
import { FooterBand } from "./band";
import { FooterCaption } from "./caption";
import { FooterColophon } from "./colophon";
import type { FooterFormProps } from "./footer-form";
import { FooterSignature } from "./signature";

/**
 * The forms of the footer, by the value of the Theme Recipe's `footer` item
 * that picks each. A form is a module of its own in this directory, with
 * its styles beside it and its tests in `<form>.test.ts`. Adding one is that
 * module, a line here and its value in `ThemeRecipe["footer"]`.
 */
const FOOTER_FORMS = {
  caption: FooterCaption,
  band: FooterBand,
  signature: FooterSignature,
  colophon: FooterColophon,
} satisfies Record<ThemeRecipe["footer"], ComponentType<FooterFormProps>>;

/** The footer of the public pages, in the form the Theme Recipe picks. */
export function Footer({ navOptions }: FooterFormProps) {
  const Form = FOOTER_FORMS[useThemeRecipe().footer];
  return <Form navOptions={navOptions} />;
}
