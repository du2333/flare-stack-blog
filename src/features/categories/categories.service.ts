import { invalidate } from "@/features/cache/public-cache";
import { publicCategoryList } from "@/features/categories/categories.cache";
import * as CategoryRepo from "@/features/categories/data/categories.data";
import type {
  CreateCategoryInput,
  DeleteCategoryInput,
  GetCategoriesInput,
  UpdateCategoryInput,
} from "@/features/categories/categories.schema";
import { err, ok } from "@/lib/errors";

async function invalidateCategoryRelatedCache(
  context: DbContext,
  affectedPosts: Array<{ id: number; slug: string | null }>,
) {
  await invalidate.categoryChanged(context, {
    slugs: affectedPosts.flatMap((post) => (post.slug ? [post.slug] : [])),
  });
}

export async function getPublicCategories(
  context: DbContext & {
    executionCtx: ExecutionContext;
  },
) {
  return publicCategoryList.get(context, {});
}

export async function getCategories(
  context: DbContext,
  data: GetCategoriesInput = {},
) {
  const { sortBy = "name", sortDir = "asc", publicOnly = false } = data;
  const [items, uncategorizedPostCount] = await Promise.all([
    CategoryRepo.getAllCategoriesWithCount(context.db, {
      sortBy,
      sortDir,
      publicOnly,
    }),
    CategoryRepo.countUncategorizedPosts(context.db),
  ]);
  return { items, uncategorizedPostCount };
}

export const createCategory = async (
  context: DbContext,
  data: CreateCategoryInput,
) => {
  const exists = await CategoryRepo.nameExists(context.db, data.name);
  if (exists) {
    return err({ reason: "CATEGORY_NAME_ALREADY_EXISTS" });
  }

  const category = await CategoryRepo.insertCategory(context.db, {
    name: data.name,
  });
  return ok(category);
};

export async function updateCategory(
  context: DbContext & { executionCtx: ExecutionContext },
  data: UpdateCategoryInput,
) {
  const existing = await CategoryRepo.findCategoryById(context.db, data.id);
  if (!existing) {
    return err({ reason: "CATEGORY_NOT_FOUND" });
  }

  if (data.data.name && data.data.name !== existing.name) {
    const exists = await CategoryRepo.nameExists(context.db, data.data.name, {
      excludeId: data.id,
    });
    if (exists) {
      return err({ reason: "CATEGORY_NAME_ALREADY_EXISTS" });
    }
  }

  const affectedPosts = await CategoryRepo.getPublishedPostsByCategoryId(
    context.db,
    data.id,
  );
  const category = await CategoryRepo.updateCategory(
    context.db,
    data.id,
    data.data,
  );

  context.executionCtx.waitUntil(
    invalidateCategoryRelatedCache(context, affectedPosts),
  );

  return ok(category);
}

export async function deleteCategory(
  context: DbContext & { executionCtx: ExecutionContext },
  data: DeleteCategoryInput,
) {
  const category = await CategoryRepo.findCategoryById(context.db, data.id);
  if (!category) {
    return err({ reason: "CATEGORY_NOT_FOUND" });
  }

  const affectedPosts = await CategoryRepo.getPublishedPostsByCategoryId(
    context.db,
    data.id,
  );
  await CategoryRepo.deleteCategory(context.db, data.id);

  context.executionCtx.waitUntil(
    invalidateCategoryRelatedCache(context, affectedPosts),
  );

  return ok({ success: true });
}
