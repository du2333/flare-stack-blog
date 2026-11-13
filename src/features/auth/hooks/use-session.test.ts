// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  readSession,
  refreshSession,
  resetAuthBoundQueries,
  sessionQuery,
  watchSession,
} from "@/features/auth/queries";
import { useSession } from "./use-session";

// Reading the session must not load Better Auth's client.
vi.mock("@/lib/auth/auth-client", () => {
  throw new Error("useSession loaded the auth client");
});
vi.mock("@/lib/orpc", async () => {
  const { createTanstackQueryUtils } = await import("@orpc/tanstack-query");
  const unusedProcedure = async () => {
    throw new Error("unused");
  };
  return {
    orpc: createTanstackQueryUtils({
      comments: { list: unusedProcedure },
      email: { configured: unusedProcedure },
      friendLinks: { mine: unusedProcedure },
    }),
  };
});

const SIGNED_IN = {
  session: {
    id: "s1",
    userId: "u1",
    token: "t",
    expiresAt: "2026-12-12T10:00:00.000Z",
    createdAt: "2026-11-12T10:00:00.000Z",
    updatedAt: "2026-11-12T10:00:00.000Z",
  },
  user: {
    id: "u1",
    name: "Reader",
    email: "reader@example.com",
    emailVerified: true,
    role: "admin",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-11-12T10:00:00.000Z",
  },
};

const fetchMock = vi.fn<typeof fetch>();
let queryClient: QueryClient;

function respond(status: number, body: unknown) {
  return new Response(body === undefined ? "" : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

function renderSession() {
  return renderHook(
    () => {
      const result = useSession();
      // React Query re-renders only for the fields a render read.
      const { data, isPending, isSuccess, isError, isFetching } = result;
      void [data, isPending, isSuccess, isError, isFetching];
      return result;
    },
    { wrapper },
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  queryClient = new QueryClient();
  // As the router does for the browser's query client.
  watchSession(queryClient);
});
afterEach(() => {
  cleanup();
  queryClient.clear();
  vi.unstubAllGlobals();
});

it("is pending until the lookup answers, then signed out", async () => {
  let answer!: (response: Response) => void;
  fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const { result } = renderSession();

  expect(result.current.isPending).toBe(true);
  expect(result.current.data).toBeUndefined();
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock.mock.calls[0]![0]).toBe("/api/auth/get-session");

  answer(respond(200, null));
  await waitFor(() => expect(result.current.isPending).toBe(false));
  expect(result.current.data).toBeNull();
});

it("reads an empty answer as signed out", async () => {
  fetchMock.mockResolvedValue(respond(200, undefined));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
});

it("gives the signed-in session with its dates as dates", async () => {
  fetchMock.mockResolvedValue(respond(200, SIGNED_IN));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.data).toBeTruthy());

  const session = result.current.data!;
  expect(session.user.role).toBe("admin");
  expect(session.user.name).toBe("Reader");
  expect(session.session.expiresAt).toEqual(
    new Date("2026-12-12T10:00:00.000Z"),
  );
  expect(session.user.createdAt).toBeInstanceOf(Date);
});

it("asks once for every component that reads it", async () => {
  fetchMock.mockResolvedValue(respond(200, SIGNED_IN));
  const first = renderSession();
  await waitFor(() => expect(first.result.current.data).toBeTruthy());
  const later = renderSession();

  expect(later.result.current.data?.user.id).toBe("u1");
  expect(fetchMock).toHaveBeenCalledOnce();
});

it("reads 401 as signed out, as Better Auth's client does", async () => {
  fetchMock.mockResolvedValue(respond(401, { code: "UNAUTHORIZED" }));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
});

it("fails without a session when the lookup fails, without retrying", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock.mockResolvedValue(respond(500, { message: "down" }));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.isPending).toBe(false);
  expect(result.current.data).toBeUndefined();
  expect(fetchMock).toHaveBeenCalledOnce();
});

it("keeps the last answer when a later lookup fails", async () => {
  fetchMock.mockResolvedValueOnce(respond(200, SIGNED_IN));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.data).toBeTruthy());

  fetchMock.mockResolvedValueOnce(respond(503, null));
  await refreshSession(queryClient);
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.data?.user.id).toBe("u1");
});

it("shows signed out at once after signing out, without asking", async () => {
  fetchMock.mockResolvedValue(respond(200, SIGNED_IN));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.data).toBeTruthy());

  resetAuthBoundQueries(queryClient, "signed-out");
  await waitFor(() => expect(result.current.data).toBeNull());
  expect(result.current.isPending).toBe(false);
  expect(fetchMock).toHaveBeenCalledOnce();
});

