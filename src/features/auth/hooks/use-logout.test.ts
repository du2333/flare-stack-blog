// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { toast } from "@/lib/toast";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { sessionQuery } from "@/features/auth/queries";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { useLogout } from "./use-logout";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/lib/auth/sign-out", () => ({ signOut }));
// Signing out needs no chunk of Better Auth's client.
vi.mock("@/lib/auth/auth-client", () => {
  throw new Error("useLogout loaded the auth client");
});
vi.mock("@/lib/orpc", async () => {
  const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
  const unusedProcedure = async () => {
    throw new Error("Logout must not fetch inactive queries");
  };
  return {
    orpc: createTanstackQueryUtils({
      comments: { list: unusedProcedure },
      email: { configured: unusedProcedure },
      friendLinks: { mine: unusedProcedure },
    }),
  };
});
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let queryClient: QueryClient;
const authBoundKeys = [
  orpc.comments.key(),
  orpc.email.key(),
  orpc.friendLinks.mine.key(),
];
const publicKey = ["public-content"];

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockReset();
  queryClient = new QueryClient();
  queryClient.setQueryData<unknown>(sessionQuery.queryKey, {
    user: { id: "reader" },
  });
  for (const key of [...authBoundKeys, publicKey]) {
    queryClient.setQueryData(key, ["cached"]);
  }
});
afterEach(() => {
  cleanup();
  queryClient.clear();
});

it.each([false, true])(
  "clears auth-bound caches after successful sign-out, with a success action: %s",
  async (withSuccessAction) => {
    let complete!: (value: { error: null }) => void;
    signOut.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const onSuccess = vi.fn(() => {
      expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeNull();
      expect(toast.success).toHaveBeenCalledOnce();
    });
    const { result } = renderHook(
      () => useLogout(withSuccessAction ? { onSuccess } : undefined),
      { wrapper },
    );

    const pending = result.current.logout();
    expect(signOut).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeDefined();
    expect(toast.success).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () => {
      complete({ error: null });
      await pending;
    });

    expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeNull();
    for (const key of authBoundKeys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    expect(queryClient.getQueryState(publicKey)?.isInvalidated).toBe(false);
    expect(toast.success).toHaveBeenCalledWith(m.auth_logout_success(), {
      description: m.auth_logout_success_desc(),
    });
    expect(toast.error).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(withSuccessAction ? 1 : 0);
  },
);

it.each(["SESSION_EXPIRED", "UNKNOWN"])(
  "preserves caches and skips the success action when sign-out returns %s",
  async (code) => {
    signOut.mockResolvedValue({ error: { code } });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useLogout({ onSuccess }), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeDefined();
    for (const key of authBoundKeys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
    }
    expect(toast.error).toHaveBeenCalledWith(m.auth_logout_failed(), {
      description:
        code === "SESSION_EXPIRED"
          ? m.auth_error_session_expired()
          : m.auth_logout_failed_desc(),
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  },
);
