import { and, asc, count, desc, eq, gt, gte, lt, ne, notInArray } from "drizzle-orm";
import type { Db } from "./db/client";
import { meta, users, type UserRow } from "./db/schema";
import { countMerged, fetchDetails, fetchFast, type Gql, windowFor } from "./github";
import type { Lock } from "./lock";

const HOUR = 3_600_000;
export const STALE_MS = 12 * HOUR;
export const MISSING_TTL_MS = 24 * HOUR;
export const REFRESH_AFTER_MS = HOUR;
const LOCK_TTL_MS = 20_000;
const DETAILS_LOCK_TTL_MS = 60_000;
const WAIT_STEP_MS = 400;
const WAIT_STEPS = 10;

export type Deps = {
  db: Db;
  gql: Gql;
  lock: Lock;
  now?: () => Date;
  allowFetch?: () => Promise<boolean>;
  sleep?: (ms: number) => Promise<void>;
};

export class FetchNotAllowedError extends Error {
  constructor() {
    super("Too many new lookups. Try again in a minute.");
  }
}

const clock = (d: Deps) => (d.now ?? (() => new Date()))();
const sleep = (d: Deps, ms: number) => (d.sleep ?? ((t) => new Promise<void>((r) => setTimeout(r, t))))(ms);

export function isFresh(row: UserRow, now: Date) {
  const ttl = row.status === "ok" ? STALE_MS : MISSING_TTL_MS;
  return now.getTime() - row.fetchedAt.getTime() < ttl;
}

export function refreshAvailableAt(row: UserRow) {
  return new Date(row.fetchedAt.getTime() + REFRESH_AFTER_MS);
}

async function read(db: Db, login: string) {
  return (await db.select().from(users).where(eq(users.login, login)).limit(1))[0];
}

async function fetchAndStore(d: Deps, login: string): Promise<UserRow> {
  const now = clock(d);
  const range = windowFor(now);
  const fast = await fetchFast(d.gql, login, range);
  const row: UserRow = {
    login,
    displayLogin: fast.owner.kind === "missing" ? login : fast.owner.login,
    status: fast.owner.kind === "user" ? "ok" : fast.owner.kind,
    avatarUrl: fast.owner.kind === "user" ? fast.owner.avatarUrl : null,
    mergedCount: fast.count,
    windowStart: range.since,
    fetchedAt: now,
    titles: fast.titles,
    details: null,
    detailsAt: null,
  };
  await d.db.insert(users).values(row).onConflictDoUpdate({ target: users.login, set: { ...row, login: undefined } });
  return row;
}

export async function getSnapshot(d: Deps, rawLogin: string, opts: { force?: boolean } = {}): Promise<UserRow> {
  const login = rawLogin.toLowerCase();
  const existing = await read(d.db, login);
  if (existing && !opts.force && isFresh(existing, clock(d))) return existing;

  if (d.allowFetch && !(await d.allowFetch())) {
    if (existing) return existing;
    throw new FetchNotAllowedError();
  }

  const key = `fetch:${login}`;
  if (!(await d.lock.acquire(key, LOCK_TTL_MS))) {
    for (let i = 0; i < WAIT_STEPS; i++) {
      await sleep(d, WAIT_STEP_MS);
      const row = await read(d.db, login);
      if (row && (!existing || row.fetchedAt > existing.fetchedAt)) return row;
    }
    if (existing) return existing;
  }
  try {
    return await fetchAndStore(d, login);
  } finally {
    await d.lock.release(key);
  }
}

export async function refresh(d: Deps, rawLogin: string): Promise<{ ok: true; row: UserRow } | { ok: false; retryAt: Date }> {
  const row = await read(d.db, rawLogin.toLowerCase());
  if (row && clock(d) < refreshAvailableAt(row)) return { ok: false, retryAt: refreshAvailableAt(row) };
  return { ok: true, row: await getSnapshot(d, rawLogin, { force: true }) };
}

const freshDetails = (row: UserRow | undefined) => (row?.details && row.detailsAt && row.detailsAt >= row.fetchedAt ? row.details : null);

export async function ensureDetails(d: Deps, rawLogin: string) {
  const login = rawLogin.toLowerCase();
  const row = await read(d.db, login);
  if (!row || row.status !== "ok") return null;
  const cached = freshDetails(row);
  if (cached) return cached;

  const key = `details:${login}`;
  if (!(await d.lock.acquire(key, DETAILS_LOCK_TTL_MS))) {
    for (let i = 0; i < WAIT_STEPS; i++) {
      await sleep(d, WAIT_STEP_MS);
      const details = freshDetails(await read(d.db, login));
      if (details) return details;
    }
    return "busy";
  }
  try {
    const details = await fetchDetails(d.gql, login, { since: row.windowStart, until: row.fetchedAt });
    await d.db.update(users).set({ details, detailsAt: clock(d) }).where(eq(users.login, login));
    return details;
  } finally {
    await d.lock.release(key);
  }
}

export const HIDDEN_LOGINS = ["poteto"];

const listed = () => and(eq(users.status, "ok"), notInArray(users.login, HIDDEN_LOGINS));

export async function rank(db: Db, mergedCount: number) {
  const ok = listed();
  const [ahead] = await db.select({ n: count() }).from(users).where(and(ok, gt(users.mergedCount, mergedCount)));
  const [total] = await db.select({ n: count() }).from(users).where(ok);
  return { rank: ahead.n + 1, total: total.n };
}

export async function closest(db: Db, rawLogin: string, mergedCount: number, n = 5) {
  const login = rawLogin.toLowerCase();
  const base = and(listed(), ne(users.login, login));
  const cols = { login: users.displayLogin, mergedCount: users.mergedCount };
  const above = await db.select(cols).from(users).where(and(base, gte(users.mergedCount, mergedCount))).orderBy(asc(users.mergedCount)).limit(n);
  const below = await db.select(cols).from(users).where(and(base, lt(users.mergedCount, mergedCount))).orderBy(desc(users.mergedCount)).limit(n);
  return [...above, ...below]
    .sort((a, b) => Math.abs(a.mergedCount - mergedCount) - Math.abs(b.mergedCount - mergedCount))
    .slice(0, n)
    .sort((a, b) => b.mergedCount - a.mergedCount);
}

export async function recent(db: Db, limit = 8) {
  return db
    .select({ login: users.displayLogin, mergedCount: users.mergedCount, avatarUrl: users.avatarUrl })
    .from(users)
    .where(listed())
    .orderBy(desc(users.fetchedAt))
    .limit(limit);
}

export async function botCount(d: Deps, app: string): Promise<number | null> {
  const [row] = await d.db.select().from(meta).where(eq(meta.key, app)).limit(1);
  const cached = row ? Number(row.value) : null;
  const now = clock(d);
  if (row && now.getTime() - row.updatedAt.getTime() < STALE_MS) return cached;
  if (!(await d.lock.acquire(`fetch:${app}`, LOCK_TTL_MS))) return cached;
  try {
    const value = await countMerged(d.gql, `app/${app}`, windowFor(now));
    await d.db
      .insert(meta)
      .values({ key: app, value: String(value), updatedAt: now })
      .onConflictDoUpdate({ target: meta.key, set: { value: String(value), updatedAt: now } });
    return value;
  } catch (error) {
    console.error(`Could not count merged PRs for ${app}`, error);
    return cached;
  } finally {
    await d.lock.release(`fetch:${app}`);
  }
}

export const dependabotCount = (d: Deps) => botCount(d, "dependabot");
