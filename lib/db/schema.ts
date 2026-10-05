import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    login: text("login").primaryKey(),
    displayLogin: text("display_login").notNull(),
    status: text("status", { enum: ["ok", "org", "missing"] }).notNull(),
    avatarUrl: text("avatar_url"),
    mergedCount: integer("merged_count").notNull().default(0),
    windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
    titles: text("titles", { mode: "json" }).$type<string[]>().notNull().default([]),
    details: text("details", { mode: "json" }).$type<{
      perDay: number[];
      topRepo: { name: string; count: number } | null;
      additions: number;
      deletions: number;
      titles: string[];
    }>(),
    detailsAt: integer("details_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("users_merged_count").on(t.status, t.mergedCount), index("users_fetched_at").on(t.status, t.fetchedAt)],
);

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export type UserRow = typeof users.$inferSelect;
