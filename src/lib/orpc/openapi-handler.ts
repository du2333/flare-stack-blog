import { ORPCError } from "@orpc/client";
import { StandardOpenAPIMatcher } from "@orpc/openapi/standard";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { MAX_FILE_SIZE } from "@/features/media/media.schema";
import {
  bodyLimitOf,
  payloadTooLargeResponse,
  readBodyWithin,
} from "./body-limit";
import type { ApiContext } from "./context";
import { OPENAPI_COMPONENTS } from "./openapi-components";
import {
  DOCUMENT_PATHS,
  OpenAPIDocumentPlugin,
} from "./openapi-document-plugin";
import { isBrowserSessionOnly } from "./procedure";
import { router } from "./router";
import { StrictOpenAPIHandler } from "./strict-openapi-handler";

const schemaConverter = new ZodToJsonSchemaConverter();

// API-wide rules a client needs before its first call. Per-field details
// belong to the schemas; the Agent Skill points agents here.
const API_DESCRIPTION = `## Reading this document

The whole document is large, so read it in parts. First GET \`/api/spec/index.json\` on the site origin: this description and every operation's \`operationId\`, method, path, summary and tags. Then GET \`/api/spec.json?operationIds=<id>,<id>\` for the operations you will call, or \`?tags=<tag>\` (URL-encoded) for all of a tag's: an OpenAPI document with just those operations and every schema they reference. \`/api/spec.json\` with no query is the whole document.

Paths are relative to the server URL.

## Authentication

Admin routes require a browser session cookie or an Admin API Key in the \`x-api-key\` header. Operations do not declare security one by one: send the header on every request. A key acts as the Admin who issued it, with that Admin's content-management permissions; it cannot create or revoke API Keys. 401 means the key is missing, wrong or revoked. Public pages and public read operations need no key.

Pairing gets a key without it passing through a conversation: an Admin generates a Pairing Code in the admin UI (\`ABCD-EFGH\`, case and hyphen ignored, valid ten minutes, works once) and gives it to the agent, which exchanges it with the Agent Pairing operation, sending no key, for a new API Key and the site URL. The answer is the only time the key is shown. Every failed exchange answers 404 \`PAIRING_CODE_NOT_FOUND\`: ask the Admin for a new code.

## Client fingerprint

Send a browser \`User-Agent\` on every request, including the one for this document. A 403 whose body is Cloudflare error 1010 / \`browser_signature_banned\` is the site's WAF blocking a non-browser client, not a permission error: resend with a browser \`User-Agent\` and the same key.

## Parameters and bodies

A path parameter is given in the path only: a request body field or query parameter of the same name answers 400 naming it, and nothing is written. An id in a path is a positive whole number written in decimal digits, such as \`74\`. Only GET reads query parameters: a query parameter on any other method answers 400, so send what the operation takes in its request body. A query parameter a GET does not declare answers 400, on public and admin operations alike, and so does a request body field an operation does not declare. Path and query parameters and multipart form fields are text, read as the type the schema declares; a JSON body is read as written, so a number sent as a string, such as \`"95"\` for an id, answers 400.

## Drafts and publishing

Creating or saving a Post changes its draft only, its Category and Tags included. Creating with \`data\` makes a new draft; without \`data\`, creating returns an existing empty draft when there is one, so send the content when you create. Publishing replaces the Post's Public Content Snapshot (what the public site lists, renders and searches, together with the Category and Tags it shows the Post under) with the current draft and records a Post Revision; publishing again is safe. Unpublishing discards the snapshot: the Post becomes a Draft Post and leaves the public site. Categories and Tags themselves have no draft: creating, renaming and deleting one take effect on the public site at once, and deleting one removes it from every Published Post that shows it. A Published Post's public page is \`/post/{publicSlug}\` on the site origin; public pages are cached, so a change can take some seconds to show. Changing a Published Post's slug and publishing again leaves the old URL unreachable (there is no redirect), and Category and Tag pages are addressed by name, so renaming one changes its public URL. Pinning a Post takes effect at once and is not part of publishing.

## saveToken and Edit Conflict

Every Post carries an opaque \`saveToken\`, returned by each read of the Post and by each write to it. Saving the Post's draft (content, title, tags, category, cover, restoring a Post Revision), discarding its Unpublished Changes, publishing and unpublishing a Published Post replace it; pinning, and a save that changes nothing, keep it. Deleting a Category or Tag replaces the token of every Post that carries it, in its draft or on the public site; renaming one does not. Saving (PATCH, body \`{ data, saveToken }\`), setting the Post's Tags (body \`{ tagIds, saveToken }\`), restoring a Post Revision, discarding Unpublished Changes and publishing (body \`{ saveToken }\`) take the token you read. Unpublishing takes none, since it does not change the draft, but unpublishing a Published Post replaces the token: read again before your next write. Request bodies refuse fields they do not declare, so a misspelt \`saveToken\` answers 400 rather than writing unguarded. If the Post was saved since, by anyone and for any part of its draft, the request answers 409 with error code \`EDIT_CONFLICT\` and \`data.saveToken\` set to the current token, and nothing is written: read the Post again and decide. Without a token, saving, setting Tags and publishing write unconditionally; restoring a Post Revision and discarding Unpublished Changes guard themselves with the token of the read they start from.

## Markdown content

Post and Post Revision reads take the query parameter \`contentFormat=markdown\`, and saves the body field \`"contentFormat": "markdown"\` (default \`json\`, TipTap JSON); they then answer \`contentMarkdown\` (null when the Post has no body) in place of \`contentJson\`. Reading a Post by id with it also answers its published body as \`publicSnapshotContentMarkdown\` in place of \`publicSnapshotContentJson\`, so the draft and what is published compare in one read. Creating and saving take either \`contentJson\` or \`contentMarkdown\` in \`data\`; sending both answers 400. Markdown is CommonMark with GFM tables, strikethrough and autolinks, parsed as the editor parses pasted Markdown; reads serialize back to the same form:

- It carries headings, bold, italic, underline as \`++text++\`, strikethrough, inline code, links, nested bullet and numbered lists, block quotes, horizontal rules, hard line breaks, tables, images and videos. Task list markers, footnotes and any other HTML stay plain text, and front matter is dropped.
- Headings are levels 2 to 4: when the Markdown has an H1, every heading moves one level down, and anything deeper than level 4 becomes level 4.
- A Bilibili or YouTube address alone in a paragraph, bare or in \`<>\`, is a video block; a \`[text](address)\` link stays a link, even when its text is the address. A video's title, cover and duration are looked up on write and left empty when the lookup fails.
- A Direct Video, a video file at any https address played by the reader's browser, is a line holding exactly one tag \`<video src="…" poster="…" title="…" data-page="…"></video>\`: \`src\` is the file and required, \`poster\` its poster image, \`title\` its title and \`data-page\` the page it came from, in any order, each optional but \`src\`, with quoted, HTML-escaped values. Every address must be https without a user name or password: a \`src\` that is not, or any other attribute, leaves the line as plain text, and a \`poster\` or \`data-page\` that is not is dropped. Nothing is looked up on write; the duration is kept from the body being replaced when the same \`src\` was there. In \`contentJson\` a Direct Video is a \`video\` node with \`provider: "direct"\` and \`src\`, \`cover\` and \`pageUrl\`, and an address there that is not https answers 400 \`CONTENT_LINK_INVALID\` naming it.
- Tables keep column alignment, and a table cell holds a single line: merged cells are written as separate cells and read back unmerged, a cell's paragraphs and line breaks are joined with \`<br>\`, which reads back as text, and a list in a cell reads back as text. Column widths are not carried, so a Markdown write resets them to equal.
- Inline math is \`$…$\`; block math has \`$$\` alone on the lines before and after it.
- Fenced code blocks carry their language; a \`mermaid\` block renders as a diagram.
- An image must be an http(s) address or the \`/images/…\` path of existing Media; an address on the blog's own origin ending in \`/images/…\` counts as that path. Any other source, such as a local file path, answers 400 naming the image, and so does a Media path no Media has, unless the draft already shows it: upload the file as Media first and use its path.
- A link whose address has a scheme other than http, https, ftp, ftps, mailto, tel, callto, sms, cid or xmpp, such as \`javascript:\` or \`data:\`, answers 400 \`CONTENT_LINK_INVALID\` naming it, in Markdown and in \`contentJson\` alike. Site paths, #fragments and relative addresses are kept.

## Media

Upload a file as multipart form data to the Media upload operation; its answer carries the \`/images/{key}\` path to use in Markdown and as a Post's cover. Media that a Post, a Public Content Snapshot or a Post Revision uses cannot be deleted. Replacing a Media file keeps its key and path, so it takes effect at once, without publishing, on every Post that shows it, Published Posts included; the Media's \`fileName\` becomes the uploaded file's name. Deleting unused Media, rebuilding the search index and purging caches act on the whole site.

## Errors

Every error answers JSON with \`code\`, \`status\` and \`message\`; the errors an operation declares carry \`defined: true\` and may carry \`data\`. A request that fails validation answers 400 \`BAD_REQUEST\` with \`data.issues\`, each naming the path of a field and what is wrong with it: correct those fields and resend. 404 with a declared code (such as \`POST_NOT_FOUND\`) means what you named does not exist; 404 \`ROUTE_NOT_FOUND\` and 405 \`METHOD_NOT_ALLOWED\` mean the call itself is wrong, so check the path and method against this document. 413 \`PAYLOAD_TOO_LARGE\` means the request body is too large; 413 \`POST_CONTENT_TOO_LARGE\` means a Post's body, or the snapshot publishing would store, is too large to keep, and nothing was written. After a timeout or a 5xx, read before retrying: the write may have landed.`;

