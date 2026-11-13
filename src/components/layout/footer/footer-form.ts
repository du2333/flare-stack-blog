import type { NavOption } from "@/components/layout/layout-props";

/** What the footer gives each of its forms (index.tsx). */
export interface FooterFormProps {
  /** Every navigation entry, in the navbar's order. */
  navOptions: Array<NavOption>;
}
