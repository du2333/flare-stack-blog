export function siteDocumentResponse(
  body: BodyInit | null,
  contentType: string,
  cacheControl: string,
  method: string,
) {
  return new Response(method === "HEAD" ? null : body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    },
  });
}
