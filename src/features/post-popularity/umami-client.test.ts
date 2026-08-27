import { describe, expect, it, vi } from "vitest";
import { createUmamiClient, resolveUmamiApiConfig } from "./data/umami.client";

describe("Umami API configuration", () => {
  it("uses a Cloud API key when configured", () => {
    expect(
      resolveUmamiApiConfig({
        UMAMI_WEBSITE_ID: "website-id",
        UMAMI_API_KEY: "cloud-key",
      }),
    ).toEqual({
      type: "cloud",
      apiUrl: "https://api.umami.is/v1",
      websiteId: "website-id",
      apiKey: "cloud-key",
    });
  });

  it("uses login authentication for a self-hosted instance", () => {
    expect(
      resolveUmamiApiConfig({
        UMAMI_WEBSITE_ID: "website-id",
        UMAMI_SRC: "https://stats.example.com",
        UMAMI_USERNAME: "reporter",
        UMAMI_PASSWORD: "secret",
      }),
    ).toEqual({
      type: "self-hosted",
      apiUrl: "https://stats.example.com/api",
      websiteId: "website-id",
      username: "reporter",
      password: "secret",
    });
  });

  it.each([
    {},
    { UMAMI_WEBSITE_ID: "website-id" },
    {
      UMAMI_WEBSITE_ID: "website-id",
      UMAMI_USERNAME: "reporter",
    },
    {
      UMAMI_WEBSITE_ID: "website-id",
      UMAMI_API_KEY: "cloud-key",
      UMAMI_USERNAME: "reporter",
      UMAMI_PASSWORD: "secret",
    },
  ])("rejects incomplete or ambiguous configuration", (env) => {
    expect(() => resolveUmamiApiConfig(env)).toThrow();
  });
});

describe("Umami API client", () => {
  it("paginates Cloud path metrics with API key authentication", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json([
          { name: "/post/a", pageviews: 3 },
          { name: "/post/b", pageviews: 2 },
        ]),
      )
      .mockResolvedValueOnce(
        Response.json([{ name: "/post/c", pageviews: 1 }]),
      );
    const client = createUmamiClient({ fetcher, pageSize: 2 });

    const metrics = await client.getPathMetrics(
      {
        type: "cloud",
        apiUrl: "https://api.umami.is/v1",
        websiteId: "website-id",
        apiKey: "cloud-key",
      },
      { startAt: 10, endAt: 20 },
    );

    expect(metrics).toEqual([
      { path: "/post/a", pageviews: 3 },
      { path: "/post/b", pageviews: 2 },
      { path: "/post/c", pageviews: 1 },
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[0].toString()).toContain("offset=0");
    expect(fetcher.mock.calls[1]?.[0].toString()).toContain("offset=2");
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        Accept: "application/json",
        Authorization: "Bearer cloud-key",
      },
    });
  });

  it("logs in before querying a self-hosted instance", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ token: "session-token" }))
      .mockResolvedValueOnce(
        Response.json([{ name: "/post/a", pageviews: "3" }]),
      );
    const client = createUmamiClient({ fetcher });

    const metrics = await client.getPathMetrics(
      {
        type: "self-hosted",
        apiUrl: "https://stats.example.com/api",
        websiteId: "website-id",
        username: "reporter",
        password: "secret",
      },
      { startAt: 10, endAt: 20 },
    );

    expect(metrics).toEqual([{ path: "/post/a", pageviews: 3 }]);
    expect(fetcher.mock.calls[0]?.[0].toString()).toBe(
      "https://stats.example.com/api/auth/login",
    );
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      headers: {
        Accept: "application/json",
        Authorization: "Bearer session-token",
      },
    });
  });
});
