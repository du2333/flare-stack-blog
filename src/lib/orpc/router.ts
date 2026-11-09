import "@/features/config/config.cache";
import "@/features/friend-links/friend-links.cache";
import "@/features/posts/posts.cache";
import "@/features/categories/categories.cache";
import "@/features/tags/tags.cache";
import "@/features/moments/moments.cache";
import { lazy, type UnlaziedRouter } from "@orpc/server";
import pairingRouter from "@/features/agent-pairing/server/router";
import categoriesRouter from "@/features/categories/server/router";
import commentsRouter from "@/features/comments/server/router";
import configRouter from "@/features/config/server/router";
import emailRouter from "@/features/email/server/router";
import friendLinksRouter from "@/features/friend-links/server/router";
import momentsRouter from "@/features/moments/server/router";
import postsRouter from "@/features/posts/server/router";
import searchRouter from "@/features/search/server/router";
import tagsRouter from "@/features/tags/server/router";

// Admin-only features load on the first request under their prefix, so a
// public call never evaluates them. Each public feature router keeps its own
// Admin procedures lazy the same way.
export const router = {
  posts: postsRouter,
  moments: momentsRouter,
  tags: tagsRouter,
  categories: categoriesRouter,
  comments: commentsRouter,
  media: lazy(() => import("@/features/media/server/router"), {
    prefix: "/admin/media",
  }),
  mutedUsers: lazy(() => import("@/features/muted-users/server/router"), {
    prefix: "/admin/muted-users",
  }),
  config: configRouter,
  friendLinks: friendLinksRouter,
  email: emailRouter,
  search: searchRouter,
  postPopularity: lazy(
    () => import("@/features/post-popularity/server/router"),
    { prefix: "/admin/post-popularity" },
  ),
  dashboard: lazy(() => import("@/features/dashboard/server/router"), {
    prefix: "/admin/dashboard",
  }),
  cache: lazy(() => import("@/features/cache/server/router"), {
    prefix: "/admin/cache",
  }),
  version: lazy(() => import("@/features/version/server/router"), {
    prefix: "/admin/version",
  }),
  webhooks: lazy(() => import("@/features/webhook/server/router"), {
    prefix: "/admin/webhooks",
  }),
  pairing: pairingRouter,
};

/** The router with every lazy part loaded: the shape clients call. */
export type AppRouter = UnlaziedRouter<typeof router>;
