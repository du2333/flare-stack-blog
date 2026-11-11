/** Compiles the messages into `src/paraglide` (`bun run i18n:compile`), with the options the Vite plugin uses. */
import { compile } from "@inlang/paraglide-js";
import { paraglideOptions } from "./paraglide-options.ts";

await compile(paraglideOptions);
