import { createTestContext } from "tests/test-utils";
import { expect, it } from "vitest";
import { FriendLinksTable } from "@/lib/db/schema";
import { getAllFriendLinks } from "./friend-links.service";

it("searches all matching sites before pagination while keeping status counts unfiltered", async () => {
  const context = createTestContext();
  await context.db.insert(FriendLinksTable).values([
    {
      siteName: "Notes %_ one",
      siteUrl: "https://one.example.com",
      status: "pending",
    },
    {
      siteName: "Notes %_ two",
      siteUrl: "https://two.example.com",
      status: "pending",
    },
    {
      siteName: "Unrelated",
      siteUrl: "https://other.example.com",
      status: "pending",
    },
    {
      siteName: "Notes %_ public",
      siteUrl: "https://public.example.com",
      status: "approved",
    },
  ]);
  const first = await getAllFriendLinks(context, {
    status: "pending",
    search: "%_",
    limit: 1,
    offset: 0,
  });
  const second = await getAllFriendLinks(context, {
    status: "pending",
    search: "%_",
    limit: 1,
    offset: 1,
  });
  expect(first.total).toBe(2);
  expect(second.total).toBe(2);
  expect(first.items).toHaveLength(1);
  expect(second.items).toHaveLength(1);
  expect(first.items[0].id).not.toBe(second.items[0].id);
  expect(first.counts).toEqual({ pending: 3, approved: 1, rejected: 0 });
  const domain = await getAllFriendLinks(context, {
    status: "pending",
    search: "TWO.EXAMPLE.COM",
  });
  expect(domain.total).toBe(1);
  expect(domain.items[0].siteName).toBe("Notes %_ two");
});
