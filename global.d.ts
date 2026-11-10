import type {
  Auth as AuthType,
  Session as SessionType,
} from "@/lib/auth/auth.server";
import type { DB as DBType } from "@/lib/db";
import type { QueueMessage } from "@/lib/queue/queue.schema";

declare global {
  interface Env extends Cloudflare.Env {
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
    getAuth: () => Promise<Auth>;
    session: Session | null;
  };

  type AuthContext = Omit<SessionContext, "session"> & {
    session: Session;
  };

  const __APP_VERSION__: string;
  /** Identifies the deployed build; see the Workers Cache key in server.ts. */
  const __BUILD_ID__: string;
  /** The test fixture Theme's id in a THEME_FIXTURE=1 build; see scripts/vite-theme-fixture.ts. */
  const __FIXTURE_THEME_IDS__: ReadonlyArray<string> | undefined;
}
