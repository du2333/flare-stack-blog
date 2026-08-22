import { describe, expect, it } from "vitest";
import { fallbackCodeHtml } from "./content";

describe("fallbackCodeHtml", () => {
  it("escapes markup in fallback HTML", () => {
    expect(fallbackCodeHtml(`<img src=x onerror=alert(1)>`)).toBe(
      `<pre><code>&lt;img src=x onerror=alert(1)&gt;</code></pre>`,
    );
  });
});
