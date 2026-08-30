import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { CategoriesTable } from "@/lib/db/schema";

const coercedDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);

export const CategorySelectSchema = createSelectSchema(CategoriesTable, {
  createdAt: coercedDate,
});
export const CategoryInsertSchema = createInsertSchema(CategoriesTable);
export const CategoryUpdateSchema = createUpdateSchema(CategoriesTable);

export const PublicCategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const CategoryWithCountSchema = CategorySelectSchema.extend({
  postCount: z.number(),
});

export const AdminCategoryListSchema = z.object({
  items: z.array(CategoryWithCountSchema),
  uncategorizedPostCount: z.number().int().nonnegative(),
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

export type Category = z.infer<typeof CategorySelectSchema>;
export type PublicCategory = z.infer<typeof PublicCategorySchema>;
export type CategoryWithCount = z.infer<typeof CategoryWithCountSchema>;
export type AdminCategoryList = z.infer<typeof AdminCategoryListSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>;
export type DeleteCategoryInput = z.infer<typeof DeleteCategoryInputSchema>;
export type GetCategoriesInput = z.infer<typeof GetCategoriesInputSchema>;
