import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import packageJson from "./package.json";

const tanstackSolidDevtools = [
  "@tanstack/react-devtools",
  "@tanstack/devtools",
  "@tanstack/devtools-ui",
  "solid-js",
  "solid-js/web",
] as const;

const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: [...tanstackSolidDevtools],
  },
  ssr: {
    optimizeDeps: {
      exclude: [...tanstackSolidDevtools],
    },
  },
  // workerd throws "Top-level await in module is unsettled" when the SSR
  // entry dynamically imports a chunk that statically imports that same
  // entry. Keep the worker graph in one module.
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
      },
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
    }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    devtools(),
    tanstackStart({
      importProtection: {
        enabled: false,
      },
    }),
    viteReact(),
  ],
});

export default config;