export const openAPIHandler = new StrictOpenAPIHandler(router, {
  schemaConverter,
  adapterInterceptors: [
    async (options) => {
      const limit = bodyLimitOf(options.request, MAX_FILE_SIZE);
      const request = await readBodyWithin(options.request, limit);
      if (!request) {
        return { matched: true, response: payloadTooLargeResponse(limit) };
      }
      return options.next({ ...options, request });
    },
  ],
  interceptors: [
    onError((error) => {
      console.error(
        JSON.stringify({
          message: "API error",
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : String(error),
          timestamp: new Date().toISOString(),
        }),
      );
    }),
  ],
  plugins: [
    new OpenAPIDocumentPlugin<ApiContext>({
      schemaConverters: [schemaConverter],
      docsTitle: "Flare Stack Blog API",
      generateOptions: {
        // The admin UI calls these through the same routes; an agent cannot.
        filter: ({ contract }) => !isBrowserSessionOnly(contract),
        commonSchemas: OPENAPI_COMPONENTS,
        info: {
          title: "Flare Stack Blog API",
          version: __APP_VERSION__,
          description: API_DESCRIPTION,
        },
        components: {
          securitySchemes: {
            apiKey: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
            },
          },
        },
      },
    }),
  ],
});

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// A second route table, built on the first request nobody matches: it lets
// that request tell an unknown path from a known one with another method.
let routeTable: StandardOpenAPIMatcher | undefined;

