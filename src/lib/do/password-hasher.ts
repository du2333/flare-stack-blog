/**
 * 将密码哈希计算移至 Durable Object，避免 Workers 10ms CPU 超时
 * DO 有 30 秒 CPU 时间限制，完全足够 scrypt 计算
 */

import { DurableObject } from "cloudflare:workers";
import { hex } from "@better-auth/utils/hex";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { hexToBytes } from "@noble/hashes/utils.js";

// 既然CPU时间充足，我们就用better-auth默认的配置
const SCRYPT_CONFIG = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
};

/**
 * 使用恒定时间比较两个缓冲区，防止时序攻击
 */
function constantTimeEqual(
  a: ArrayBuffer | Uint8Array,
  b: ArrayBuffer | Uint8Array,
): boolean {
  const aBuffer = new Uint8Array(a);
  const bBuffer = new Uint8Array(b);
  let c = aBuffer.length ^ bBuffer.length;
  const length = Math.max(aBuffer.length, bBuffer.length);
  for (let i = 0; i < length; i++) {
    c |=
      (i < aBuffer.length ? aBuffer[i] : 0) ^
      (i < bBuffer.length ? bBuffer[i] : 0);
  }
  return c === 0;
}

async function generateKey(password: string, salt: string) {
  return await scryptAsync(password.normalize("NFKC"), salt, {
    N: SCRYPT_CONFIG.N,
    p: SCRYPT_CONFIG.p,
    r: SCRYPT_CONFIG.r,
    dkLen: SCRYPT_CONFIG.dkLen,
    maxmem: 128 * SCRYPT_CONFIG.N * SCRYPT_CONFIG.r * 2,
  });
}

export class PasswordHasher extends DurableObject {
  async hash(password: string): Promise<string> {
    const salt = hex.encode(crypto.getRandomValues(new Uint8Array(16)));
    const key = await generateKey(password, salt);
    return `${salt}:${hex.encode(key)}`;
  }

  async verify({
    hash,
    password,
  }: {
    hash: string;
    password: string;
  }): Promise<boolean> {
    const [salt, key] = hash.split(":");
    if (!salt || !key) {
      throw new Error("Invalid password hash");
    }
    const targetKey = await generateKey(password, salt);
    return constantTimeEqual(targetKey, hexToBytes(key));
  }
}
