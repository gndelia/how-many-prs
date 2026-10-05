import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { memoryLock, redisLock, type Lock } from "./lock";

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;

const limiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 m"), prefix: "lookup" })
  : null;

export async function allowLookup(ip: string): Promise<boolean> {
  if (!limiter) return true;
  return (await limiter.limit(ip)).success;
}

export const fetchLock: Lock = redis ? redisLock(redis) : memoryLock();
