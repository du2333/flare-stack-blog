import { createFileRoute } from "@tanstack/react-router";
import { IMPORT_EXPORT_R2_KEYS } from "@/features/import-export/import-export.schema";
import { getAuth } from "@/lib/auth/auth.server";
import { getDb } from "@/lib/db";
import { serverEnv } from "@/lib/env/server.env";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/admin/export/download/$taskId")({
  server: {
    handlers: {
      GET: async ({ request, params, context }) => {
        const db = getDb(context.env);
        const auth = getAuth({ db, env: context.env });
        const session = await auth.api.getSession({
          headers: request.headers,
        });

        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }

        if (session.user.email !== serverEnv(context.env).ADMIN_EMAIL) {
          return new Response("Forbidden", { status: 403 });
        }

        const taskId = params.taskId;
        if (!taskId || !UUID_REGEX.test(taskId)) {
          return new Response("Invalid task ID", { status: 400 });
        }

        const r2Key = IMPORT_EXPORT_R2_KEYS.exportZip(taskId);

        try {
          const r2Object = await context.env.R2.get(r2Key);
          if (!r2Object) {
            return new Response("导出文件未找到或已过期", { status: 404 });
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
          return new Response("下载失败", { status: 500 });
        }
      },
    },
  },
});
