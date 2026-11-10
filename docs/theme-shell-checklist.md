# Theme Shell acceptance checklist

Check a new or changed **Theme Shell** against this list before it ships. The contract it is written against is `ThemeShellProps` in `src/features/theme/theme-shell.ts`; a **Theme** is registered in `src/features/theme/themes.ts`, with its id in `theme-ids.ts`. The shared tests in `src/features/theme/shells/theme-shells.test.ts` run against the shell of every registered Theme and of the test fixture Theme (`tests/theme-fixture`), and `themes.test.ts` checks each Theme's stylesheet; together they cover the automatic part of the list.

## Contract

- The shell arranges what the host gives it: every navigation entry, every sidebar card in the given order, the page content, the footer and the floating actions. It adds no card and drops none. Which cards a page shows is decided by the host (`sidebarCardsFor`), because the cache tags of a page assume them. The one exception is also decided by the host: a shell that lists a page kind in `identityInFirstScreen` gets no identity card there.
- The shell never looks at the path. It reads `pageKind`; a focused page gets no cards and shows only its content.
- The shell wraps its tree in `FirstScreenProvider` with the height of its first screen, which back to top, the table of contents and any navbar hiding read.
- The shell's modules import no CSS. Its styles are the Theme's `stylesheet`, which the `_public` route links only while that Theme is selected; styles more than one shell needs live with the shared component instead (the menu rows in `mobile-menu.css`).
- The stylesheet sets its design variables (`--theme-*`, never `--fuwari-*`, never `!important`) and `--shell-toc-top`, `--shell-toc-width` and `--shell-floating-actions-left` on `:root[data-theme="<id>"]` only. Public pages carry that attribute on `<html>` and `/admin` never does, so dialogs, toasts and the table of contents, which render outside the shell, read the values, and the **Admin** does not.
- The shell marks its root `data-theme-shell="<id>"` and its regions `data-shell-region="body" | "sidebar" | "main" | "footer"`, with the sidebar and footer inside the body. The render-error fallback in `status-page.css` uses only these.

## By hand

- **Personalization.** Every shared personalization field in **Site Config** shows: the banner image and its focus, the avatar, the hue, the brand mark and the tagline. Change each one and see it change.
- **Navigation.** Every navigation entry, the custom links among them, external links open in a new tab, search, the Colour Scheme toggle, the language switch, the account entry (signed out, signed in, signed in as the **Admin**) and the compact menu all work, with the mouse and with the keyboard.
- **Widths.** Each public page at 1440, 820 and 390 px wide, at the top and scrolled: nothing overflows, overlaps or is cut off, and the table of contents and back to top sit in place.
- **Colour Schemes.** Each of the above in light and in dark.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, nothing slides or fades on load, on navigation or on scroll beyond what the shared components already allow.
- **No jump on load.** The first screen has its final size from the first paint: no layout shift while the banner image, fonts or the session load, and none on a reload in the middle of a page.
- **Focused pages.** Sign-in, profile, the friend-link form, not found and a route error show their content without sidebar cards; so does a page whose content fails to render.
- **Only its stylesheet, on a production build.** `bun scripts/check-theme-styles.ts` builds with the test fixture Theme (`THEME_FIXTURE=1`), serves the build on port 3100 against the local database (it needs a `.dev.vars` whose `DOMAIN` is a domain name, not localhost), selects each Theme through the Admin API, and checks that `/` links the selected Theme's stylesheet and no other's and that `/admin` links none. `--no-build` reuses the last build. It is not part of `bun run check`. While it is built, also look with JavaScript disabled (the first screen is styled) and on a throttled network (no unstyled frame).
