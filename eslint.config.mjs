import { defineConfig } from "eslint/config";
import { tanstackConfig } from "@tanstack/eslint-config";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["worker-configuration.d.ts", ".wrangler/**", "src/paraglide/**"],
  },
  {
    extends: tanstackConfig,
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
