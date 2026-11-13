import { describe, expect, it, vi } from "vitest";
import { createUmamiClient, resolveUmamiApiConfig } from "./data/umami-api";

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

function requestUrl(input: RequestInfo | URL | undefined) {
  return input instanceof Request ? input.url : String(input);
}

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
    expect(requestUrl(fetcher.mock.calls[0]?.[0])).toContain("offset=0");
    expect(requestUrl(fetcher.mock.calls[1]?.[0])).toContain("offset=2");
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
    expect(requestUrl(fetcher.mock.calls[0]?.[0])).toBe(
      "https://stats.example.com/api/auth/login",
    );
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      headers: {
        Accept: "application/json",
        Authorization: "Bearer session-token",
      },
    });
  });
  describe("daily views", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const start = Date.parse("2026-11-01T00:00:00.000Z");
    const window = { startAt: start, endAt: start + 3 * DAY - 1 };
    const cloud = {
      type: "cloud" as const,
      apiUrl: "https://api.umami.is/v1",
      websiteId: "website-id",
      apiKey: "cloud-key",
    };

    it("asks Cloud for UTC day buckets of the window and fills the days without views", async () => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
        Response.json({
          pageviews: [
            { x: "2026-11-01T00:00:00Z", y: 12 },
            { x: "2026-11-03T00:00:00Z", y: 5 },
          ],
          sessions: [{ x: "2026-11-02T00:00:00Z", y: 99 }],
        }),
      );
      const client = createUmamiClient({ fetcher });

      const daily = await client.getDailyViews(cloud, window);

      expect(daily).toEqual([
        { day: start, views: 12 },
        { day: start + DAY, views: 0 },
        { day: start + 2 * DAY, views: 5 },
      ]);
      expect(fetcher).toHaveBeenCalledTimes(1);
      const url = new URL(requestUrl(fetcher.mock.calls[0]?.[0]));
      expect(url.origin + url.pathname).toBe(
        "https://api.umami.is/v1/websites/website-id/pageviews",
      );
      expect(Object.fromEntries(url.searchParams)).toEqual({
        startAt: String(window.startAt),
        endAt: String(window.endAt),
        unit: "day",
        timezone: "UTC",
      });
      expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
        headers: {
          Accept: "application/json",
          Authorization: "Bearer cloud-key",
        },
      });
    });

    it("logs in before asking a self-hosted instance", async () => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json({ token: "session-token" }))
        .mockResolvedValueOnce(Response.json({ pageviews: [], sessions: [] }));
      const client = createUmamiClient({ fetcher });

      const daily = await client.getDailyViews(
        {
          type: "self-hosted",
          apiUrl: "https://stats.example.com/api",
          websiteId: "website-id",
          username: "reporter",
          password: "secret",
        },
        window,
      );

      expect(daily.map((entry) => entry.views)).toEqual([0, 0, 0]);
      expect(requestUrl(fetcher.mock.calls[0]?.[0])).toBe(
        "https://stats.example.com/api/auth/login",
      );
      expect(requestUrl(fetcher.mock.calls[1]?.[0])).toContain(
        "https://stats.example.com/api/websites/website-id/pageviews?",
      );
      expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
        headers: { Authorization: "Bearer session-token" },
      });
    });

    it("reads the older space-separated bucket format, numeric-string counts and repeated buckets", async () => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
        Response.json({
          pageviews: [
            { x: "2026-11-01 00:00:00", y: "7" },
            { x: "2026-11-01T00:00:00.000Z", y: 1 },
            { x: "2026-11-03 00:00:00", y: "2.0" },
            { x: "2026-10-31 00:00:00", y: 50 },
            { x: "not a date", y: 9 },
          ],
        }),
      );
      const client = createUmamiClient({ fetcher });

      await expect(client.getDailyViews(cloud, window)).resolves.toEqual([
        { day: start, views: 8 },
        { day: start + DAY, views: 0 },
        { day: start + 2 * DAY, views: 2 },
      ]);
    });

    it("rejects a failed or malformed response", async () => {
      const failing = createUmamiClient({
        fetcher: vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(new Response("nope", { status: 500 })),
      });
      await expect(failing.getDailyViews(cloud, window)).rejects.toThrow(
        /Umami pageviews request failed: 500/,
      );

      const malformed = createUmamiClient({
        fetcher: vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(Response.json([{ x: "2026-11-01", y: 1 }])),
      });
      await expect(malformed.getDailyViews(cloud, window)).rejects.toThrow();
    });
  });
});
