import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { z } from "zod";
import packageJson from "./package.json";

const buildEnvSchema = z.object({
  THEME: z.enum(["default"]).default("default"),
});
const buildEnv = buildEnvSchema.parse(process.env);

const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@theme": path.resolve(
        __dirname,
        `src/features/theme/themes/${buildEnv.THEME}`,
      ),
    },
  },
  plugins: [
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
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
