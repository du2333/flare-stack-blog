import { HomePage } from "./pages/home-page";
import { HomePageSkeleton } from "./pages/home-skeleton";
import { PostsPage } from "./pages/posts-page";
import { PostsPageSkeleton } from "./pages/posts-skeleton";
import { PublicLayout } from "./layouts/public-layout";
import type { ThemeComponents } from "@/features/theme/contract/components";

/**
 * Default theme — implements the full ThemeComponents contract.
 * TypeScript will error at compile time if any required component is missing.
 */
const theme: ThemeComponents = {
  PublicLayout,
  HomePage,
  HomePageSkeleton,
  PostsPage,
  PostsPageSkeleton,
};

export default theme;
