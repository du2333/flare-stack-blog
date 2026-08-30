import { describe, expect, it } from "vitest";
import { inspectApiKeyManagementAccess } from "./api-key-guard";

describe("inspectApiKeyManagementAccess", () => {
  it("allows non-management auth paths", () => {
    expect(
      inspectApiKeyManagementAccess({
        path: "/get-session",
        headers: new Headers({ "x-api-key": "fsb_secret" }),
        isHttpRequest: true,
        role: "admin",
      }),
    ).toEqual({ denied: false });
  });

  it("rejects management when the request carries an API Key", () => {
    expect(
      inspectApiKeyManagementAccess({
        path: "/api-key/create",
        headers: new Headers({ "x-api-key": "fsb_secret" }),
        isHttpRequest: true,
        role: "admin",
      }),
    ).toEqual({ denied: true, code: "API_KEY_CANNOT_MANAGE_API_KEYS" });
  });

  it("rejects HTTP management that is not an Admin browser session", () => {
    expect(
      inspectApiKeyManagementAccess({
        path: "/api-key/list",
        headers: new Headers(),
        isHttpRequest: true,
        role: "user",
      }),
    ).toEqual({ denied: true, code: "ADMIN_REQUIRED" });
  });

  it("allows server-side management calls without an HTTP request", () => {
    expect(
      inspectApiKeyManagementAccess({
        path: "/api-key/create",
        isHttpRequest: false,
        role: null,
      }),
    ).toEqual({ denied: false });
  });
});
