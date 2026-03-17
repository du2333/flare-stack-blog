import { Hono } from "hono";
import {
  buildAtomXml,
  buildFeedJson,
  buildRobotsTxt,
  buildRssXml,
  buildSitemapXml,
  buildWebManifest,
  SITE_DOCUMENT_CACHE_CONTROL,
} from "../../service/site-documents.service";

const app = new Hono<{ Bindings: Env }>();

type AsyncDocumentBuilder = (
  env: Env,
  executionCtx: ExecutionContext,
) => Promise<string>;

type SyncDocumentBuilder = (env: Env) => string;

interface AsyncDocumentRouteDefinition {
  path: string;
  contentType: string;
  cacheControl: string;
  build: AsyncDocumentBuilder;
}

interface SyncDocumentRouteDefinition {
  path: string;
  contentType: string;
  cacheControl: string;
  build: SyncDocumentBuilder;
}

function createCachedResponse(
  body: BodyInit | null,
  contentType: string,
  cacheControl: string,
) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    },
  });
}

function createHeadResponse(contentType: string, cacheControl: string) {
  return createCachedResponse(null, contentType, cacheControl);
}

function registerAsyncDocumentRoute(definition: AsyncDocumentRouteDefinition) {
  app.get(definition.path, async (c) => {
    const body = await definition.build(c.env, c.executionCtx);
    return createCachedResponse(
      body,
      definition.contentType,
      definition.cacheControl,
    );
  });

  app.on("HEAD", definition.path, () =>
    createHeadResponse(definition.contentType, definition.cacheControl),
  );
}

function registerSyncDocumentRoute(definition: SyncDocumentRouteDefinition) {
  app.get(definition.path, (c) =>
    createCachedResponse(
      definition.build(c.env),
      definition.contentType,
      definition.cacheControl,
    ),
  );

  app.on("HEAD", definition.path, () =>
    createHeadResponse(definition.contentType, definition.cacheControl),
  );
}

const asyncDocumentRoutes = [
  {
    path: "/feed.json",
    contentType: "application/feed+json; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.feed,
    build: buildFeedJson,
  },
  {
    path: "/rss.xml",
    contentType: "application/rss+xml; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.feed,
    build: buildRssXml,
  },
  {
    path: "/atom.xml",
    contentType: "application/atom+xml; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.feed,
    build: buildAtomXml,
  },
  {
    path: "/site.webmanifest",
    contentType: "application/manifest+json; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.manifest,
    build: buildWebManifest,
  },
] satisfies AsyncDocumentRouteDefinition[];

const derivedAsyncDocumentRoutes = [
  {
    path: "/sitemap.xml",
    contentType: "application/xml; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.sitemap,
    build: async (env: Env, _executionCtx: ExecutionContext) =>
      buildSitemapXml(env),
  },
] satisfies AsyncDocumentRouteDefinition[];

const syncDocumentRoutes = [
  {
    path: "/robots.txt",
    contentType: "text/plain; charset=utf-8",
    cacheControl: SITE_DOCUMENT_CACHE_CONTROL.robots,
    build: buildRobotsTxt,
  },
] satisfies SyncDocumentRouteDefinition[];

asyncDocumentRoutes.forEach(registerAsyncDocumentRoute);
derivedAsyncDocumentRoutes.forEach(registerAsyncDocumentRoute);
syncDocumentRoutes.forEach(registerSyncDocumentRoute);

export default app;