async function methodsAllowedAt(pathname: `/${string}`) {
  if (!routeTable) {
    routeTable = new StandardOpenAPIMatcher();
    routeTable.init(router);
  }
  const table = routeTable;
  const matches = await Promise.all(
    METHODS.map((method) => table.match(method, pathname)),
  );
  return METHODS.filter((_, index) => matches[index] !== undefined);
}

function errorResponse(
  error: ORPCError<string, unknown>,
  headers?: HeadersInit,
) {
  return Response.json(error.toJSON(), { status: error.status, headers });
}

/**
 * Answers an API request. A request no operation takes still answers JSON, so
 * a client can tell what it called wrong: 405 with `Allow` for a known path
 * with another method, 404 ROUTE_NOT_FOUND for a path nothing serves.
 */
export async function handleApiRequest(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  const { response } = await openAPIHandler.handle(request, {
    prefix: "/api",
    context,
  });
  if (response) return response;

  const url = new URL(request.url);
  const pathname =
    `/${url.pathname.replace(/^\/api/, "").replace(/^\/|\/$/g, "")}` as const;
  const allowed = (Object.values(DOCUMENT_PATHS) as Array<string>).includes(
    pathname,
  )
    ? ["GET"]
    : await methodsAllowedAt(pathname);
  if (allowed.length > 0) {
    return errorResponse(
      new ORPCError("METHOD_NOT_ALLOWED", {
        status: 405,
        message: `${request.method} is not allowed on ${url.pathname}. Use ${allowed.join(", ")}.`,
        data: { allow: allowed },
      }),
      { Allow: allowed.join(", ") },
    );
  }
  return errorResponse(
    new ORPCError("ROUTE_NOT_FOUND", {
      status: 404,
      message: `No API route matches ${request.method} ${url.pathname}. The routes are listed in /api${DOCUMENT_PATHS.index}.`,
    }),
  );
}
