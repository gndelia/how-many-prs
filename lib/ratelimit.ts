import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { memoryLock, redisLock, type Lock } from "./lock";

const url = process.env.UPSTASH_KV_REST_API_URL;
const token = process.env.UPSTASH_KV_REST_API_TOKEN;
// @upstash/redis defaults to cache: "no-store", which throws DYNAMIC_SERVER_USAGE inside ISR renders.
const redis = url && token ? new Redis({ url, token, cache: "default" }) : null;
if (!redis && process.env.VERCEL) throw new Error("UPSTASH_KV_REST_API_URL and UPSTASH_KV_REST_API_TOKEN must be set on Vercel");

const limiter = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 m"), prefix: "lookup" }) : null;

export async function allowNewLookup(): Promise<boolean> {
  if (!limiter) return true;
  return (await limiter.limit("global")).success;
}

export const fetchLock: Lock = redis ? redisLock(redis) : memoryLock();
