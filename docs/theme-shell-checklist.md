# Theme Shell acceptance checklist

Check a new or changed **Theme Shell** against this list before it ships. The contract it is written against is `ThemeShellProps` in `src/features/theme/theme-shell.ts`; the shared tests in `src/features/theme/shells/theme-shells.test.ts` run against every shell in `THEME_SHELLS` and cover the automatic part of the list.

## Contract

- The shell arranges what the host gives it: every navigation entry, every sidebar card in the given order, the page content, the footer and the floating actions. It adds no card and drops none. Which cards a page shows is decided by the host (`sidebarCardsFor`), because the cache tags of a page assume them. The one exception is also decided by the host: a shell that lists a page kind in `identityInFirstScreen` gets no identity card there.
- The shell never looks at the path. It reads `pageKind`; a focused page gets no cards and shows only its content.
- The shell wraps its tree in `FirstScreenProvider` with the height of its first screen, which back to top, the table of contents and any navbar hiding read.
- The shell's stylesheet sets `--shell-toc-top`, `--shell-toc-width` and `--shell-floating-actions-left` on `:root`, so the side table of contents and the floating actions sit in its gutter.
- The shell marks its root `data-theme-shell="<id>"` and its regions `data-shell-region="body" | "sidebar" | "main" | "footer"`, with the sidebar and footer inside the body. The render-error fallback in `status-page.css` uses only these.

## By hand

- **Personalization.** Every shared personalization field in **Site Config** shows: the banner image and its focus, the avatar, the hue, the brand mark and the tagline. Change each one and see it change.
- **Navigation.** Every navigation entry, the custom links among them, external links open in a new tab, search, the Colour Scheme toggle, the language switch, the account entry (signed out, signed in, signed in as the **Admin**) and the compact menu all work, with the mouse and with the keyboard.
- **Widths.** Each public page at 1440, 820 and 390 px wide, at the top and scrolled: nothing overflows, overlaps or is cut off, and the table of contents and back to top sit in place.
- **Colour Schemes.** Each of the above in light and in dark.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, nothing slides or fades on load, on navigation or on scroll beyond what the shared components already allow.
- **No jump on load.** The first screen has its final size from the first paint: no layout shift while the banner image, fonts or the session load, and none on a reload in the middle of a page.
- **Focused pages.** Sign-in, profile, the friend-link form, not found and a route error show their content without sidebar cards; so does a page whose content fails to render.
