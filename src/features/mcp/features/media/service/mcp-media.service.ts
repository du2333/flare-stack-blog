import * as MediaService from "@/features/media/service/media.service";
import { serializeMcpDate } from "../../../service/mcp-serialize";

export async function listMcpMedia(
  context: DbContext,
  input: {
    cursor?: number;
    limit?: number;
    search?: string;
    unusedOnly?: boolean;
  },
) {
  const result = await MediaService.getMediaList(context, input);
  const keys = result.items.map((item) => item.key);
  const linkedKeys = input.unusedOnly
    ? []
    : await MediaService.getLinkedMediaKeys(context, keys);
  const linkedKeySet = new Set(linkedKeys);

  return {
    items: result.items.map((item) => ({
      id: item.id,
      key: item.key,
      url: item.url,
      fileName: item.fileName,
      mimeType: item.mimeType,
      sizeInBytes: item.sizeInBytes,
      width: item.width ?? null,
      height: item.height ?? null,
      createdAt: serializeMcpDate(item.createdAt),
      inUse: linkedKeySet.has(item.key),
    })),
    nextCursor: result.nextCursor,
  };
}

export async function getMcpMediaUsage(context: DbContext, key: string) {
  const posts = await MediaService.getLinkedPosts(context, key);

  return {
    key,
    inUse: posts.length > 0,
    posts,
  };
}
