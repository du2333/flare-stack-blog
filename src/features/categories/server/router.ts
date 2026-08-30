import {
  CreateCategoryInputSchema,
  DeleteCategoryInputSchema,
  GetCategoriesInputSchema,
  UpdateCategoryInputSchema,
} from "@/features/categories/categories.schema";
import * as CategoryService from "@/features/categories/categories.service";
import { adminProcedure, publicProcedure } from "@/lib/orpc/procedure";
import { unwrapResult } from "@/lib/orpc/unwrap-result";

const categoryErrors = {
  CATEGORY_NOT_FOUND: { status: 404, message: "Category not found." },
  CATEGORY_NAME_ALREADY_EXISTS: {
    status: 409,
    message: "Category name already exists.",
  },
} as const;

const list = publicProcedure
  .route({
    method: "GET",
    path: "/categories",
    summary: "List public categories",
    tags: ["Categories"],
  })
  .handler(({ context }) => CategoryService.getPublicCategories(context));

const adminList = adminProcedure
  .route({
    method: "GET",
    path: "/admin/categories",
    summary: "List categories for admin",
    tags: ["Admin Categories"],
  })
  .input(GetCategoriesInputSchema)
  .handler(({ context, input }) =>
    CategoryService.getCategories(context, input),
  );

const create = adminProcedure
  .errors(categoryErrors)
  .route({
    method: "POST",
    path: "/admin/categories",
    summary: "Create a category",
    tags: ["Admin Categories"],
  })
  .input(CreateCategoryInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(CategoryService.createCategory(context, input), {
      CATEGORY_NAME_ALREADY_EXISTS: () => {
        throw errors.CATEGORY_NAME_ALREADY_EXISTS();
      },
    }),
  );

const update = adminProcedure
  .errors(categoryErrors)
  .route({
    method: "PATCH",
    path: "/admin/categories/{id}",
    summary: "Update a category",
    tags: ["Admin Categories"],
  })
  .input(UpdateCategoryInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(CategoryService.updateCategory(context, input), {
      CATEGORY_NOT_FOUND: () => {
        throw errors.CATEGORY_NOT_FOUND();
      },
      CATEGORY_NAME_ALREADY_EXISTS: () => {
        throw errors.CATEGORY_NAME_ALREADY_EXISTS();
      },
    }),
  );

const remove = adminProcedure
  .errors(categoryErrors)
  .route({
    method: "DELETE",
    path: "/admin/categories/{id}",
    summary: "Delete a category",
    tags: ["Admin Categories"],
  })
  .input(DeleteCategoryInputSchema)
  .handler(({ context, input, errors }) =>
    unwrapResult(CategoryService.deleteCategory(context, input), {
      CATEGORY_NOT_FOUND: () => {
        throw errors.CATEGORY_NOT_FOUND();
      },
    }),
  );

export default {
  list,
  admin: {
    list: adminList,
    create,
    update,
    remove,
  },
};
