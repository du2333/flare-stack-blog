import { HomePage, HomePageSkeleton } from "./pages/home";
import { PostsPage, PostsPageSkeleton } from "./pages/posts";
import { PublicLayout } from "./layouts/public-layout";
import { FriendLinksPage, FriendLinksPageSkeleton } from "./pages/friend-links";
import type { ThemeComponents } from "@/features/theme/contract/components";

/**
 * Default theme — implements the full ThemeComponents contract.
 * TypeScript will error at compile time if any required component is missing.
 */
export default {
  HomePage,
  HomePageSkeleton,
  PostsPage,
  PostsPageSkeleton,
  PublicLayout,
  FriendLinksPage,
  FriendLinksPageSkeleton,
} satisfies ThemeComponents;
