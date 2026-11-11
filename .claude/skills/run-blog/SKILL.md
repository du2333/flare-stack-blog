---
name: run-blog
description: Launch the local blog and drive it in headless Chromium, signed in as a throwaway Admin. Use when checking a change in the real app (the admin post editor, publishing, a public post page) or taking screenshots of it.
metadata:
  internal: true
---

# Run the blog locally

The local D1 database is often a copy of production data. Sign in only as the throwaway Admin below, and always finish with **cleanup**.

## 1. Dev server

```bash
bun run dev > <scratch>/dev.log 2>&1 &        # run in the background
timeout 120 bash -c 'until curl -sf -o /dev/null http://localhost:3000; do sleep 2; done'
```

Stop it with `lsof -ti:3000 -sTCP:LISTEN | xargs -r kill`.

After pulling or merging, `bun run db:migrate:local` applies pending migrations to the local database and exits.

In a git worktree the local data and secrets are missing, because neither is checked in. Copy `.wrangler` and `.dev.vars` from the main checkout into the worktree (read the main checkout's, write only your copy), and serve on a port of your own: `bunx vite dev --port <port>`, with that port in place of 3000 below.

If pages answer 500 or the log shows `Cannot read properties of null (reading 'useContext')` after dependencies changed, the Vite prebundle is stale: stop the server, `rm -rf node_modules/.vite`, start again.

## 2. Throwaway Admin

```bash
bun scripts/dev-admin-session.ts seed   # prints the cookie value
```

Set it as cookie `better-auth.session_token` on domain `localhost`, path `/`. `curl -b "better-auth.session_token=<value>" http://localhost:3000/api/auth/get-session` confirms it.

Saving Site Config through the Admin API replaces the whole site section, and every field left out returns to its default. Read the current config and send all of it back with your change.

## 3. Screenshots: `shots`

Screenshots, comparisons and contact sheets come from the checked-in tool, not from scratch Playwright scripts. Once: `bun install --cwd .claude/skills/run-blog/shots`. If it reports that the Chromium headless shell is missing, run the install command it prints.

Below, `shots` stands for `bun .claude/skills/run-blog/shots/shots.ts`, run from the repo root.

- `shots shoot --base <url> --out <dir> [--pages /,/posts] [--widths 1440,820,390] [--schemes light,dark] [--views full|top|end|<px>,...] [--theme <id>] [--theme-options <json>] [--session <token>] [--locale zh|en] [--reduced-motion] [--mask <css>] [--concurrency 2]` writes `<slug>-<width>-<scheme>-<view>.png` per page, width, scheme and view, and prints CLS, sideways overflow and error count per page and width. Exit 1 on a page error, a failed load or an HTTP status of 400 or more.
- `shots compare <dirA> <dirB> [--out <dir>] [--threshold 0]` pairs files by name, prints each pair that differs (size, or differing pixels and their bounding box) and `identical / different / unpaired`. `--out` writes a diff image per differing pair. Exit 1 unless everything is identical.
- `shots sheet <dir> --out <file.png> [--match <substring>] [--columns 4] [--cell-width 480]` tiles the matching images under their file names, at most 2000x8000 px per sheet (`-1`, `-2` when more); read the sheets, not the single files.

Facts:

- Every shot has animations and transitions off, fonts and all images loaded, and `time` elements and `.comment-avatar` painted as flat grey boxes. `--mask` adds CSS selectors to those. Each shot scrolls to the end of the page until its height stops changing (so `/posts` loads every page of its list) and waits for skeletons to go; a capture is repeated until two in a row match, and `[unstable]` is printed when none does. Shooting the same pages twice gives identical files.
- `--theme` previews a Theme on the public page as an Admin, so it needs `--session` (the token from `dev-admin-session.ts seed`). Compare it with a set shot without `--theme`.
- Phones (width below 600) use a touch context. Viewport heights: 900 from 1024 wide, 1100 from 600, 844 below.

Example: before and after a change.

```bash
shots shoot --base http://localhost:3000 --out $SCRATCH/before --pages /,/posts --widths 1440,390
# change the code, wait for the dev server to reload
shots shoot --base http://localhost:3000 --out $SCRATCH/after --pages /,/posts --widths 1440,390
shots compare $SCRATCH/before $SCRATCH/after --out $SCRATCH/diff
shots sheet $SCRATCH/diff --out $SCRATCH/diff-sheet.png
```

## 4. Drive the browser by hand

The editor, publishing and other flows that need clicks and typing still need a script: `playwright-core` from a scratch directory (`bun add playwright-core` there), launched with the same headless shell (`~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`), `--no-sandbox`, `locale: "zh-CN"`, the session cookie added to the context.

- **Editor:** `/admin/posts` → button "新建文章" → wait for `/admin/posts/edit/<id>` → type into `.ProseMirror`. Type through `page.keyboard` so input rules and the slash menu fire.
- **Publish:** button "发布" on the edit page; the Post's slug is in the `posts` table.
- **Public page:** `/post/<slug>` needs no cookie.
- **Dark mode:** `page.emulateMedia({ colorScheme: "dark" })` while the colour scheme preference is "system".

Look at every screenshot, and record `pageerror` events.

## 5. Cleanup

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
bun scripts/dev-admin-session.ts cleanup         # lists the Posts created since seed
bun scripts/dev-admin-session.ts cleanup --yes   # deletes them, the Admin and its session
```

Nothing records who created a Post, so the list can include Posts someone else made locally while you worked. Compare it with the Posts your own run created (note each `/admin/posts/edit/<id>` you open). If anything else is listed, spare it with `cleanup --yes --keep <id,id>` and tell the user.
