import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { CategoriesTable } from "@/lib/db/schema";

const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);

const CategorySelectSchema = createSelectSchema(CategoriesTable, {
  createdAt: coercedDate,
});

export const PublicCategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const CategoryWithCountSchema = CategorySelectSchema.extend({
  postCount: z.number(),
});

export const CreateCategoryInputSchema = z.object({
  name: z.string().min(1).max(50),
});

export const UpdateCategoryInputSchema = z.object({
  id: z.number(),
  data: z.object({
    name: z.string().min(1).max(50).optional(),
  }),
});

export const DeleteCategoryInputSchema = z.object({
  id: z.number(),
});

export const GetCategoriesInputSchema = z.object({
  sortBy: z.enum(["name", "createdAt", "postCount"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  publicOnly: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>;
export type DeleteCategoryInput = z.infer<typeof DeleteCategoryInputSchema>;
export type GetCategoriesInput = z.infer<typeof GetCategoriesInputSchema>;
