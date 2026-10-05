import type { Redis } from "@upstash/redis";

export type Lock = {
  acquire(key: string, ttlMs: number): Promise<boolean>;
  release(key: string): Promise<void>;
};

export function memoryLock(now: () => number = Date.now): Lock {
  const held = new Map<string, number>();
  return {
    async acquire(key, ttlMs) {
      const until = held.get(key);
      if (until !== undefined && until > now()) return false;
      held.set(key, now() + ttlMs);
      return true;
    },
    async release(key) {
      held.delete(key);
    },
  };
}

export function redisLock(redis: Redis): Lock {
  return {
    async acquire(key, ttlMs) {
      return (await redis.set(`lock:${key}`, "1", { nx: true, px: ttlMs })) === "OK";
    },
    async release(key) {
      await redis.del(`lock:${key}`);
    },
  };
}
