import { createServerFn } from "@tanstack/react-start";
import {
  DeleteSearchDocSchema,
  UpsertSearchDocSchema,
} from "@/features/search/search.schema";
import * as SearchService from "@/features/search/service/search.service";
import { adminMiddleware, dbMiddleware } from "@/lib/middlewares";

export const buildSearchIndexFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(({ context }) => SearchService.rebuildIndex(context));

export const upsertSearchDocFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(UpsertSearchDocSchema)
  .handler(({ data, context }) => SearchService.upsert(context, data));

export const deleteSearchDocFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(DeleteSearchDocSchema)
  .handler(({ data, context }) => SearchService.deleteIndex(context, data));

export const getIndexVersionFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(({ context }) => SearchService.getIndexVersion(context));
