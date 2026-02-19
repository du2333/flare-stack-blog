import { HomePage, HomePageSkeleton } from "./pages/home";
import { PostsPage, PostsPageSkeleton } from "./pages/posts";
import { PostPage, PostPageSkeleton } from "./pages/post";
import { PublicLayout } from "./layouts/public-layout";
import { AuthLayout } from "./layouts/auth-layout";
import { FriendLinksPage, FriendLinksPageSkeleton } from "./pages/friend-links";
import { SearchPage, SearchPageSkeleton } from "./pages/search";
import {
  SubmitFriendLinkPage,
  SubmitFriendLinkPageSkeleton,
} from "./pages/submit-friend-link";
import { LoginPage } from "./pages/auth/login";
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
  PostPage,
  PostPageSkeleton,
  PublicLayout,
  AuthLayout,
  FriendLinksPage,
  FriendLinksPageSkeleton,
  SearchPage,
  SearchPageSkeleton,
  SubmitFriendLinkPage,
  SubmitFriendLinkPageSkeleton,
  LoginPage,
} satisfies ThemeComponents;
