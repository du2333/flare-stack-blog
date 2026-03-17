import "./styles/index.css";
import Toaster from "@/components/ui/toaster";
import type { SiteConfig } from "@/features/config/site-config.schema";
import type { ThemeComponents } from "@/features/theme/contract/components";
import { config } from "./config";
import { AuthLayout } from "./layouts/auth-layout";
import { PublicLayout } from "./layouts/public-layout";
import { UserLayout } from "./layouts/user-layout";
import { ForgotPasswordPage } from "./pages/auth/forgot-password";
import { LoginPage } from "./pages/auth/login";
import { RegisterPage } from "./pages/auth/register";
import { ResetPasswordPage } from "./pages/auth/reset-password";
import { VerifyEmailPage } from "./pages/auth/verify-email";
import { FriendLinksPage, FriendLinksPageSkeleton } from "./pages/friend-links";
import { HomePage, HomePageSkeleton } from "./pages/home";
import { PostPage, PostPageSkeleton } from "./pages/post";
import { PostsPage, PostsPageSkeleton } from "./pages/posts";
import { SearchPage } from "./pages/search";
import { SubmitFriendLinkPage } from "./pages/submit-friend-link";
import { ProfilePage } from "./pages/user/profile";

/**
 * Default theme — implements the full ThemeComponents contract.
 * TypeScript will error at compile time if any required component is missing.
 */
export default {
  config,
  getDocumentStyle: (_siteConfig: SiteConfig) => undefined,
  HomePage,
  HomePageSkeleton,
  PostsPage,
  PostsPageSkeleton,
  PostPage,
  PostPageSkeleton,
  PublicLayout,
  AuthLayout,
  UserLayout,
  FriendLinksPage,
  FriendLinksPageSkeleton,
  SearchPage,
  SubmitFriendLinkPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  ProfilePage,
  Toaster,
} satisfies ThemeComponents;
