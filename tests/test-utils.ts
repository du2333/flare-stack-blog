import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { getDb } from "@/lib/db";

export function createTestDb() {
  return getDb(env);
}

export function createMockAuth() {
  return {
    api: {
      getSession: vi.fn(async () => null),
    },
  } as unknown as Auth;
}

export function createMockSession(
  overrides: {
    user?: Partial<AuthContext["session"]["user"]>;
    session?: Partial<AuthContext["session"]["session"]>;
  } = {},
): AuthContext["session"] {
  const defaultUser: AuthContext["session"]["user"] = {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    emailVerified: true,
    image: null,
    role: null,
    banned: false,
    banReason: null,
    banExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultSession: AuthContext["session"]["session"] = {
    id: "test-session-id",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    token: "test-token",
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: "127.0.0.1",
    userAgent: "Vitest",
    userId: "test-user-id",
    impersonatedBy: null,
  };

  return {
    user: { ...defaultUser, ...overrides.user },
    session: { ...defaultSession, ...overrides.session },
  };
}

export function createMockAdminSession(): AuthContext["session"] {
  return createMockSession({
    user: {
      id: "admin-user-id",
      name: "Admin User",
      email: "admin@example.com",
      emailVerified: true,
      image: null,
      role: "admin",
      banned: false,
      banReason: null,
      banExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export function createMockExecutionCtx(): ExecutionContext {
  return createExecutionContext();
}

/**
 * 等待所有的 waitUntil 任务完成
 */
export async function waitForBackgroundTasks(ctx: ExecutionContext) {
  await waitOnExecutionContext(ctx);
}

export function createTestContext(
  overrides: Partial<AuthContext & { executionCtx: ExecutionContext }> = {},
) {
  const context = {
    db: createTestDb(),
    env: env,
    executionCtx: createMockExecutionCtx(),
    auth: createMockAuth(),
    ...overrides,
  };

  // Mock Workflow create methods
  const mockWorkflowInstance = { id: "mock-id" };

  vi.spyOn(context.env.COMMENT_MODERATION_WORKFLOW, "create").mockResolvedValue(
    mockWorkflowInstance as unknown as Awaited<
      ReturnType<Env["COMMENT_MODERATION_WORKFLOW"]["create"]>
    >,
  );

  vi.spyOn(context.env.POST_PROCESS_WORKFLOW, "create").mockResolvedValue(
    mockWorkflowInstance as unknown as Awaited<
      ReturnType<Env["POST_PROCESS_WORKFLOW"]["create"]>
    >,
  );

  vi.spyOn(context.env.QUEUE, "send").mockResolvedValue();

  vi.spyOn(context.env.SCHEDULED_PUBLISH_WORKFLOW, "get").mockResolvedValue({
    ...mockWorkflowInstance,
    terminate: vi.fn(),
  } as unknown as Awaited<
    ReturnType<Env["SCHEDULED_PUBLISH_WORKFLOW"]["get"]>
  >);

  vi.spyOn(context.env.SCHEDULED_PUBLISH_WORKFLOW, "create").mockResolvedValue(
    mockWorkflowInstance as unknown as Awaited<
      ReturnType<Env["SCHEDULED_PUBLISH_WORKFLOW"]["create"]>
    >,
  );

  return context;
}

export function createAuthTestContext(
  overrides: Partial<AuthContext & { executionCtx: ExecutionContext }> = {},
) {
  return {
    ...createTestContext(),
    session: createMockSession(),
    ...overrides,
  };
}

export function createAdminTestContext(
  overrides: Partial<AuthContext & { executionCtx: ExecutionContext }> = {},
) {
  return {
    ...createTestContext(),
    session: createMockAdminSession(),
    ...overrides,
  };
}

/**
 * 确保用户存在于数据库中（用于满足外键约束）
 */
export async function seedUser(
  db: ReturnType<typeof createTestDb>,
  userRecord: typeof schema.user.$inferInsert,
) {
  await db
    .insert(schema.user)
    .values(userRecord)
    .onConflictDoUpdate({
      target: schema.user.id,
      set: {
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.role,
      },
    });
}

/**
 * Helper to make requests to the Hono app with a mock ExecutionContext
 */
export async function testRequest<TEnv extends Env = Env>(
  app: {
    request: (
      path: string,
      options?: RequestInit,
      env?: TEnv,
      executionCtx?: ExecutionContext,
    ) => Promise<Response> | Response;
  },
  path: string,
  options: RequestInit = {},
  customEnv: TEnv = env as unknown as TEnv,
) {
  return app.request(path, options, customEnv, createMockExecutionCtx());
}
