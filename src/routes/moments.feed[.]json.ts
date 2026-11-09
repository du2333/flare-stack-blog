import { createFileRoute } from "@tanstack/react-router";
import {
  buildMomentsFeedJson,
  SITE_DOCUMENT_CACHE_CONTROL,
} from "@/features/site-documents/service/site-documents.service";
import { siteDocumentResponse } from "@/lib/http/site-document-response";

export const Route = createFileRoute("/moments/feed.json")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const body = await buildMomentsFeedJson(
          context.env,
          context.executionCtx,
        );
        return siteDocumentResponse(
          body,
          "application/feed+json; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.feed,
          request.method,
        );
      },
      HEAD: async ({ request }) =>
        siteDocumentResponse(
          null,
          "application/feed+json; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.feed,
          request.method,
        ),
    },
  },
});