it("drops the old answer and asks again after signing in", async () => {
  fetchMock.mockResolvedValueOnce(respond(200, null));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  fetchMock.mockResolvedValueOnce(respond(200, SIGNED_IN));
  resetAuthBoundQueries(queryClient, "signed-in");
  // A route guard reading the query now waits for the new answer.
  expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeUndefined();
  await waitFor(() => expect(result.current.data?.user.id).toBe("u1"));
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("shows the old session until a profile change arrives", async () => {
  fetchMock.mockResolvedValueOnce(
    respond(200, { ...SIGNED_IN, user: { ...SIGNED_IN.user, name: "" } }),
  );
  const { result } = renderSession();
  await waitFor(() => expect(result.current.data).toBeTruthy());

  let answer!: (response: Response) => void;
  fetchMock.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
  const refreshed = refreshSession(queryClient);
  await waitFor(() => expect(result.current.isFetching).toBe(true));
  expect(result.current.data?.user.name).toBe("");

  answer(respond(200, SIGNED_IN));
  await refreshed;
  await waitFor(() => expect(result.current.data?.user.name).toBe("Reader"));
});

it("tells other tabs through Better Auth's storage key", () => {
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  resetAuthBoundQueries(queryClient, "signed-out");
  expect(setItem).toHaveBeenCalledWith(
    "better-auth.message",
    expect.stringContaining('"trigger":"signed-out"'),
  );
});

it("asks again, once, when another tab changes the session", async () => {
  fetchMock.mockResolvedValueOnce(respond(200, SIGNED_IN));
  const { result } = renderSession();
  renderSession();
  await waitFor(() => expect(result.current.data).toBeTruthy());

  // Not about the session.
  act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", { key: "theme", newValue: "dark" }),
    );
  });
  expect(fetchMock).toHaveBeenCalledOnce();

  fetchMock.mockResolvedValueOnce(respond(200, null));
  act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "better-auth.message",
        newValue: JSON.stringify({ event: "session", data: {} }),
      }),
    );
  });
  await waitFor(() => expect(result.current.data).toBeNull());
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

function announceFromAnotherTab() {
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "better-auth.message",
      newValue: JSON.stringify({ event: "session", data: {} }),
    }),
  );
}

it("looks again when a reader mounts after another tab signed out unseen", async () => {
  // Tab A loads the session, then shows a page without any reader (an Admin
  // page) while tab B signs out.
  fetchMock.mockResolvedValueOnce(respond(200, SIGNED_IN));
  const first = renderSession();
  await waitFor(() => expect(first.result.current.data).toBeTruthy());
  first.unmount();

  fetchMock.mockResolvedValueOnce(respond(200, null));
  announceFromAnotherTab();
  expect(fetchMock).toHaveBeenCalledOnce();

  // Back on a public page, the header reads it again.
  const header = renderSession();
  await waitFor(() => expect(header.result.current.data).toBeNull());
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("looks again after another tab signed out, when the answer came from the server render", async () => {
  // An Admin page rendered on the server hands its guard's answer over; the
  // browser has not looked the session up itself.
  // (The fixture's dates stay strings here; nothing reads them.)
  queryClient.setQueryData(sessionQuery.queryKey, SIGNED_IN as never);
  fetchMock.mockResolvedValueOnce(respond(200, null));
  announceFromAnotherTab();

  const header = renderSession();
  await waitFor(() => expect(header.result.current.data).toBeNull());
  expect(fetchMock).toHaveBeenCalledOnce();
});

it("looks again on focus at most every five seconds", async () => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  fetchMock.mockResolvedValue(respond(200, SIGNED_IN));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.data).toBeTruthy());

  document.dispatchEvent(new Event("visibilitychange"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.isFetching).toBe(false));
  document.dispatchEvent(new Event("visibilitychange"));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("looks again when the network returns, even just after a focus check", async () => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  fetchMock.mockResolvedValue(respond(200, SIGNED_IN));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.data).toBeTruthy());

  vi.useFakeTimers({ toFake: ["Date"] });
  try {
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    // The focus check's five seconds do not hold a reconnect back.
    vi.advanceTimersByTime(3_000);
    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(result.current.isFetching).toBe(false));

    // A second focus inside the window is still skipped.
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  } finally {
    vi.useRealTimers();
  }
});

it("stays signed out when a lookup sent before the sign-out answers after it", async () => {
  fetchMock.mockResolvedValueOnce(respond(200, SIGNED_IN));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.data).toBeTruthy());

  let answer!: (response: Response) => void;
  fetchMock.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
  void refreshSession(queryClient);
  await waitFor(() => expect(result.current.isFetching).toBe(true));

  resetAuthBoundQueries(queryClient, "signed-out");
  answer(respond(200, SIGNED_IN));
  await waitFor(() => expect(result.current.isFetching).toBe(false));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(result.current.data).toBeNull();
  expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeNull();
});

it("gives a route guard the session, once until it goes out of date", async () => {
  fetchMock.mockResolvedValueOnce(respond(200, SIGNED_IN));
  expect((await readSession(queryClient))?.user.role).toBe("admin");
  await readSession(queryClient);
  expect(fetchMock).toHaveBeenCalledOnce();

  fetchMock.mockResolvedValueOnce(respond(200, null));
  announceFromAnotherTab();
  expect(await readSession(queryClient)).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("gives a route guard signed out when the lookup fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock.mockResolvedValueOnce(respond(500, { message: "down" }));
  expect(await readSession(queryClient)).toBeNull();
  fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  expect(await readSession(queryClient)).toBeNull();
  fetchMock.mockResolvedValueOnce(
    new Response("<html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }),
  );
  expect(await readSession(queryClient)).toBeNull();
});

it("keeps the header's last answer when a guard's lookup fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock.mockResolvedValueOnce(respond(200, SIGNED_IN));
  const { result } = renderSession();
  await waitFor(() => expect(result.current.data).toBeTruthy());

  fetchMock.mockResolvedValueOnce(respond(503, null));
  void queryClient.invalidateQueries({
    queryKey: sessionQuery.queryKey,
    refetchType: "none",
  });
  expect(await readSession(queryClient)).toBeNull();
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.data?.user.id).toBe("u1");
});
