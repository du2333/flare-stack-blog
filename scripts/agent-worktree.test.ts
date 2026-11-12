import { describe, expect, it } from "vitest";
import { mainCheckoutOf, withAuthUrl } from "./agent-worktree.ts";

describe("withAuthUrl", () => {
  it("replaces the existing line and leaves the rest alone", () => {
    const content = "A=1\nBETTER_AUTH_URL=http://localhost:3000\nB=2\n";
    expect(withAuthUrl(content, 3506)).toBe(
      "A=1\nBETTER_AUTH_URL=http://localhost:3506\nB=2\n",
    );
  });

  it("appends the line when it is missing", () => {
    expect(withAuthUrl("A=1", 3506)).toBe(
      "A=1\nBETTER_AUTH_URL=http://localhost:3506\n",
    );
  });
});

describe("mainCheckoutOf", () => {
  it("is the first worktree entry", () => {
    const porcelain =
      "worktree /repo\nHEAD abc\nbranch refs/heads/dev\n\nworktree /repo/.claude/worktrees/a\nHEAD def\n";
    expect(mainCheckoutOf(porcelain)).toBe("/repo");
  });
});
