/**
 * How the messages are compiled into `src/paraglide`. The Vite plugin
 * (vite.config.ts) and `bun run i18n:compile` (scripts/compile-messages.ts)
 * both read this, so the runtime is the same whichever of them wrote it: the
 * `paraglide-js compile` command cannot set the cookie name, and a runtime it
 * writes reads the locale from another cookie than the app sets.
 */
export const paraglideOptions = {
  project: "./project.inlang",
  outdir: "./src/paraglide",
  strategy: ["cookie", "preferredLanguage", "baseLocale"],
  cookieName: "LOCALE",
} satisfies {
  project: string;
  outdir: string;
  strategy: Array<"cookie" | "preferredLanguage" | "baseLocale">;
  cookieName: string;
};
