---
name: flare-stack-blog
description: Manage a Flare Stack Blog over its HTTP API with an Admin API Key. Use to connect a blog and its key, and for any change to or question about its posts, moments, categories, tags, media and publishing.
---

# Manage a Flare Stack Blog

This Skill serves any Flare Stack Blog. Each blog describes itself at run time: its OpenAPI document gives every path, parameter, field, error and the API-wide rules. This Skill holds only what the document cannot: how to connect, the order of work, and the rules. Take every shape from the live document, never from memory or from another blog.

The human's instruction authorizes the work. Ask only for intent that is missing or ambiguous (which Post, what change, draft or published); decide wording yourself when it is delegated. When the target already matches the request, write nothing.

## 1. Connect

The blog and its key live in `$XDG_CONFIG_HOME/flare-stack-blog/config.toml` (`~/.config/flare-stack-blog/config.toml` when `XDG_CONFIG_HOME` is unset):

```toml
url = "https://blog.example.com"
api_key = "fsb_..."
```

`url` is the site origin, `https://<host>` (or `http://` for a local instance the human names) with no path or trailing slash; `api_key` is an Admin API Key. Connect when the file is missing, either value is empty, a stored key answers 401, or the human gives a new blog, key or Pairing Code. Take the branch that matches what the human gave:

- **A Pairing Code** (with the site address): fetch the document's index (see [Discover](#2-discover)) and read the operation it lists for exchanging a Pairing Code for an API Key. That operation needs no key: send it with only the browser User-Agent. Redeem the code, naming the agent `<agent product> (<machine hostname>)`, such as `Claude Code (studio-mac)`. The response carries the key, so treat it as the key itself: save it straight to a file with mode `0600` in the working directory, never print it, and write the origin you redeemed the code at and the key it returns into the config with a command that reads that file, so the key never appears in the conversation or a command's arguments. When the response names a different site address, ask the human which origin to use before writing. A code works once and lives only minutes: a 404 means ask the human for a fresh code.
- **An API Key** (with the origin): an Admin issues one in the blog's admin settings; it is shown once. Write it and the origin into the config.
- **Neither**: ask the human to open the blog's admin settings, the Agent Skill tab, generate a Pairing Code and give it to you with the site address the tab shows; then take the first branch.

Write the config with mode `0600` in a directory with mode `0700` (create it so, or tighten it if it exists), then fetch the index and check the key with one read-only admin operation it lists. Done when one origin and a key that answers 200 are in hand. When a Pairing replaced a key this agent held before, tell the human that the old key can be deleted on the Agent Skill tab.

Keep every file a task makes (headers, request and response bodies, Markdown drafts) in one working directory: the one the human names, or else one of its own, created private at the task's start: `mktemp -d` on macOS and Linux; on Windows, a new folder under `$env:TEMP` with inherited permissions removed and only the current user allowed. When the task ends, succeeded or not, delete the files you made there (and the directory, if you created it). The config file stays where it is.

The key goes only in the `x-api-key` header, and only to the configured origin. Keep it out of command arguments, URLs, logs, saved responses (the Pairing response aside, kept as above) and replies: with curl, write the headers (the key and a browser User-Agent) to a file with mode `0600` in the working directory and pass `-H @<file>`; send bodies with `--data-binary @<file>`. Stop on a redirect to another origin rather than follow it with the key. Fetch public pages without the key. In Windows PowerShell, `curl` may be an alias of `Invoke-WebRequest`: call `curl.exe`.

## 2. Discover

At the start of every task, GET `<origin>/api/spec/index.json` with the same headers: it lists every operation and carries the document's `info.description`. Read that description first: it says how to fetch parts of the document, and states authentication, the browser User-Agent requirement, drafts and publishing, the save guard and Edit Conflict, and Markdown content. Then fetch, as it says, only the operations you are about to call, and more as the task needs them; fetch the whole `<origin>/api/spec.json` only when the task needs most of it. Done when you hold the index and, for what you are about to touch, have read its operations and schemas, following every `$ref`. Operation paths are relative to the document's server URL; public pages, such as a Post's public page, are on the site origin itself.

When an entity has both public and admin operations, use the admin ones. Stay within posts, moments, categories, tags, media and publishing: leave site settings, notifications and their test sends (which deliver real messages), comments, friend links and API keys alone unless the human asks for exactly that.

## 3. Change the draft

