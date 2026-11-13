import { z } from "zod";

/**
 * An id in a path: a positive whole number. Over HTTP it is written as plain
 * decimal digits, which `StrictOpenAPICodec` holds every path id to
 * (`isCanonicalId` in path-id-format.ts).
 */
export const PathIdSchema = z.number().int().min(1);
