import { describe, expect, it } from "vitest";
import {
  ALL_FEATURE_KEYS,
  enabledFeatures,
  isFeatureEnabled,
  requireFeature,
} from "@/features/config/features";

/**
 * C2 验收测试：板块功能开关
 *
 * 对应 R2 条件 C2「开关真实生效」：
 *   - false → 导航隐藏 + 路由 404
 *   - true  → 可见可访问
 *
 * 这里覆盖纯逻辑层；导航渲染与路由 404 由 e2e/构建产物验证。
 */

const OFF = { features: { moments: false, library: false, about: false } };
const ON = { features: { moments: true, library: true, about: true } };
const MIXED = { features: { moments: true, library: false, about: true } };

describe("isFeatureEnabled", () => {
  it("全部关闭时返回 false", () => {
    for (const key of ALL_FEATURE_KEYS) {
      expect(isFeatureEnabled(OFF, key)).toBe(false);
    }
  });

  it("全部开启时返回 true", () => {
    for (const key of ALL_FEATURE_KEYS) {
      expect(isFeatureEnabled(ON, key)).toBe(true);
    }
  });

  it("混合状态按各自取值", () => {
    expect(isFeatureEnabled(MIXED, "moments")).toBe(true);
    expect(isFeatureEnabled(MIXED, "library")).toBe(false);
    expect(isFeatureEnabled(MIXED, "about")).toBe(true);
  });

  it("配置缺失时 fail-closed 返回 false", () => {
    expect(isFeatureEnabled(undefined, "moments")).toBe(false);
    expect(isFeatureEnabled(null, "moments")).toBe(false);
    expect(isFeatureEnabled({} as never, "moments")).toBe(false);
    expect(isFeatureEnabled({ features: {} } as never, "moments")).toBe(false);
  });

  it("非布尔真值不被视为开启", () => {
    const weird = { features: { moments: "yes", library: 1, about: 0 } };
    expect(isFeatureEnabled(weird as never, "moments")).toBe(false);
    expect(isFeatureEnabled(weird as never, "library")).toBe(false);
    expect(isFeatureEnabled(weird as never, "about")).toBe(false);
  });
});

describe("enabledFeatures", () => {
  it("全关返回空数组", () => {
    expect(enabledFeatures(OFF)).toEqual([]);
  });

  it("全开返回全部 key", () => {
    expect(enabledFeatures(ON)).toEqual([...ALL_FEATURE_KEYS]);
  });

  it("混合状态只返回开启项，且顺序稳定", () => {
    expect(enabledFeatures(MIXED)).toEqual(["moments", "about"]);
  });

  it("缺失配置返回空数组", () => {
    expect(enabledFeatures(undefined)).toEqual([]);
  });
});

describe("requireFeature", () => {
  it("开启时正常返回", () => {
    expect(() => requireFeature(ON, "moments")).not.toThrow();
  });

  it("关闭时抛出 notFound", () => {
    expect(() => requireFeature(OFF, "moments")).toThrow();
  });

  it("抛出的错误可被识别为 not found", () => {
    try {
      requireFeature(OFF, "library");
      throw new Error("应当抛出");
    } catch (err) {
      const e = err as { isNotFound?: boolean; status?: number };
      // TanStack Router 的 notFound() 会带 isNotFound 标记
      expect(e.isNotFound === true || String(e).includes("Not Found")).toBe(
        true,
      );
    }
  });

  it("混合配置下各板块独立判定", () => {
    expect(() => requireFeature(MIXED, "moments")).not.toThrow();
    expect(() => requireFeature(MIXED, "library")).toThrow();
    expect(() => requireFeature(MIXED, "about")).not.toThrow();
  });
});
