import type {
  Auth as AuthType,
  Session as SessionType,
} from "@/lib/auth/auth.server";
import type { DB as DBType } from "@/lib/db";
import type { QueueMessage } from "@/lib/queue/queue.schema";

declare global {
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
}
