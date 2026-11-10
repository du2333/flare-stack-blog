import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import packageJson from "./package.json";
import { routedFirstSegmentsPlugin } from "./scripts/vite-routed-segments.ts";
import { themeFixturePlugin } from "./scripts/vite-theme-fixture.ts";

const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    // Unique per build, so cached pages never outlive the assets they name.
    __BUILD_ID__: JSON.stringify(
      process.env.WORKERS_CI_BUILD_UUID || Date.now().toString(36),
    ),
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["cookie", "preferredLanguage", "baseLocale"],
      cookieName: "LOCALE",
    }),
    cloudflare({
      viteEnvironment: {
        name: "ssr",
      },
      // Read the Worker from cloudflare.config.ts instead of wrangler.jsonc.
      experimental: { newConfig: true },
    }),
    routedFirstSegmentsPlugin(),
    themeFixturePlugin(),
    tailwindcss(),
    devtools(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
