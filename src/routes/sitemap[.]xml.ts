import { createFileRoute } from "@tanstack/react-router";
import {
  buildSitemapXml,
  SITE_DOCUMENT_CACHE_CONTROL,
} from "@/features/site-documents/service/site-documents.service";
import { siteDocumentResponse } from "@/lib/http/site-document-response";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const body = await buildSitemapXml(context.env);
        return siteDocumentResponse(
          body,
          "application/xml; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.sitemap,
          request.method,
        );
      },
      HEAD: async ({ request }) =>
        siteDocumentResponse(
          null,
          "application/xml; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.sitemap,
          request.method,
        ),
    },
  },
});
