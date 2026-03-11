import type * as ParaglideMessages from "@/paraglide/messages";
import type { locales } from "@/paraglide/runtime";

/**
 * Paraglide-JS messages type.
 * Used for internationalized Zod schemas and other factory patterns.
 */
export type Messages = typeof ParaglideMessages.m;
export type Locale = (typeof locales)[number];
