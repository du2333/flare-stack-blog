import { z } from "zod";
import type { CategoriesTable } from "@/lib/db/schema";
import { atLeastOneField } from "@/lib/orpc/changes";
import { PathIdSchema } from "@/lib/orpc/path-ids";
import { hasControlCharacter } from "@/lib/unicode-text";
import { coercedDate } from "@/lib/orpc/dates";
import type { Equal, Expect } from "@/lib/type-equal";

export const CategorySelectSchema = z.object({
  id: z.int(),
  name: z.string(),
  createdAt: coercedDate,
});

/**
 * Fails to compile when a column of `categories` is missing from the schema
 * or reads differently. `nameKey` is left out: unique keys are the
 * database's to compare by, not part of what is read.
 */
export type CategorySelectMatchesTable = Expect<
  Equal<
    z.output<typeof CategorySelectSchema>,
    Omit<typeof CategoriesTable.$inferSelect, "nameKey">
  >
>;

export const CategoryOptionSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const PublicCategorySchema = CategoryOptionSchema;

export const CategoryWithCountSchema = CategorySelectSchema.extend({
  postCount: z.number(),
});

export const AdminCategoryWithCountSchema = CategoryWithCountSchema.extend({
  postCount: z
    .number()
    .describe("How many posts currently have the category, drafts included."),
  publicPostCount: z
    .number()
    .describe(
      "How many published posts show the category on the public site, as of their last publish.",
    ),
});

export const AdminCategoryListSchema = z.object({
  items: z.array(AdminCategoryWithCountSchema),
  uncategorizedPostCount: z
    .number()
    .describe("How many posts currently have no category."),
  uncategorizedPublicPostCount: z
    .number()
    .describe(
      "How many published posts show no category on the public site, as of their last publish.",
    ),
});

export const DeleteCategoryResultSchema = z.object({ success: z.boolean() });

const CategoryNameInputSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .refine((name) => !hasControlCharacter(name, { emoji: true }), {
    message:
      "A name cannot contain control or format characters (Unicode Cc or Cf).",
  })
  .describe(
    "Name, trimmed: not empty, at most 50 characters. It cannot contain control or format characters (Unicode Cc or Cf, such as a tab, a zero width space or a bidirectional control); a zero width joiner inside an emoji is fine. No other category may have it, compared ignoring case and Unicode compatibility forms (NFKC, so fullwidth ＡＢＣ equals abc): that answers 409 CATEGORY_NAME_ALREADY_EXISTS. It is stored as written.",
  );

export const CreateCategoryInputSchema = z.strictObject({
  name: CategoryNameInputSchema,
});

export const UpdateCategoryInputSchema = z.strictObject({
  id: PathIdSchema,
  data: atLeastOneField(
    z.strictObject({
      name: CategoryNameInputSchema.optional(),
    }),
  ).describe("The fields to change; at least one, or the request answers 400."),
});

export const DeleteCategoryInputSchema = z.strictObject({
  id: PathIdSchema,
});

export const GetCategoriesInputSchema = z.strictObject({
  sortBy: z.enum(["name", "createdAt", "postCount"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  publicOnly: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>;
export type DeleteCategoryInput = z.infer<typeof DeleteCategoryInputSchema>;
export type GetCategoriesInput = z.infer<typeof GetCategoriesInputSchema>;
