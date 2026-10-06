import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "./db/client";
import type { Gql } from "./github";
import { memoryLock } from "./lock";
import { botCount, closest, dependabotCount, ensureDetails, FetchNotAllowedError, getSnapshot, rank, recent, refresh, type Deps } from "./snapshot";

const T0 = new Date("2026-10-05T12:00:00Z");
const HOUR = 3_600_000;

let dir: string;
let db: Db;
let now: Date;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "hmp-"));
  db = createDb(`file:${join(dir, "test.db")}`);
  await migrate(db, { migrationsFolder: "drizzle" });
  now = T0;
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

type Owner = { __typename: string; login: string; avatarUrl: string } | null;

function github(owners: Record<string, { owner: Owner; count?: number }>) {
  const calls: string[] = [];
  const gql = (async (query: string, vars: Record<string, unknown>) => {
    if (query.includes("query Fast")) {
      const login = vars.login as string;
      calls.push(`fast:${login}`);
      const o = owners[login];
      return { repositoryOwner: o.owner, search: { issueCount: o.count ?? 0, nodes: [{ title: `pr by ${login}` }] } };
    }
    if (query.includes("query Count")) {
      calls.push("count");
      return { search: { issueCount: 960629 } };
    }
    calls.push("page");
    return {
      search: {
        issueCount: 1,
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [{ title: "only", mergedAt: "2026-10-01T00:00:00Z", additions: 3, deletions: 1, repository: { nameWithOwner: "a/b" } }],
      },
    };
  }) as Gql;
  return { gql, calls };
}

const user = (login: string, count: number) => ({ owner: { __typename: "User", login, avatarUrl: `https://a/${login}` }, count });

function deps(gql: Gql, extra: Partial<Deps> = {}): Deps {
  return { db, gql, lock: memoryLock(() => now.getTime()), now: () => now, sleep: async () => {}, ...extra };
}

describe("getSnapshot", () => {
  it("fetches once and serves the cached row for 12 hours", async () => {
    const gh = github({ hjsimpson: user("HJSimpson", 37) });
    const d = deps(gh.gql);
    const first = await getSnapshot(d, "HJSimpson");
    expect(first).toMatchObject({ login: "hjsimpson", displayLogin: "HJSimpson", status: "ok", mergedCount: 37, titles: ["pr by hjsimpson"] });
    now = new Date(T0.getTime() + 11 * HOUR);
    await getSnapshot(d, "hjsimpson");
    expect(gh.calls).toEqual(["fast:hjsimpson"]);
    now = new Date(T0.getTime() + 12 * HOUR);
    await getSnapshot(d, "hjsimpson");
    expect(gh.calls).toEqual(["fast:hjsimpson", "fast:hjsimpson"]);
  });

  it("caches organizations and missing users for 24 hours", async () => {
    const gh = github({ vercel: { owner: { __typename: "Organization", login: "vercel", avatarUrl: "" } }, hjsimpsn: { owner: null } });
    const d = deps(gh.gql);
    expect((await getSnapshot(d, "vercel")).status).toBe("org");
    expect((await getSnapshot(d, "hjsimpsn")).status).toBe("missing");
    now = new Date(T0.getTime() + 23 * HOUR);
    await getSnapshot(d, "vercel");
    await getSnapshot(d, "hjsimpsn");
    expect(gh.calls).toHaveLength(2);
  });

  it("refuses a new lookup when the rate limit is reached, but serves a stale row", async () => {
    const gh = github({ hjsimpson: user("hjsimpson", 37) });
    await getSnapshot(deps(gh.gql), "hjsimpson");
    now = new Date(T0.getTime() + 13 * HOUR);
    const limited = deps(gh.gql, { allowFetch: async () => false });
    expect((await getSnapshot(limited, "hjsimpson")).mergedCount).toBe(37);
    await expect(getSnapshot(limited, "newcomer")).rejects.toBeInstanceOf(FetchNotAllowedError);
    expect(gh.calls).toEqual(["fast:hjsimpson"]);
  });

  it("waits for another request that holds the fetch lock", async () => {
    const gh = github({ hjsimpson: user("hjsimpson", 37) });
    const lock = memoryLock(() => now.getTime());
    await lock.acquire("fetch:hjsimpson", 20_000);
    let polls = 0;
    const d = deps(gh.gql, {
      lock,
      sleep: async () => {
        if (++polls === 2) await getSnapshot(deps(gh.gql), "hjsimpson");
      },
    });
    expect((await getSnapshot(d, "hjsimpson")).mergedCount).toBe(37);
    expect(gh.calls).toEqual(["fast:hjsimpson"]);
  });
});

describe("refresh", () => {
  it("is available only one hour after the last fetch", async () => {
    const gh = github({ hjsimpson: user("hjsimpson", 37) });
    const d = deps(gh.gql);
    await getSnapshot(d, "hjsimpson");
    now = new Date(T0.getTime() + 30 * 60_000);
    expect(await refresh(d, "hjsimpson")).toEqual({ ok: false, retryAt: new Date(T0.getTime() + HOUR) });
    now = new Date(T0.getTime() + HOUR);
    expect((await refresh(d, "hjsimpson")).ok).toBe(true);
    expect(gh.calls).toEqual(["fast:hjsimpson", "fast:hjsimpson"]);
  });
});

