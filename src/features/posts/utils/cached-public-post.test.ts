import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { findCachedPublicPost } from "./cached-public-post";

describe("findCachedPublicPost", () => {
  it("finds a post in list and infinite query caches", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["recent"], {
      items: [{ slug: "pasta", title: "Pasta" }],
    });
    expect(findCachedPublicPost(queryClient, "pasta")?.title).toBe("Pasta");

    queryClient.clear();
    queryClient.setQueryData(["infinite"], {
      pages: [{ items: [{ slug: "concrete", title: "Concrete" }] }],
    });
    expect(findCachedPublicPost(queryClient, "concrete")?.title).toBe(
      "Concrete",
    );
    expect(findCachedPublicPost(queryClient, "missing")).toBeUndefined();
  });
});
