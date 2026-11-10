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

If pages answer 500 or the log shows `Cannot read properties of null (reading 'useContext')` after dependencies changed, the Vite prebundle is stale: stop the server, `rm -rf node_modules/.vite`, start again.

## 2. Throwaway Admin

```bash
bun scripts/dev-admin-session.ts seed   # prints the cookie value
```

Set it as cookie `better-auth.session_token` on domain `localhost`, path `/`. `curl -b "better-auth.session_token=<value>" http://localhost:3000/api/auth/get-session` confirms it.

## 3. Drive the browser

Use `playwright-core` from a scratch directory (`bun add playwright-core` there) with the headless shell under `~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`; if none exists, `bunx playwright install chromium-headless-shell` in that directory. Launch with `--no-sandbox`, `locale: "zh-CN"`, add the cookie to the context, then:

- **Editor:** `/admin/posts` → button "新建文章" → wait for `/admin/posts/edit/<id>` → type into `.ProseMirror`. Type through `page.keyboard` so input rules and the slash menu fire.
- **Publish:** button "发布" on the edit page; the Post's slug is in the `posts` table.
- **Public page:** `/post/<slug>` needs no cookie.
- **Dark mode:** `page.emulateMedia({ colorScheme: "dark" })` while the colour scheme preference is "system".

Look at every screenshot, and record `pageerror` events.

## 4. Cleanup

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
bun scripts/dev-admin-session.ts cleanup         # lists the Posts created since seed
bun scripts/dev-admin-session.ts cleanup --yes   # deletes them, the Admin and its session
```

Nothing records who created a Post, so the list can include Posts someone else made locally while you worked. Compare it with the Posts your own run created (note each `/admin/posts/edit/<id>` you open). If anything else is listed, spare it with `cleanup --yes --keep <id,id>` and tell the user.
