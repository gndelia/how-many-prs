import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function createDb(url: string, authToken?: string) {
  return drizzle(createClient({ url, authToken }), { schema });
}

export type Db = ReturnType<typeof createDb>;

let shared: Db | undefined;

export function getDb(): Db {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url && process.env.VERCEL) throw new Error("TURSO_DATABASE_URL must be set on Vercel");
  shared ??= createDb(url ?? "file:local.db", process.env.TURSO_AUTH_TOKEN);
  return shared;
}