describe("ensureDetails", () => {
  it("waits for another request that holds the details lock", async () => {
    const gh = github({ hjsimpson: user("hjsimpson", 37) });
    const lock = memoryLock(() => now.getTime());
    await getSnapshot(deps(gh.gql), "hjsimpson");
    await lock.acquire("details:hjsimpson", 60_000);
    let polls = 0;
    const d = deps(gh.gql, {
      lock,
      sleep: async () => {
        if (++polls === 2) await ensureDetails(deps(gh.gql), "hjsimpson");
      },
    });
    expect(await ensureDetails(d, "hjsimpson")).toMatchObject({ additions: 3 });
    expect(gh.calls).toEqual(["fast:hjsimpson", "page"]);
  });

  it("reports busy when the details lock holder does not finish", async () => {
    const gh = github({ hjsimpson: user("hjsimpson", 37) });
    const lock = memoryLock(() => now.getTime());
    await getSnapshot(deps(gh.gql), "hjsimpson");
    await lock.acquire("details:hjsimpson", 60_000);
    expect(await ensureDetails(deps(gh.gql, { lock }), "hjsimpson")).toBe("busy");
    expect(gh.calls).toEqual(["fast:hjsimpson"]);
  });

  it("fetches details once per snapshot", async () => {
    const gh = github({ hjsimpson: user("hjsimpson", 37) });
    const d = deps(gh.gql);
    await getSnapshot(d, "hjsimpson");
    const details = await ensureDetails(d, "hjsimpson");
    expect(details).toMatchObject({ topRepo: { name: "a/b", count: 1 }, additions: 3, deletions: 1 });
    await ensureDetails(d, "hjsimpson");
    expect(gh.calls.filter((c) => c === "page")).toHaveLength(1);
  });

  it("returns null for organizations", async () => {
    const gh = github({ vercel: { owner: { __typename: "Organization", login: "vercel", avatarUrl: "" } } });
    const d = deps(gh.gql);
    await getSnapshot(d, "vercel");
    expect(await ensureDetails(d, "vercel")).toBeNull();
  });
});

describe("leaderboard queries", () => {
  async function seed() {
    const counts: Record<string, number> = { maxshipper: 2418, tanbranch: 611, mergequeen: 402, hjsimpson: 37, lennyl: 22, carlc: 9, zero: 0 };
    const gh = github(Object.fromEntries(Object.entries(counts).map(([l, c]) => [l, user(l, c)])));
    for (const login of Object.keys(counts)) {
      await getSnapshot(deps(gh.gql), login);
      now = new Date(now.getTime() + 60_000);
    }
  }

  it("ranks by merged count", async () => {
    await seed();
    expect(await rank(db, 37)).toEqual({ rank: 4, total: 7 });
    expect(await rank(db, 5000)).toEqual({ rank: 1, total: 7 });
  });

  it("finds the users closest to a count, excluding the user", async () => {
    await seed();
    expect((await closest(db, "hjsimpson", 37, 3)).map((r) => r.login)).toEqual(["lennyl", "carlc", "zero"]);
  });

  it("hides poteto from recent lookups, rank, and closest users", async () => {
    const gh = github({ poteto: user("poteto", 20), hjsimpson: user("hjsimpson", 37), carlc: user("carlc", 9) });
    for (const login of ["carlc", "hjsimpson", "poteto"]) {
      await getSnapshot(deps(gh.gql), login);
      now = new Date(now.getTime() + 60_000);
    }
    expect((await recent(db)).map((r) => r.login)).toEqual(["hjsimpson", "carlc"]);
    expect(await rank(db, 15)).toEqual({ rank: 2, total: 2 });
    expect((await closest(db, "carlc", 9)).map((r) => r.login)).toEqual(["hjsimpson"]);
  });

  it("lists the most recent lookups first, including users with 0 PRs", async () => {
    await seed();
    expect((await recent(db, 3)).map((r) => r.login)).toEqual(["zero", "carlc", "lennyl"]);
  });
});

describe("botCount", () => {
  it("returns the cached value when GitHub fails", async () => {
    const gh = github({});
    await dependabotCount(deps(gh.gql));
    now = new Date(T0.getTime() + 13 * 3_600_000);
    const failing = (async () => {
      throw new Error("timeout");
    }) as unknown as Gql;
    expect(await botCount(deps(failing), "dependabot")).toBe(960629);
  });
});

describe("dependabotCount", () => {
  it("caches the dependabot count for 12 hours", async () => {
    const gh = github({});
    const d = deps(gh.gql);
    expect(await dependabotCount(d)).toBe(960629);
    now = new Date(T0.getTime() + 11 * HOUR);
    expect(await dependabotCount(d)).toBe(960629);
    expect(gh.calls).toEqual(["count"]);
  });
});
