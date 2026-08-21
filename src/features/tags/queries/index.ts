import { orpc } from "@/lib/orpc";
import type { GetTagsInput } from "../tags.schema";

export const tagsQueryOptions = orpc.tags.list.queryOptions();

export function tagsAdminQueryOptions(options: GetTagsInput = {}) {
  return orpc.tags.admin.list.queryOptions({
    input: options,
    staleTime: Infinity,
  });
}

export function tagsByPostIdQueryOptions(postId: number) {
  return orpc.tags.admin.byPostId.queryOptions({ input: { postId } });
}

export function tagsWithCountAdminQueryOptions(options: GetTagsInput = {}) {
  return orpc.tags.admin.listWithCount.queryOptions({ input: options });
}
