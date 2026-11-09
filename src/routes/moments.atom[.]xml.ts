import { createFileRoute } from "@tanstack/react-router";
import {
  buildMomentsAtomXml,
  SITE_DOCUMENT_CACHE_CONTROL,
} from "@/features/site-documents/service/site-documents.service";
import { siteDocumentResponse } from "@/lib/http/site-document-response";

export const Route = createFileRoute("/moments/atom.xml")({
  server: {
    handlers: {
      GET: async ({ request, context }) => {
        const body = await buildMomentsAtomXml(
          context.env,
          context.executionCtx,
        );
        return siteDocumentResponse(
          body,
          "application/atom+xml; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.feed,
          request.method,
        );
      },
      HEAD: async ({ request }) =>
        siteDocumentResponse(
          null,
          "application/atom+xml; charset=utf-8",
          SITE_DOCUMENT_CACHE_CONTROL.feed,
          request.method,
        ),
    },
  },
});
