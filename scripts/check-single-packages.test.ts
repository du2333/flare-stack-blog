import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkSinglePackages, CURE } from "./check-single-packages.ts";

let root: string;
let nodeModules: string;

function pkg(...segments: Array<string>) {
  const dir = path.join(nodeModules, ...segments);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "package.json"), "{}");
  return dir;
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "single-packages-"));
  nodeModules = path.join(root, "node_modules");
  mkdirSync(nodeModules);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("checkSinglePackages", () => {
  it("passes when each package exists once at the top", () => {
    pkg("@tanstack", "react-router");
    pkg("@tanstack", "router-core");
    pkg("react");
    pkg("react-dom");
    pkg("@tanstack", "react-start");
    expect(checkSinglePackages(nodeModules)).toBeUndefined();
  });

  it("passes when a nested node_modules holds only other packages", () => {
    pkg("@tanstack", "router-plugin", "node_modules", "chokidar");
    expect(checkSinglePackages(nodeModules)).toBeUndefined();
  });

  it("passes without a node_modules folder", () => {
    expect(checkSinglePackages(path.join(root, "missing"))).toBeUndefined();
  });

  it("fails on a second @tanstack/react-router under a scoped package and gives the cure", () => {
    pkg("@tanstack", "react-router");
    pkg(
      "@tanstack",
      "react-start",
      "node_modules",
      "@tanstack",
      "react-router",
    );
    const message = checkSinglePackages(nodeModules) ?? "";
    expect(message).toContain(
      path.join(
        "node_modules",
        "@tanstack",
        "react-start",
        "node_modules",
        "@tanstack",
        "react-router",
      ),
    );
    expect(message).toContain(CURE);
  });

  it("finds nested copies of react and react-dom under an unscoped package", () => {
    pkg("some-lib", "node_modules", "react");
    pkg("some-lib", "node_modules", "react-dom");
    const message = checkSinglePackages(nodeModules) ?? "";
    expect(message).toContain(path.join("some-lib", "node_modules", "react"));
    expect(message).toContain(
      path.join("some-lib", "node_modules", "react-dom"),
    );
  });

  it("finds a copy nested two levels deep", () => {
    pkg("a", "node_modules", "b", "node_modules", "@tanstack", "router-core");
    expect(checkSinglePackages(nodeModules)).toContain("router-core");
  });
});
