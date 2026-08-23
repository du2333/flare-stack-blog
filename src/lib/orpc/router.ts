import "@/features/config/config.cache";
import "@/features/friend-links/friend-links.cache";
import "@/features/pageview/pageview.cache";
import "@/features/posts/posts.cache";
import "@/features/tags/tags.cache";
import cacheRouter from "@/features/cache/server/router";
import commentsRouter from "@/features/comments/server/router";
import configRouter from "@/features/config/server/router";
import dashboardRouter from "@/features/dashboard/server/router";
import emailRouter from "@/features/email/server/router";
import friendLinksRouter from "@/features/friend-links/server/router";
import mediaRouter from "@/features/media/server/router";
import pageviewRouter from "@/features/pageview/server/router";
import postsRouter from "@/features/posts/server/router";
import searchRouter from "@/features/search/server/router";
import tagsRouter from "@/features/tags/server/router";
import versionRouter from "@/features/version/server/router";
import webhookRouter from "@/features/webhook/server/router";

export const router = {
  posts: postsRouter,
  tags: tagsRouter,
  comments: commentsRouter,
  media: mediaRouter,
  config: configRouter,
  friendLinks: friendLinksRouter,
  email: emailRouter,
  search: searchRouter,
  pageviews: pageviewRouter,
  dashboard: dashboardRouter,
  cache: cacheRouter,
  version: versionRouter,
  webhooks: webhookRouter,
};

export type AppRouter = typeof router;
