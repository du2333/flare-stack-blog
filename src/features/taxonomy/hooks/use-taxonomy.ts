import { ORPCError } from "@orpc/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { categoriesAdminQueryOptions } from "@/features/categories/queries";
import { tagsWithCountAdminQueryOptions } from "@/features/tags/queries";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import type { TaxonomyItem, TaxonomyKind } from "../taxonomy";

const api = {
  category: {
    create: (name: string) => orpcClient.categories.admin.create({ name }),
    rename: (id: number, name: string) =>
      orpcClient.categories.admin.update({ id, data: { name } }),
    remove: (id: number) => orpcClient.categories.admin.remove({ id }),
  },
  tag: {
    create: (name: string) => orpcClient.tags.admin.create({ name }),
    rename: (id: number, name: string) =>
      orpcClient.tags.admin.update({ id, data: { name } }),
    remove: (id: number) => orpcClient.tags.admin.remove({ id }),
  },
} satisfies Record<TaxonomyKind, unknown>;

/**
 * Refresh what shows categories or tags: the counts here, the post list's
 * filters, the editor's pickers, and the post lists themselves.
 */
function invalidate(queryClient: QueryClient, kind: TaxonomyKind) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: kind === "category" ? orpc.categories.key() : orpc.tags.key(),
    }),
    queryClient.invalidateQueries({ queryKey: orpc.posts.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.posts.admin.list.key() }),
  ]);
}

function errorMessage(kind: TaxonomyKind, error: unknown) {
  if (error instanceof ORPCError && error.defined) {
    switch (error.code) {
      case "CATEGORY_NAME_ALREADY_EXISTS":
        return m.category_manager_name_exists();
      case "CATEGORY_NOT_FOUND":
        return m.category_manager_not_found();
      case "TAG_NAME_ALREADY_EXISTS":
        return m.tag_manager_name_exists();
      case "TAG_NOT_FOUND":
        return m.tag_manager_not_found();
    }
  }
  return kind === "category"
    ? m.category_manager_unknown_error()
    : m.tag_manager_unknown_error();
}

/** The categories or the tags with the posts that carry each. */
export function useTaxonomyItems(kind: TaxonomyKind) {
  const categories = useQuery({
    ...categoriesAdminQueryOptions(),
    enabled: kind === "category",
    refetchOnMount: "always",
  });
  const tags = useQuery({
    ...tagsWithCountAdminQueryOptions(),
    enabled: kind === "tag",
    refetchOnMount: "always",
  });
  const query = kind === "category" ? categories : tags;
  const items: Array<TaxonomyItem> | undefined =
    kind === "category" ? categories.data?.items : tags.data;
  return {
    items,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Create, rename, delete, and for tags delete every unused one. Each failure
 * is a toast naming the cause; the callbacks run after a success. `purgeDone`
 * is how many unused tags the purge has handled so far.
 */
export function useTaxonomyMutations(
  kind: TaxonomyKind,
  callbacks: {
    onCreated?: () => void;
    onRenamed?: () => void;
    onDeleted?: () => void;
    onPurged?: () => void;
  } = {},
) {
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (name: string) => api[kind].create(name),
    onSuccess: async (created) => {
      await invalidate(queryClient, kind);
      toast.success(
        kind === "category"
          ? m.admin_taxonomy_category_created({ name: created.name })
          : m.admin_taxonomy_tag_created({ name: created.name }),
      );
      callbacks.onCreated?.();
    },
    onError: (error) => toast.error(errorMessage(kind, error)),
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api[kind].rename(id, name),
    onSuccess: async () => {
      await invalidate(queryClient, kind);
      toast.success(
        kind === "category"
          ? m.category_manager_renamed()
          : m.tag_manager_renamed(),
      );
      callbacks.onRenamed?.();
    },
    onError: (error) => toast.error(errorMessage(kind, error)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api[kind].remove(id),
    onSuccess: async () => {
      await invalidate(queryClient, kind);
      toast.success(
        kind === "category"
          ? m.category_manager_deleted()
          : m.tag_manager_deleted(),
      );
      callbacks.onDeleted?.();
    },
    onError: (error) => toast.error(errorMessage(kind, error)),
  });
  const [purgeDone, setPurgeDone] = useState<number | null>(null);
  const purge = useMutation({
    mutationFn: async (ids: Array<number>) => {
      let done = 0;
      let failed = 0;
      setPurgeDone(0);
      for (const id of ids) {
        try {
          await api.tag.remove(id);
          done += 1;
        } catch {
          failed += 1;
        }
        setPurgeDone(done + failed);
      }
      return { done, failed };
    },
    onSuccess: async ({ done, failed }) => {
      await invalidate(queryClient, "tag");
      setPurgeDone(null);
      if (failed) toast.error(m.admin_taxonomy_purge_partial({ done, failed }));
      else toast.success(m.admin_taxonomy_purged({ count: done }));
      callbacks.onPurged?.();
    },
  });
  return { create, rename, remove, purge, purgeDone };
}
