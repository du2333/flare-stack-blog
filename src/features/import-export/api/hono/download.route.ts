import { Hono } from "hono";
import { IMPORT_EXPORT_R2_KEYS } from "@/features/import-export/import-export.schema";
import { getDb } from "@/lib/db";
import { getAuth } from "@/lib/auth/auth.server";
import { serverEnv } from "@/lib/env/server.env";

export const exportDownloadRoute = new Hono<{ Bindings: Env }>();

exportDownloadRoute.use("*", async (c, next) => {
  const db = getDb(c.env);
  const auth = getAuth({ db, env: c.env });
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.text("Unauthorized", 401);
  }

  const env = serverEnv(c.env);
  if (session.user.email !== env.ADMIN_EMAIL) {
    return c.text("Forbidden", 403);
  }

  return next();
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exportDownloadRoute.get("/download/:taskId", async (c) => {
  const taskId = c.req.param("taskId");
  if (!taskId || !UUID_REGEX.test(taskId)) {
    return c.text("Invalid task ID", 400);
  }

  const r2Key = IMPORT_EXPORT_R2_KEYS.exportZip(taskId);

  try {
    const r2Object = await c.env.R2.get(r2Key);
    if (!r2Object) {
      return c.text("导出文件未找到或已过期", 404);
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set(
      "Content-Disposition",
      `attachment; filename="export-${taskId.slice(0, 8)}.zip"`,
    );
    headers.set("Cache-Control", "private, no-cache");

    return new Response(r2Object.body, { headers });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "export download failed",
        taskId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return c.text("下载失败", 500);
  }
});
