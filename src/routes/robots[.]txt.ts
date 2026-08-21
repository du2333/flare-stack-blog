import { createFileRoute } from "@tanstack/react-router";
import {
  buildRobotsTxt,
  SITE_DOCUMENT_CACHE_CONTROL,
} from "@/features/site-documents/service/site-documents.service";
import { siteDocumentResponse } from "@/lib/http/site-document-response";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request, context }) =>
        siteDocumentResponse(
          buildRobotsTxt(context.env),
          "text/plain; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.robots,
          request.method,
        ),
      HEAD: async ({ request }) =>
        siteDocumentResponse(
          null,
          "text/plain; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.robots,
          request.method,
        ),
    },
  },
});
