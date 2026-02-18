import { HomePage } from "./pages/home-page";
import { HomePageSkeleton } from "./pages/home-skeleton";
import type { ThemeComponents } from "@/features/theme/contract/components";

/**
 * Default theme — implements the full ThemeComponents contract.
 * TypeScript will error at compile time if any required component is missing.
 */
const theme: ThemeComponents = {
  HomePage,
  HomePageSkeleton,
};

export default theme;
