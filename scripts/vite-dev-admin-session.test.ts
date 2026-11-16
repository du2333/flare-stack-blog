import { describe, expect, it } from "vitest";
import {
  answerSignIn,
  isLoopbackAddress,
  isSignInPath,
  landingPath,
  sessionCookieHeader,
  signInLink,
} from "./vite-dev-admin-session";

const state = JSON.stringify({ cookie: "abc123.d%2Bef%3D" });

describe("isSignInPath", () => {
  it("matches the path with or without a query, and nothing else", () => {
    expect(isSignInPath("/__dev/admin-session")).toBe(true);
    expect(isSignInPath("/__dev/admin-session?to=/admin/posts")).toBe(true);
    expect(isSignInPath("/__dev/admin-session/")).toBe(false);
    expect(isSignInPath("/__dev/admin-sessions")).toBe(false);
    expect(isSignInPath("/admin")).toBe(false);
    expect(isSignInPath(undefined)).toBe(false);
  });
});

describe("landingPath", () => {
  it("keeps a path with a single leading slash", () => {
    expect(landingPath("/admin/posts?x=1")).toBe("/admin/posts?x=1");
  });

  it("falls back to the Admin for anything that could leave the site", () => {
    for (const to of [
      null,
      undefined,
      "",
      "admin",
      "//evil.test",
      "/\\evil.test",
      "https://evil.test",
      "/a\r\nSet-Cookie: x=1",
    ]) {
      expect(landingPath(to)).toBe("/admin");
    }
  });
});

describe("answerSignIn", () => {
  it("sets the better-auth cookie and redirects to the Admin", () => {
    const answer = answerSignIn("GET", "/__dev/admin-session", true, state);
    expect(answer.status).toBe(302);
    expect(answer.headers["Set-Cookie"]).toBe(
      "better-auth.session_token=abc123.d%2Bef%3D; Path=/; HttpOnly; SameSite=Lax",
    );
    expect(answer.headers.Location).toBe("/admin");
  });

  it("redirects to a valid `to`, and to the Admin for an invalid one", () => {
    expect(
      answerSignIn("GET", "/__dev/admin-session?to=/admin/posts", true, state)
        .headers.Location,
    ).toBe("/admin/posts");
    expect(
      answerSignIn("GET", "/__dev/admin-session?to=//evil.test", true, state)
        .headers.Location,
    ).toBe("/admin");
  });

  it("answers 404 with one line when there is no state file", () => {
    const answer = answerSignIn("GET", "/__dev/admin-session", true, undefined);
    expect(answer.status).toBe(404);
    expect(answer.body.split("\n")).toHaveLength(1);
    expect(answer.headers["Set-Cookie"]).toBeUndefined();
  });

  it("answers 404 and sets nothing for an unusable state file", () => {
    for (const bad of [
      "not json",
      "{}",
      JSON.stringify({ cookie: "a; Path=/x" }),
      JSON.stringify({ cookie: 12 }),
    ]) {
      const answer = answerSignIn("GET", "/__dev/admin-session", true, bad);
      expect(answer.status).toBe(404);
      expect(answer.headers["Set-Cookie"]).toBeUndefined();
    }
  });

  it("answers only GET and HEAD", () => {
    expect(
      answerSignIn("POST", "/__dev/admin-session", true, state).status,
    ).toBe(405);
    expect(
      answerSignIn("HEAD", "/__dev/admin-session", true, state).status,
    ).toBe(302);
  });
});

describe("sessionCookieHeader", () => {
  it("names the cookie the app accepts", () => {
    expect(sessionCookieHeader("v")).toMatch(/^better-auth\.session_token=v;/);
  });
});

describe("signInLink", () => {
  it("takes the port of the worktree's dev server from BETTER_AUTH_URL", () => {
    expect(
      signInLink('A=1\nBETTER_AUTH_URL="http://localhost:3183"\nB=2\n'),
    ).toBe("http://localhost:3183/__dev/admin-session");
    expect(signInLink("BETTER_AUTH_URL=http://localhost:3000/")).toBe(
      "http://localhost:3000/__dev/admin-session",
    );
  });

  it("is undefined without a usable BETTER_AUTH_URL", () => {
    expect(signInLink("A=1")).toBeUndefined();
    expect(signInLink("BETTER_AUTH_URL=nonsense")).toBeUndefined();
  });
});

describe("isLoopbackAddress", () => {
  it("accepts 127.0.0.0/8, ::1 and the IPv4-mapped loopback", () => {
    for (const address of [
      "127.0.0.1",
      "127.1.2.3",
      "::1",
      "::ffff:127.0.0.1",
      "::FFFF:127.9.9.9",
    ]) {
      expect(isLoopbackAddress(address), address).toBe(true);
    }
  });

  it("rejects a LAN or public address, lookalikes and no address", () => {
    for (const address of [
      "192.168.1.20",
      "10.0.0.5",
      "::ffff:192.168.1.20",
      "fe80::1",
      "::2",
      "128.0.0.1",
      "127.0.0.1.evil.test",
      "127.0.0",
      "127.0.0.256",
      "",
      undefined,
    ]) {
      expect(isLoopbackAddress(address), String(address)).toBe(false);
    }
  });

  it("makes the answer a 404 without a cookie when the client is not on this machine", () => {
    const answer = answerSignIn("GET", "/__dev/admin-session", false, state);
    expect(answer.status).toBe(404);
    expect(answer.body.split("\n")).toHaveLength(1);
    expect(answer.headers["Set-Cookie"]).toBeUndefined();
    expect(answer.headers.Location).toBeUndefined();
  });
});
