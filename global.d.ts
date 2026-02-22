import type { DB as DBType } from "@/lib/db";
import type {
  Auth as AuthType,
  Session as SessionType,
} from "@/lib/auth/auth.server";
import type { QueueMessage } from "@/lib/queue/queue.schema";
import type { ThemeConfig } from "@/features/theme/config";

declare global {
  interface PostProcessWorkflowParams {
    postId: number;
    isPublished: boolean;
    publishedAt?: string;
  }

  interface ScheduledPublishWorkflowParams {
    postId: number;
    publishedAt: string;
  }

  interface CommentModerationWorkflowParams {
    commentId: number;
  }

  interface ExportWorkflowParams {
    taskId: string;
    postIds?: Array<number>;
    status?: "draft" | "published";
  }

  interface ImportWorkflowParams {
    taskId: string;
    r2Key: string;
    mode: "native" | "markdown";
  }

  interface Env extends Cloudflare.Env {
    POST_PROCESS_WORKFLOW: Workflow<PostProcessWorkflowParams>;
    COMMENT_MODERATION_WORKFLOW: Workflow<CommentModerationWorkflowParams>;
    SCHEDULED_PUBLISH_WORKFLOW: Workflow<ScheduledPublishWorkflowParams>;
    EXPORT_WORKFLOW: Workflow<ExportWorkflowParams>;
    IMPORT_WORKFLOW: Workflow<ImportWorkflowParams>;
    QUEUE: Queue<QueueMessage>;
  }

  type DB = DBType;
  type Auth = AuthType;
  type Session = SessionType;

  type BaseContext = {
    env: Env;
  };

  type DbContext = BaseContext & {
    db: DB;
  };

  type SessionContext = DbContext & {
    auth: Auth;
    session: Session | null;
  };

  type AuthContext = Omit<SessionContext, "session"> & {
    session: Session;
  };

  const __APP_VERSION__: string;
  const __THEME_CONFIG__: ThemeConfig;
}
