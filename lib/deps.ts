import "server-only";
import { getDb } from "./db/client";
import { createGql } from "./github";
import { allowNewLookup, fetchLock } from "./ratelimit";
import type { Deps } from "./snapshot";

let shared: Deps | undefined;

export function deps(): Deps {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  shared ??= { db: getDb(), gql: createGql(token), lock: fetchLock, allowFetch: allowNewLookup };
  return shared;
}
