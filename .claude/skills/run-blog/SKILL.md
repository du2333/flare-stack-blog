---
name: run-blog
description: Launch the local blog and drive it in headless Chromium, signed in as a throwaway Admin. Use when checking a change in the real app (the admin post editor, publishing, a public post page) or taking screenshots of it.
metadata:
  internal: true
---

# Run the blog locally

The local D1 database is often a copy of production data. Sign in only as the throwaway Admin below, and always finish with **cleanup**.

Installs, `bun run check`, tests and screenshot runs go through `bun run heavy -- <command>`: one machine-wide lock, so parallel agents queue instead of piling on. It ends with one error line after waiting 30 minutes for the lock or running a command for 25.

## 1. Dev server

Port 3000 is the main checkout's. A git worktree serves on a port of its own, `<port>` below:

```bash
bun run worktree:setup --port <port>   # worktree only: install, sample data, .dev.vars
bunx vite dev --port <port> --strictPort > <scratch>/dev.log 2>&1 &   # background
timeout 120 bash -c 'until curl -sf -o /dev/null http://localhost:<port>; do sleep 2; done'
```

Stop it with `lsof -ti:<port> -sTCP:LISTEN | xargs -r kill`. After pulling or merging, `bun run db:migrate:local` applies pending migrations to the local database and exits.

Keep one branch checked out under a running server. Switching branches under it hung the server and left a stale message runtime, and the Vite error overlay then showed up in baseline screenshots. To compare two branches, serve each from its own worktree on its own port, shoot both, then `shots compare`.

If pages answer 500 or the log shows `Cannot read properties of null (reading 'useContext')` after dependencies changed, the Vite prebundle is stale: stop the server, `rm -rf node_modules/.vite`, start again.

## 2. Throwaway Admin

```bash
bun scripts/dev-admin-session.ts seed   # prints the cookie value
```

Set it as cookie `better-auth.session_token` on domain `localhost`, path `/`; the `--session` flag of `shots` does this. `curl -b "better-auth.session_token=<value>" http://localhost:<port>/api/auth/get-session` confirms it.

Saving Site Config through the Admin API replaces the whole site section, and every field left out returns to its default. Read the current config and send all of it back with your change.

## 3. Screenshots: `bun run shots`

`bun run shots` without arguments prints the commands and flags (`shoot`, `compare`, `sheet`). Screenshots, comparisons and contact sheets come from this tool, not from scratch Playwright scripts. It installs its own dependencies on the first run; if it reports that the Chromium headless shell is missing, run the install command it prints.

- `shoot` writes `<slug>-<width>-<scheme>-<view>[-<name>].png` and prints CLS, sideways overflow and error count per page and width. It exits 1 on a page error, a failed load or an HTTP status of 400 or more. It stops after 15 s when `--base` does not answer, and a page that passes `--timeout` (45 s) is reported as failed while the run goes on.
- Every shot has animations and transitions off, fonts and all images loaded, and `time` elements and `.comment-avatar` painted as flat grey boxes (`--mask` adds selectors). A shot scrolls to the end until the height stops changing, so `/posts` loads every page of its list, and a capture repeats until two in a row match. Shooting unchanged pages twice gives identical files.
- Admin pages scroll inside an element, not the document. `--views full` finds that element and grows the viewport to its content (up to 8000 px); `--scroller <css>` names it when detection picks the wrong one.
- States without a script: `--click <css>` (repeatable, in order), then `--press <key>`, then `--hover <css>`, then the capture; `--name <suffix>` keeps the file apart from the plain shot. A selector that matches nothing fails that page. Example: an overflow menu in `/admin/comments`, `--click '<row menu button>' --name menu`.
- `--theme` previews a Theme on the public page as an Admin, so it needs `--session`. Compare it with a shot without `--theme`.
- `sheet` tiles images two to a row at 960 px, six to a sheet (`-1`, `-2`... when more) and prints every file it wrote. Read the sheets, not the single files.
- Phones (width below 600) use a touch context. Viewport heights: 900 from 1024 wide, 1100 from 600, 844 below.

Before and after a change:

```bash
bun run shots shoot --base http://localhost:<port> --out $SCRATCH/before --pages /,/posts --widths 1440,390
# change the code, wait for the dev server to reload
bun run shots shoot --base http://localhost:<port> --out $SCRATCH/after --pages /,/posts --widths 1440,390
bun run shots compare $SCRATCH/before $SCRATCH/after --out $SCRATCH/diff
bun run shots sheet $SCRATCH/diff --out $SCRATCH/diff-sheet.png
```

## 4. Drive the browser by hand

Typing and publishing still need a script: `playwright-core` from a scratch directory (`bun add playwright-core` there), launched with the same headless shell (`~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`), `--no-sandbox`, `locale: "zh-CN"`, the session cookie added to the context.

- **Editor:** `/admin/posts` → button "新建文章" → wait for `/admin/posts/edit/<id>` → type into `.ProseMirror`. Type through `page.keyboard` so input rules and the slash menu fire.
- **Publish:** button "发布" on the edit page; the Post's slug is in the `posts` table.
- **Public page:** `/post/<slug>` needs no cookie.
- **Dark mode:** `page.emulateMedia({ colorScheme: "dark" })` while the colour scheme preference is "system".

Look at every screenshot, and record `pageerror` events.

## 5. Cleanup

```bash
lsof -ti:<port> -sTCP:LISTEN | xargs -r kill
bun scripts/dev-admin-session.ts cleanup         # lists the Posts created since seed
bun scripts/dev-admin-session.ts cleanup --yes   # deletes them, the Admin and its session
```

Nothing records who created a Post, so the list can include Posts someone else made locally while you worked. Compare it with the Posts your own run created (note each `/admin/posts/edit/<id>` you open). If anything else is listed, spare it with `cleanup --yes --keep <id,id>` and tell the user.
