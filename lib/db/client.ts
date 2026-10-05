import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function createDb(url: string, authToken?: string) {
  return drizzle(createClient({ url, authToken }), { schema });
}

export type Db = ReturnType<typeof createDb>;

let shared: Db | undefined;

export function getDb(): Db {
  shared ??= createDb(process.env.TURSO_DATABASE_URL ?? "file:local.db", process.env.TURSO_AUTH_TOKEN);
  return shared;
}
