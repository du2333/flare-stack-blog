---
name: flare-stack-blog
description: Operate a running Flare Stack Blog as Admin over its HTTP API.
disable-model-invocation: true
---

# Flare Stack Blog

Operate a deployed Flare Stack Blog instance as an Admin over its HTTP API. The OpenAPI specification (`/api/spec.json`) defines available endpoints, schemas, and parameters; this guide covers credentials, operational workflows, and domain rules.

## 1. Credentials

Configuration file path: `$XDG_CONFIG_HOME/flare-stack-blog/config.toml` (or `~/.config/flare-stack-blog/config.toml` if `XDG_CONFIG_HOME` is unset).

```toml
url = "https://example.com"
api_key = "fsb_..."
```

- `url`: Site origin (`scheme://host`), without a path or trailing slash.
- `api_key`: Admin API Key starting with `fsb_`.

If the file is missing or either field is empty, prompt the user for the site origin and Admin API Key, create the parent directory if needed, write the file with `0600` permissions, and proceed. If the user provides a new origin or key later, update the file.

**Security**:
- Send the key only in the `x-api-key` HTTP header.
- Never echo, print, or leak the API Key in messages to the user.

Do not proceed with API calls until both fields are resolved from the configuration file.

## 2. Contract

At the start of each session, fetch `{url}/api/spec.json` to inspect available operations:

1. **URL Construction**: Resolve target URLs using the base URL from the `servers` array combined with each route's `path`.
2. **Authentication**: Attach the `x-api-key` header to every request, even if an operation definition omits an explicit security declaration.
3. **Schema Compliance**: Adhere strictly to each operation's HTTP method, path/query parameters, request body schema, and description.
4. **Admin Preference**: When both public and admin endpoints exist for the same entity (e.g. posts, tags, categories), always use the admin endpoint.

All callable operations are defined within the runtime OpenAPI specification.

## 3. Domain Rules & Invariants

Carry out the user's intent as Admin, respecting these domain constraints:

- **Publishing Intent**: Saving or updating a **Post** modifies the draft; a post only appears on the public site after being published to create or update its **Public Content Snapshot**. Follow the user's intent directly—publish if they ask to publish, keep as a draft if they ask for a draft, and proactively ask for clarification if their intent is unclear.
- **Code Block Highlighting**: Do not invent or inject pre-rendered syntax-highlighted HTML. Syntax highlighting is generated client-side by Shiki in the web admin editor. When publishing a **Post** with new or modified code blocks via API, inform the user that these code blocks will display as plain code on the public site until re-published from the web admin editor. Unchanged code blocks retain existing highlighting from the active snapshot.
- **Content Format (`contentJson`)**: Rich text must be a TipTap / ProseMirror JSON document object, not Markdown and not a raw HTML string. Match an existing post payload from the spec / GET, or send:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Hello." }]
    }
  ]
}
```

- **Media Protection**: Media referenced by any post cannot be deleted.
- **Execution & Reporting**: Quote error response bodies verbatim when an operation fails. Conclude each requested action with an HTTP status summary or a clear error report, using the domain terms below.

## Domain Glossary

**Post.** The editable content entity. Saving updates the draft; publication updates the public site.

**Draft Post.** A **Post** without a **Public Content Snapshot**. Editable in admin workflows; never visible on the public site.

**Published Post.** A **Post** with an active **Public Content Snapshot**. Immediately visible on the public site, in public listings, and in search indexing. Publication is immediate.

**Public Content Snapshot.** The published state read by readers and public caches. Publishing replaces it; unpublishing discards it. Code-block syntax highlighting is pre-rendered into the snapshot by the browser editor, not the publish API.

**Post Revision.** A historical snapshot created automatically upon publish and immediately prior to restoring an earlier revision. Saving or autosaving a draft does not create a revision. Restoring a revision updates the draft post and leaves the live snapshot untouched until published again.

**Category.** An exclusive, non-hierarchical classification for **Posts** (a post has at most one category).

**Tag.** A reusable, non-hierarchical label grouping multiple **Posts**. Managed independently and associated with posts.

**Comment.** User-authored plain text attached to a post, visible immediately upon creation. Deletion retains a placeholder in the **Comment Thread** when replies exist.

**Muted User.** A user blocked by an Admin from creating comments. Remains a registered user with profile and friend-link capabilities. Admins cannot be muted.

**Friend Link.** An external site recommendation displayed on the public friend-links page once approved by an Admin.

**Media.** Uploaded image assets tracked by the CMS. Cannot be deleted while referenced by any post.

**System Config.** CMS-wide operational settings, including **Site Config** (branding and presentation) and notification settings (email, webhook endpoint).

**API Key.** A secret credential issued by an Admin granting programmatic access over the HTTP API. Issue and revoke keys in the admin dashboard.
