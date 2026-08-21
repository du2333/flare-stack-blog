import { createFileRoute } from "@tanstack/react-router";
import {
  buildRssXml,
  SITE_DOCUMENT_CACHE_CONTROL,
} from "@/features/site-documents/service/site-documents.service";
import { siteDocumentResponse } from "@/lib/http/site-document-response";

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const body = await buildRssXml(context.env, context.executionCtx);
        return siteDocumentResponse(
          body,
          "application/rss+xml; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.feed,
          request.method,
        );
      },
      HEAD: async ({ request }) =>
        siteDocumentResponse(
          null,
          "application/rss+xml; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.feed,
          request.method,
        ),
    },
  },
});
