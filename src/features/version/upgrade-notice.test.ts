import { describe, expect, it } from "vitest";
import { decideUpgradeNotice, mayRecord } from "./upgrade-notice";

/** A notes file listing `entries`, given oldest first for readability. */
function file(
  ...entries: Array<{
    version: string;
    after?: Array<{ id: string; text: string }>;
  }>
) {
  return {
    versions: entries
      .map((entry) => ({ summary: `Notes for ${entry.version}.`, ...entry }))
      .reverse(),
  };
}

const NOTES = file(
  { version: "3.10.0" },
  { version: "3.11.0", after: [{ id: "a", text: "Do A." }] },
  { version: "3.12.0" },
  {
    version: "3.13.0",
    after: [
      { id: "b", text: "Do B." },
      { id: "c", text: "Do C." },
    ],
  },
);

function decide(acknowledged: string | null, running: string) {
  return decideUpgradeNotice({ acknowledged, running, file: NOTES });
}

describe("decideUpgradeNotice", () => {
  it("records the running version and shows nothing without a record", () => {
    expect(decide(null, "3.13.0")).toEqual({ record: "3.13.0", notice: null });
  });

  it("treats a stored value that is not a version as no record", () => {
    for (const stored of ["not-a-version", "", "3.12", "3.12.0.1"]) {
      expect(decide(stored, "3.13.0")).toEqual({
        record: "3.13.0",
        notice: null,
      });
    }
  });

  it("shows nothing when the record equals the running version", () => {
    expect(decide("3.13.0", "3.13.0")).toEqual({ record: null, notice: null });
  });

  it("shows the running version alone when the entry between has no item", () => {
    expect(decide("3.11.0", "3.12.0")).toEqual({
      record: null,
      notice: {
        version: "3.12.0",
        entries: [{ version: "3.12.0", summary: "Notes for 3.12.0." }],
      },
    });
  });

  it("lists the items of one version one behind", () => {
    expect(decide("3.12.0", "3.13.0").notice).toEqual({
      version: "3.13.0",
      entries: [
        {
          version: "3.13.0",
          summary: "Notes for 3.13.0.",
          after: [
            { id: "b", text: "Do B." },
            { id: "c", text: "Do C." },
          ],
        },
      ],
    });
  });

  it("merges the entries per version, oldest first, when several behind", () => {
    const { record, notice } = decide("3.10.0", "3.13.0");
    expect(record).toBeNull();
    expect(notice?.version).toBe("3.13.0");
    expect(notice?.entries.map((entry) => entry.version)).toEqual([
      "3.11.0",
      "3.12.0",
      "3.13.0",
    ]);
    expect(notice?.entries.map((entry) => entry.after?.length ?? 0)).toEqual([
      1, 0, 2,
    ]);
    // An entry without items keeps its summary only.
    expect(notice?.entries[1]).toEqual({
      version: "3.12.0",
      summary: "Notes for 3.12.0.",
    });
  });

  it("leaves out the entries at or before the record", () => {
    const { notice } = decide("3.11.0", "3.13.0");
    expect(notice?.entries.map((entry) => entry.version)).toEqual([
      "3.12.0",
      "3.13.0",
    ]);
  });

  it("reads an empty item list as no items", () => {
    const { notice } = decideUpgradeNotice({
      acknowledged: "3.0.0",
      running: "3.1.0",
      file: file({ version: "3.1.0", after: [] }),
    });
    expect(notice?.entries[0]).toEqual({
      version: "3.1.0",
      summary: "Notes for 3.1.0.",
    });
  });

  it("shows the running version alone when the file lists nothing between", () => {
    expect(
      decideUpgradeNotice({
        acknowledged: "3.0.0",
        running: "3.1.0",
        file: { versions: [] },
      }),
    ).toEqual({ record: null, notice: { version: "3.1.0", entries: [] } });
  });

  it("shows nothing and keeps the record when the record is newer (a rollback)", () => {
    expect(decide("3.13.0", "3.11.0")).toEqual({ record: null, notice: null });
    expect(decide("3.13.0", "3.13.0-beta.0")).toEqual({
      record: null,
      notice: null,
    });
  });

  it("follows semver for a prerelease running version", () => {
    // 3.13.0-beta.0 comes before 3.13.0, so the entry for 3.13.0 is not passed.
    expect(decide("3.12.0", "3.13.0-beta.0").notice).toEqual({
      version: "3.13.0-beta.0",
      entries: [],
    });
    // A record of the beta is older than the release.
    expect(
      decide("3.13.0-beta.0", "3.13.0").notice?.entries.map(
        (entry) => entry.version,
      ),
    ).toEqual(["3.13.0"]);
    expect(decide("3.13.0-beta.0", "3.13.0-beta.0").notice).toBeNull();
  });

  it("records and shows nothing when the running version is not a version", () => {
    expect(decide(null, "dev")).toEqual({ record: null, notice: null });
    expect(decide("3.12.0", "dev")).toEqual({ record: null, notice: null });
  });
});

describe("mayRecord", () => {
  it("allows a missing, invalid or older record", () => {
    expect(mayRecord(null, "3.13.0")).toBe(true);
    expect(mayRecord("garbage", "3.13.0")).toBe(true);
    expect(mayRecord("3.12.0", "3.13.0")).toBe(true);
  });

  it("refuses an equal or newer record, and a running version that is no version", () => {
    expect(mayRecord("3.13.0", "3.13.0")).toBe(false);
    expect(mayRecord("3.14.0", "3.13.0")).toBe(false);
    expect(mayRecord(null, "dev")).toBe(false);
  });
});
