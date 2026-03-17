import * as TagService from "@/features/tags/tags.service";
import { serializeMcpDate } from "../../../service/mcp-serialize";

export function serializeMcpTag(tag: {
  createdAt: Date | string;
  id: number;
  name: string;
}) {
  return {
    createdAt: serializeMcpDate(tag.createdAt),
    id: tag.id,
    name: tag.name,
  };
}

export function serializeMcpTagWithCount(tag: {
  createdAt: Date | string;
  id: number;
  name: string;
  postCount: number;
}) {
  return {
    ...serializeMcpTag(tag),
    postCount: tag.postCount,
  };
}

export async function ensureTagIdsByNames(
  context: DbContext,
  tagNames: Array<string>,
) {
  const normalizedNames = [...new Set(tagNames.map((name) => name.trim()))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (normalizedNames.length === 0) {
    return [];
  }

  const existingTags = await TagService.getTags(context, {
    sortBy: "name",
    sortDir: "asc",
  });

  const idByName = new Map(existingTags.map((tag) => [tag.name, tag.id]));
  const tagIds: Array<number> = [];

  for (const name of normalizedNames) {
    const existingId = idByName.get(name);
    if (existingId) {
      tagIds.push(existingId);
      continue;
    }

    const created = await TagService.createTag(context, { name });
    if (created.error) {
      throw new Error(`Failed to create tag "${name}"`);
    }

    idByName.set(created.data.name, created.data.id);
    tagIds.push(created.data.id);
  }

  return tagIds;
}
