// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { m } from "@/paraglide/messages";
import { statusFilterToApi } from "./post-manager/types";
import {
  postStateLabel,
  postStateOf,
  publishActionLabel,
  type PostState,
} from "./post-state";
import { PostStatusBadge } from "./post-status-badge";

afterEach(cleanup);

describe("postStateOf", () => {
  it("tells a draft, a published post and a published post with changes apart", () => {
    expect(
      postStateOf({ published: false, hasUnpublishedChanges: false }),
    ).toBe("draft");
    expect(postStateOf({ published: true, hasUnpublishedChanges: false })).toBe(
      "published",
    );
    expect(postStateOf({ published: true, hasUnpublishedChanges: true })).toBe(
      "published-changed",
    );
  });

  it("never reports changes for a draft", () => {
    expect(postStateOf({ published: false, hasUnpublishedChanges: true })).toBe(
      "draft",
    );
  });
});

describe("the wording of each state", () => {
  const states: Array<[PostState, string, string]> = [
    ["draft", m.admin_posts_status_draft(), m.editor_header_publish()],
    [
      "published",
      m.admin_posts_status_published(),
      m.editor_header_republish(),
    ],
    [
      "published-changed",
      m.admin_posts_status_published_changed(),
      m.editor_header_publish_changes(),
    ],
  ];

  it.each(states)(
    "%s reads the same in the badge and as a label",
    (state, label, action) => {
      expect(postStateLabel(state)).toBe(label);
      expect(publishActionLabel(state)).toBe(action);
      render(createElement(PostStatusBadge, { state }));
      expect(screen.getByText(label)).toBeDefined();
    },
  );

  it("writes a published Post as plain text when quiet, and keeps the chip for the rest", () => {
    const { container } = render(
      createElement(PostStatusBadge, { state: "published", quiet: true }),
    );
    expect(screen.getByText(m.admin_posts_status_published())).toBeDefined();
    expect(container.querySelector(".fuwari-badge")).toBeNull();
    cleanup();
    for (const state of ["draft", "published-changed"] as const) {
      const view = render(
        createElement(PostStatusBadge, { state, quiet: true }),
      );
      expect(view.container.querySelector(".fuwari-badge")).not.toBeNull();
      cleanup();
    }
  });

  it("gives the three states three different publish labels", () => {
    expect(new Set(states.map(([, , action]) => action)).size).toBe(3);
  });
});

describe("statusFilterToApi", () => {
  it("sends the changed filter as the server's own filter, not a status", () => {
    expect(statusFilterToApi("ALL")).toEqual({});
    expect(statusFilterToApi("PUBLISHED")).toEqual({ status: "published" });
    expect(statusFilterToApi("DRAFT")).toEqual({ status: "draft" });
    expect(statusFilterToApi("CHANGED")).toEqual({
      hasUnpublishedChanges: true,
    });
  });
});
