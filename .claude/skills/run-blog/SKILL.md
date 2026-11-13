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

## 4. Behaviour: `bun run shots flows`

`shoot` answers "does it look the same"; `flows` answers "does it behave the same". Run it after a change to auth, the session, toasts, navigation, loading states or the Admin shell, and before reporting such a change done: a change once left four toasts unshown and blanked the Admin on a slow connection, and every suite and screenshot passed.

```bash
bun run heavy -- bun run shots flows --base http://localhost:<port> --session <cookie>
```

It runs eleven named flows (`--list` names them, `--only a,b` runs some), each in browsers of its own, and prints one line per flow: pass, FAIL or skip, and what the flow observed. Exit 1 when one fails. A flow also fails on a `pageerror`, a console error or a React hydration warning; a failed load from another origin and a third-party iframe's permissions-policy message are ignored (`isIgnoredNoise`). A full run takes about five minutes on the dev server.

- The flows write. They blank and restore the throwaway Admin's name in the local database, post and delete a comment, create and delete a tag, save the profile and put it back. Flows that need the local database (`name-gate`, `two-tabs`, the logout step of `account-and-logout`) print a skip line on any other site. A logout deletes the session row, so the runner puts it back after each flow and the cookie stays valid.
- `--compare <other-base>` runs the same flows on a second site and prints only the differences in what they observed; timings (keys ending `Ms`) within `--tolerance` percent (50, and never less than 400 ms) are equal. This is how a change shows "behaves as before": serve the baseline branch from its own worktree on its own port (section 1), then `flows --base <new> --compare <baseline> --session <cookie>`, with a cookie that is valid on both. Exit 1 on a difference. Both sites are checked first (it answers, the cookie is accepted) and the run ends in seconds with one line when not. It is two full runs one after the other. A flow that passes `--flow-timeout` (seconds; default 120, 240 for the slow-network flow) is reported failed and the run goes on; `--deadline` (minutes, 15) ends a site's run. Two servers of one worktree share a database, so the flows of both write to the same rows: that is fine one after the other, never at once.
- A remote site can be driven signed in: `--api-key-file <toml>` takes a file with `url = "…"` and `api_key = "…"` (the format of `~/.config/flare-stack-blog/config.toml`) and sends the key as `x-api-key` to that origin only; `--base` may be left out. Flows that sign in or out (`sign-in`, `two-tabs`) are skipped, since a key is a session by header; `name-gate` still needs the local database.
- A new flow is one file in `.claude/skills/run-blog/shots/flows/` and one line in `list.ts`.

## 5. The production build

The dev server serves every module on its own, so what the build does to chunks cannot be seen there. After a change to `vite.config.ts`, code splitting, preloads, or what a page imports at first load, check the build:

```bash
bun run heavy -- bun run build        # stop the dev server first: a build leaves it silent
CLOUDFLARE_VITE_FORCE_BUILD_OUTPUT=true bunx vite preview --port <port> --strictPort > <scratch>/preview.log 2>&1 &
```

The preview serves the build from `.cloudflare/output`, so it needs the build first and does not reload: build again after each change. It reads the same `.dev.vars` and the same local D1 file as the dev server, so the throwaway Admin of section 2 signs in on it (the seeded cookie answers `get-session`) and the sample Posts show. Run only one of the two on a port, and start two servers of one worktree one after the other: two starting together crashed one on a locked database.

Check the build rather than the dev server after a change to `vite.config.ts`, code splitting, preloads, or what the first load imports: dev serves every module unbundled, so a chunk that the build merges or splits (and a server-only import leaking into the client bundle) shows only here. `shots` and `flows` take the preview's `--base` like any other. `flows` was verified on the dev server only; a flow that fails on the preview and passes on dev points at the build.

## 6. Drive the browser by hand

Typing and publishing still need a script: `playwright-core` from a scratch directory (`bun add playwright-core` there), launched with the same headless shell (`~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`), `--no-sandbox`, `locale: "zh-CN"`, the session cookie added to the context.

- **Editor:** `/admin/posts` → button "新建文章" → wait for `/admin/posts/edit/<id>` → type into `.ProseMirror`. Type through `page.keyboard` so input rules and the slash menu fire.
- **Publish:** button "发布" on the edit page; the Post's slug is in the `posts` table.
- **Public page:** `/post/<slug>` needs no cookie.
- **Dark mode:** `page.emulateMedia({ colorScheme: "dark" })` while the colour scheme preference is "system".

Look at every screenshot, and record `pageerror` events.

## 7. Cleanup

```bash
lsof -ti:<port> -sTCP:LISTEN | xargs -r kill
bun scripts/dev-admin-session.ts cleanup         # lists the Posts created since seed
bun scripts/dev-admin-session.ts cleanup --yes   # deletes them, the Admin and its session
```

Nothing records who created a Post, so the list can include Posts someone else made locally while you worked. Compare it with the Posts your own run created (note each `/admin/posts/edit/<id>` you open). If anything else is listed, spare it with `cleanup --yes --keep <id,id>` and tell the user.
