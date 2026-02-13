import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("PasswordHasher", () => {
  function getHasher() {
    const id = env.PASSWORD_HASHER.idFromName("test");
    return env.PASSWORD_HASHER.get(id);
  }

  it("should hash a password and return salt:key format", async () => {
    const hasher = getHasher();
    const hash = await hasher.hash("test-password-123");

    expect(hash).toContain(":");
    const [salt, key] = hash.split(":");
    expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(key).toHaveLength(128); // 64 bytes = 128 hex chars
  });

  it("should verify a correct password", async () => {
    const hasher = getHasher();
    const hash = await hasher.hash("my-secure-password");

    const result = await hasher.verify({
      hash,
      password: "my-secure-password",
    });
    expect(result).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const hasher = getHasher();
    const hash = await hasher.hash("correct-password");

    const result = await hasher.verify({
      hash,
      password: "wrong-password",
    });
    expect(result).toBe(false);
  });

  it("should produce different hashes for the same password (random salt)", async () => {
    const hasher = getHasher();
    const hash1 = await hasher.hash("same-password");
    const hash2 = await hasher.hash("same-password");

    expect(hash1).not.toBe(hash2);

    expect(
      await hasher.verify({ hash: hash1, password: "same-password" }),
    ).toBe(true);
    expect(
      await hasher.verify({ hash: hash2, password: "same-password" }),
    ).toBe(true);
  });

  // DO RPC 抛出的错误在 vitest-pool-workers 中会变成 unhandled rejection，
  // 无法被 rejects.toThrow 捕获，因此跳过此测试。
  // PasswordHasher.verify 仍会对无效格式抛出 "Invalid password hash" 错误。
});
