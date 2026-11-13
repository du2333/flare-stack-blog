import { describe, expect, it } from "vitest";
import {
  findNamespaceUses,
  readSources,
} from "./check-messages-static-access.ts";

/**
 * Files that still pass the whole messages object around (friend-links.schema.ts
 * takes it as a parameter, these three hand it over). This list goes once the
 * friend-links schema and its callers read `m.<name>` themselves; a file
 * listed here that no longer needs it fails the test, so its entry is removed
 * then.
 */
const ALLOWLIST = new Set([
  "src/features/friend-links/friend-links.schema.test.ts",
  "src/features/friend-links/hooks/use-friend-link-submit-form.ts",
  "src/features/friend-links/components/admin/friend-link-manager/friend-link-form-dialog.tsx",
]);

const IMPORT = `import { m } from "@/paraglide/messages";\n`;

function uses(text: string) {
  return findNamespaceUses({ "src/a.tsx": text });
}

describe("findNamespaceUses", () => {
  it("accepts property access, including calls and type queries", () => {
    expect(
      uses(`${IMPORT}
        export const a = m.hello({ name: "x" });
        export const b = m?.hello;
        export type T = typeof m.hello;
        export const C = () => <p>{m.hello()}</p>;`),
    ).toEqual([]);
  });

  it("flags passing, assigning, spreading, indexing and typeof m", () => {
    const found = uses(`${IMPORT}
      declare function f(x: unknown): void;
      f(m);
      export const a = m;
      export const b = { ...m };
      export const c = m["hello"];
      export type T = typeof m;
      export const d = { m };`);
    expect(found).toHaveLength(6);
  });

  it("follows an alias and a namespace import", () => {
    expect(
      findNamespaceUses({
        "src/a.ts": `import { m as msgs } from "@/paraglide/messages";\nexport const a = [msgs];`,
        "src/b.ts": `import * as all from "@/paraglide/messages";\nexport const b = all;`,
      }),
    ).toHaveLength(2);
  });

  it("ignores a local m that shadows the import", () => {
    expect(
      uses(`${IMPORT}
        export const a = [1].map((m) => m + 1);
        export const b = (m: number) => m;`),
    ).toEqual([]);
  });

  it("ignores files that do not import the messages", () => {
    expect(uses(`export const a = (m: number) => m;`)).toEqual([]);
  });
});

describe("src", () => {
  it("reads messages as m.<name> only, outside the allowlist", () => {
    const found = findNamespaceUses(readSources());
    const files = new Set(found.map((line) => line.split(":")[0]));

    const unexpected = found.filter(
      (line) => !ALLOWLIST.has(line.split(":")[0]),
    );
    expect(
      unexpected,
      "the messages object must not be passed around; call m.<name>() where the text is needed",
    ).toEqual([]);

    const stale = [...ALLOWLIST].filter((file) => !files.has(file));
    expect(stale, "converted already: remove from ALLOWLIST").toEqual([]);
  });
});
