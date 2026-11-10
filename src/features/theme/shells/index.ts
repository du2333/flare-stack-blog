import type { ThemeShell } from "../theme-shell";
import { classicShell } from "./classic/classic-shell";

/** Every built-in shell; the shared shell tests run against each one. */
export const THEME_SHELLS: ReadonlyArray<ThemeShell> = [classicShell];
