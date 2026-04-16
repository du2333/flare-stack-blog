import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { ThemeName, ThemeRouterConfig } from "@/features/theme/registry";
import type {
  Auth as AuthType,
  Session as SessionType,
} from "@/lib/auth/auth.server";
import type { DB as DBType } from "@/lib/db";
import type { QueueMessage } from "@/lib/queue/queue.schema";

declare global {
  interface PostProcessWorkflowParams {
    postId: number;
    isPublished: boolean;
    publishedAt?: string;
    isFuturePost?: boolean;
  }

  interface ScheduledPublishWorkflowParams {
    postId: number;
    publishedAt: string;
  }

  interface PostAutoSnapshotWorkflowParams {
    postId: number;
    quietWindowSeconds?: number;
  }

  interface CommentModerationWorkflowParams {
    commentId: number;
  }

  interface ExportWorkflowParams {
    taskId: string;
    postIds?: Array<number>;
    status?: "draft" | "published";
    locale?: "zh" | "en";
  }

  interface ImportWorkflowParams {
    taskId: string;
    r2Key: string;
    mode: "native" | "markdown";
    locale?: "zh" | "en";
  }

  interface Env extends Cloudflare.Env {
    POST_PROCESS_WORKFLOW: Workflow<PostProcessWorkflowParams>;
    POST_AUTO_SNAPSHOT_WORKFLOW: Workflow<PostAutoSnapshotWorkflowParams>;
    COMMENT_MODERATION_WORKFLOW: Workflow<CommentModerationWorkflowParams>;
    SCHEDULED_PUBLISH_WORKFLOW: Workflow<ScheduledPublishWorkflowParams>;
    EXPORT_WORKFLOW: Workflow<ExportWorkflowParams>;
    IMPORT_WORKFLOW: Workflow<ImportWorkflowParams>;
    OAUTH_PROVIDER?: OAuthHelpers;
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
  const __THEME_NAME__: ThemeName;
  const __THEME_CONFIG__: ThemeRouterConfig;
}
