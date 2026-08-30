---
name: flare-stack-blog
description: Operate a running Flare Stack Blog as Admin over its HTTP API.
disable-model-invocation: true
---

# Flare Stack Blog

Operate a running CMS as Admin. The spec defines the API. This file covers process and domain rules.

## 1. Credentials

Config path: `$XDG_CONFIG_HOME/flare-stack-blog/config.toml`, or `~/.config/flare-stack-blog/config.toml` if `XDG_CONFIG_HOME` is unset.

```toml
url = "https://example.com"
api_key = "fsb_..."
```

`url` is the site origin: scheme plus host, no path, no trailing slash.

If the file is missing or a field is empty, ask the user for origin and API Key, create the directory, write this file with mode `600`, and continue. If the user gives a new origin or key later, overwrite the file. Once stored, replies to the user omit the key.

Done when both fields are read from that file.

## 2. Contract

GET `{url}/api/spec.json` on this run. Pick operations from that document. Build request URLs from its `servers` entry plus each path. Send header `x-api-key` on every call, including operations that omit `security`. Follow each operation's method, parameters, and body schema. When the spec lists a public read and an admin read for the same job, use the admin one.

Every operation you will call exists in this run's spec.

## 3. Act

Carry out the user's intent as Admin. The key has full Admin permissions.

A new **Post** is an empty **Draft Post**. PATCH saves it. Set tags on the tag operations. Upload **Media** if needed. Publish only on request.

Send the key only in the `x-api-key` header. Quote error bodies as returned. Use the terms below in replies.

Each requested action ends with an HTTP response or a reported error.

## Domain

**Post.** The editable document. PATCH updates it. PATCH does not publish.

**Public Content Snapshot.** What the public site reads. Publish replaces it. Unpublish discards it. No snapshot means **Draft Post**; a snapshot means **Published Post**. Publication is immediate.

**Post Revision.** Created on publish, and immediately before restore. Save does not create one. Restore writes into the editable Post and leaves the Public Content Snapshot as it is.

**contentJson.** A TipTap JSON document, not Markdown and not a string. Match an existing Post from GET, or send:

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

**Comment.** Plain text, public as soon as created. Delete keeps a placeholder in the **Comment Thread**.

**Muted User.** Cannot create Comments. Still a User. An Admin cannot be muted.

**Friend Link.** Only an approved one appears on the public page.

**Media.** Upload is multipart (`image` in the spec). A Media item referenced by a Post cannot be deleted.

**System Config.** Site-wide operational settings, including **Site Config** and at most one **Webhook Endpoint**.

**API Key.** Authenticates as the issuing Admin. Issue and revoke keys in the admin UI.
