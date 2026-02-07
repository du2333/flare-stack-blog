import { DurableObject } from "cloudflare:workers";
import type { Duration } from "@/lib/duration";
import { ms } from "@/lib/duration";

interface BucketState {
  tokens: number;
  lastRefill: number;
}

export type RateLimitOptions = {
  capacity: number;
  interval: Duration;
  cost?: number;
};

export class RateLimiter extends DurableObject {
  private state: BucketState;
  private CLEANUP_INTERVAL = ms("7d");

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.state = {
      tokens: 0,
      lastRefill: 0,
    };

    ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get<BucketState>("bucket");
      if (stored) {
        this.state = stored;
      }
    });
  }

  checkLimit({ capacity, interval, cost = 1 }: RateLimitOptions): {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
  } {
    if (cost > capacity) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: -1,
      };
    }

    const now = Date.now();
    const intervalMs = ms(interval);
    const rate = capacity / intervalMs;

    // 初始化
    if (this.state.lastRefill === 0) {
      this.state.lastRefill = now;
      this.state.tokens = capacity;
    }

    // 计算新令牌数（不立即更新状态）
    const timeSinceLastRefill = now - this.state.lastRefill;
    const tokensToAdd = timeSinceLastRefill * rate;
    const currentTokens = Math.min(capacity, this.state.tokens + tokensToAdd);

    // 检查是否有足够令牌
    if (currentTokens < cost) {
      return {
        allowed: false,
        remaining: Math.floor(currentTokens),
        retryAfterMs: Math.ceil((cost - currentTokens) / rate),
      };
    }

    // 允许请求，更新状态
    this.state.tokens = currentTokens - cost;
    this.state.lastRefill = now;
    this.ctx.waitUntil(
      Promise.all([
        this.ctx.storage.put("bucket", this.state),
        this.ctx.storage.setAlarm(now + this.CLEANUP_INTERVAL),
      ]),
    );

    return {
      allowed: true,
      remaining: Math.floor(this.state.tokens),
      retryAfterMs: 0,
    };
  }

  // 清理不活跃的数据
  async alarm() {
    const now = Date.now();
    if (now - this.state.lastRefill > this.CLEANUP_INTERVAL) {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
    } else {
      await this.ctx.storage.setAlarm(now + this.CLEANUP_INTERVAL);
    }
  }
}
