import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import {
  GetMediaListInputSchema,
  UpdateMediaNameInputSchema,
  UploadMediaInputSchema,
  SubmitGuitarTabInputSchema,
  UploadAvatarInputSchema,
} from "@/features/media/media.schema";
import * as MediaService from "@/features/media/media.service";
import {
  adminMiddleware,
  authMiddleware,
  createRateLimitMiddleware,
  dbMiddleware,
} from "@/lib/middlewares";

export const uploadImageFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(UploadMediaInputSchema)
  .handler(({ data: file, context }) => MediaService.upload({ ...context, session: context.session }, file));

export const deleteImageFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      key: z.string().min(1, "Image key is required"),
    }),
  )
  .handler(({ data, context }) => MediaService.deleteImage(context, data.key));

export const getMediaFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(GetMediaListInputSchema)
  .handler(({ data, context }) => MediaService.getMediaList(context, data));

export const getLinkedPostsFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      key: z.string().min(1, "Image key is required"),
    }),
  )
  .handler(({ data, context }) =>
    MediaService.getLinkedPosts(context, data.key),
  );

export const getLinkedMediaKeysFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      keys: z.array(z.string()),
    }),
  )
  .handler(({ data, context }) =>
    MediaService.getLinkedMediaKeys(context, data.keys),
  );

export const getTotalMediaSizeFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(({ context }) => MediaService.getTotalMediaSize(context));

export const updateMediaNameFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(UpdateMediaNameInputSchema)
  .handler(({ data, context }) => MediaService.updateMediaName(context, data));

// ─── Public: 吉他谱列表（含元数据 + 封面，分页） ────────────

const GetGuitarTabsInputSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  search: z.string().optional(),
});

export const getGuitarTabsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(GetGuitarTabsInputSchema)
  .handler(({ data, context }) =>
    MediaService.getGuitarTabsList(context, data),
  );

// ─── Public: 吉他谱详情页（根据 slug） ────────────────

export const getGuitarTabBySlugFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(({ data, context }) =>
    MediaService.getGuitarTabBySlug(context, data.slug),
  );

// ─── Admin: 获取单个吉他谱元数据 ──────────────────────

export const getGuitarTabMetaFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ mediaId: z.number() }))
  .handler(({ data, context }) =>
    MediaService.getGuitarTabMetaByMediaId(context, data.mediaId),
  );

// ─── Admin: 批量处理未解析的吉他谱（直接执行，不依赖 Workflow） ─────

export const processUnparsedGuitarTabsFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    // 强制重新解析所有吉他谱（覆盖已有乱码元数据）
    return await MediaService.processAllGuitarTabsDirect(
      context.env,
      context.db,
      true,
    );
  });

// ─── Admin: 为缺少封面的吉他谱获取封面 ─────────────────

export const fetchMissingCoversFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return await MediaService.fetchMissingCovers(
      context.env,
      context.db,
    );
  });

// ─── Admin: 审核吉他谱（通过/拒绝） ─────────────────────

export const reviewGuitarTabFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      mediaId: z.number(),
      status: z.enum(["approved", "rejected"]),
      rejectionReason: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await MediaService.reviewGuitarTab(context, data);
    return { success: true };
  });

// ─── Admin: 获取吉他谱列表（含全部状态） ──────────────

export const getGuitarTabsAdminFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      cursor: z.number().optional(),
      limit: z.number().optional(),
      search: z.string().optional(),
      status: z.enum(["pending", "approved", "rejected"]).optional(),
    }),
  )
  .handler(({ data, context }) =>
    MediaService.getGuitarTabsListAdmin(context, data),
  );

// ─── User: 提交吉他谱 ────────────────────────────────

export const submitGuitarTabFn = createServerFn({
  method: "POST",
})
  .middleware([
    createRateLimitMiddleware({
      capacity: 5,
      interval: "1h",
      key: "guitar-tabs:submit",
    }),
    authMiddleware,
  ])
  .inputValidator(SubmitGuitarTabInputSchema)
  .handler(async ({ data, context }) => {
    return await MediaService.submitGuitarTab(context, data);
  });

// ─── User: 获取自己提交的吉他谱 ──────────────────────

export const getMyGuitarTabsFn = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return await MediaService.getMyGuitarTabs(context);
  });

// ─── User: 上传头像 ──────────────────────────────────

export const uploadAvatarFn = createServerFn({
  method: "POST",
})
  .middleware([
    createRateLimitMiddleware({
      capacity: 10,
      interval: "1h",
      key: "avatar:upload",
    }),
    authMiddleware,
  ])
  .inputValidator(UploadAvatarInputSchema)
  .handler(async ({ data, context }) => {
    return await MediaService.uploadAvatar(context, data.file);
  });
