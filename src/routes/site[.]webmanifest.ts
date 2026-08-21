import { createFileRoute } from "@tanstack/react-router";
import {
  buildWebManifest,
  SITE_DOCUMENT_CACHE_CONTROL,
} from "@/features/site-documents/service/site-documents.service";
import { siteDocumentResponse } from "@/lib/http/site-document-response";

export const Route = createFileRoute("/site.webmanifest")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const body = await buildWebManifest(context.env, context.executionCtx);
        return siteDocumentResponse(
          body,
          "application/manifest+json; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.manifest,
          request.method,
        );
      },
      HEAD: async ({ request }) =>
        siteDocumentResponse(
          null,
          "application/manifest+json; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.manifest,
          request.method,
        ),
    },
  },
});