Every save changes the draft, a Post's Category and Tags included, and readers see it only once it is published. Categories, Tags and Media themselves have no draft: creating, renaming or deleting a Category or Tag, and replacing a Media file, take effect at once on every Published Post that shows it (the document's description says so). Tell the human before renaming or deleting a Category or Tag, or replacing Media, that Published Posts use.

- **Resolve the target** by id, or by a search on the title or slug; several matches means ask which. Given a public URL, read the post by its public slug to learn its id.
- **Read right before each write.** The Admin edits the same Posts in the browser, which autosaves as they type. Read the Post immediately before each save, build the save on what you just read, and send that read's `saveToken`. A Post saved in between is then kept and the save answers 409 instead of overwriting it. See [Conflicts](#conflicts).
- **Send only what changes.** Leave out every field you are not changing, and spell every field exactly as the document does: a misspelt `saveToken` would leave the save unguarded.
- **Content** is Markdown, read and written as the document's description states. Keep the images, videos and links you were not asked to change, and read the Post back after writing. A local image goes in as Media first; use the path the upload answers.
- **Creating** always sends the content, so it makes a new draft rather than returning an existing empty one. It has nothing to read before it. If a create times out or its answer is lost, search for the title before creating again, or you may make a duplicate.
- **Slugs and names are addresses.** Changing a Published Post's slug and publishing again leaves the old URL unreachable, and renaming a Category or Tag changes its public URL: tell the human before doing either.
- A 400 names each problem: correct those values and resend; make no other change to get past it.

Make one human-intended change at a time, carried through to its end state, unless the human asked for several together.

## 4. Publish and verify

Follow the human's intent: publish when they ask to publish, keep the draft when they ask for a draft, and ask when it is unclear. Publishing takes the whole draft, so a change someone else left unpublished goes live with yours: when the draft holds changes you did not make, name them to the human first. To see them, read the Post as Markdown: the read carries the draft and the published body side by side, whatever Post Revisions are left, so compare the two. Publish with the `saveToken` of the read the human approved, so what goes live is that draft.

After publishing, fetch the Post's public page and confirm the change shows. Public pages are cached: retry a few times over about 20 seconds before calling it failed.

To throw away a Published Post's unpublished changes, discard them with the document's discard operation rather than editing them back by hand: it returns the draft to what is published and keeps the discarded draft as a Post Revision.

To take a Post off the public site for now, unpublish it; the draft stays. Delete only when the human explicitly asks to delete: deleting a Post is permanent and takes its Post Revisions with it. Delete Post Revisions only when asked, too.

Pinning a Post takes effect at once, without publishing. Never run site-wide operations (deleting unused Media, rebuilding the search index, purging caches) unless the human asks for exactly that.

## Moments

A Moment is a short public entry with no title, draft or history: every post or save is public at once, and there is no unpublish, only delete. It holds text of at most 1000 characters (web addresses become links) and either up to 50 images or one video, never both and never nothing. The document gives the exact fields and how a video is stated.

- **Images are Media first.** Upload each file as Media, then write the paths the uploads answer, in display order. A path no Media has answers 400.
- **Confirm before posting.** The text and images go live as sent: confirm them with the human unless they gave them or delegated the wording. Delete only when asked.
- **Read right before each save, send only what changes, and send the `saveToken` you read.** Swapping images for a video, or back, takes both fields in one save, as the document describes. A 409 Edit Conflict follows [Conflicts](#conflicts) as a Post's does.
- After a write, fetch the Moment's public page on the site origin and confirm it shows, retrying as for a Post.

## Conflicts

Every write to a Post's draft (saving it, setting its Tags, restoring a Post Revision, discarding its changes) and every publish states the `saveToken` of your latest read or write of it; unpublishing changes no draft and takes none, but it does replace the token, so read again before your next write. A 409 Edit Conflict means the Post was saved after you read it, and nothing was written. Never retry without the `saveToken`, and never resend the same one.

1. Read the Post again.
2. Compare it with the read your write was built on. When only your own earlier writes differ, re-apply your change to the new read and send its `saveToken`.
3. When someone else changed what you are changing, or you cannot tell, tell the human what changed under you and ask before writing. The Admin may still be typing: after a second 409 in a row, stop and ask.

## Errors

Quote the error body when an operation fails. 401: run the connect flow again. 403 with Cloudflare error 1010: the request lacked a browser User-Agent. After a timeout or a 5xx, re-read before retrying: the write may have landed.

## Report

Report the target, each change as before → after, where it stands (draft, published, unpublished), the HTTP status of each write, and the public URLs you checked.
