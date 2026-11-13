import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PLACEHOLDER_D1_ID,
  chooseDatabase,
  configuredD1Id,
  d1FileName,
  type DatabaseFile,
} from "./local-d1-file";

describe("d1FileName", () => {
  it("names the file the dev server writes for the placeholder id", () => {
    // Read off a dev server's state directory: of the three copies of the
    // sample data, this is the one whose WAL moved while the server ran.
    expect(d1FileName(PLACEHOLDER_D1_ID)).toBe(
      "faaf2b0445ab934c3aac48ddf0cdfade8f9bac050be98993748742cdd2cb05fb.sqlite",
    );
  });

  it("gives another database id another file", () => {
    const other = d1FileName("11111111-2222-4333-8444-555555555555");
    expect(other).toMatch(/^[0-9a-f]{64}\.sqlite$/);
    expect(other).not.toBe(d1FileName(PLACEHOLDER_D1_ID));
  });
});

describe("chooseDatabase", () => {
  const file = (
    name: string,
    hasPosts: boolean,
    lastWrite: number,
  ): DatabaseFile => ({ name, hasPosts, lastWrite });
  const own = d1FileName(PLACEHOLDER_D1_ID);

  it("takes the file of the configured id, whatever the other files hold", () => {
    // The empty database that a ticket once hit: another copy has posts and
    // was written last, and still is not the dev server's.
    const chosen = chooseDatabase(
      [file("a.sqlite", true, 900), file(own, true, 100)],
      PLACEHOLDER_D1_ID,
    );
    expect(chosen.name).toBe(own);
    expect(chosen.why).toBe("the configured D1 id");
  });

  it("refuses the configured file when it has no posts table", () => {
    expect(() =>
      chooseDatabase(
        [file("a.sqlite", true, 900), file(own, false, 100)],
        PLACEHOLDER_D1_ID,
      ),
    ).toThrow(/no posts table/);
  });

  it("falls back to the newest file with posts when the configured one is missing, and says so", () => {
    const chosen = chooseDatabase(
      [
        file("old.sqlite", true, 100),
        file("new.sqlite", true, 500),
        file("empty.sqlite", false, 900),
      ],
      PLACEHOLDER_D1_ID,
    );
    expect(chosen.name).toBe("new.sqlite");
    expect(chosen.why).toContain(`${own} does not exist`);
  });

  it("throws when no file has posts", () => {
    expect(() =>
      chooseDatabase([file("a.sqlite", false, 1)], PLACEHOLDER_D1_ID),
    ).toThrow(/posts table/);
  });
});

describe("configuredD1Id", () => {
  it("is D1_DATABASE_ID, trimmed, else the placeholder", () => {
    expect(configuredD1Id({ D1_DATABASE_ID: " abc " })).toBe("abc");
    expect(configuredD1Id({ D1_DATABASE_ID: "  " })).toBe(PLACEHOLDER_D1_ID);
    expect(configuredD1Id({})).toBe(PLACEHOLDER_D1_ID);
  });

  it("falls back to the id cloudflare.config.ts falls back to", () => {
    const config = readFileSync("cloudflare.config.ts", "utf8");
    expect(config).toContain(`|| "${PLACEHOLDER_D1_ID}"`);
  });
});
