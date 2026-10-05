import { describe, expect, it, vi } from "vitest";
import {
  countMerged,
  createGql,
  fetchDetails,
  fetchFast,
  GitHubRateLimitError,
  isValidLogin,
  mergedQuery,
  windowFor,
  type Gql,
} from "./github";

const NOW = new Date("2026-10-05T12:00:00Z");
const RANGE = windowFor(NOW);

const pr = (title: string, mergedAt: string, repo = "acme/app", additions = 10, deletions = 2) => ({
  title,
  mergedAt,
  additions,
  deletions,
  repository: { nameWithOwner: repo },
});

function fakeGql(handler: (query: string, vars: Record<string, unknown>) => unknown): Gql {
  return (async (query: string, vars: Record<string, unknown>) => handler(query, vars)) as Gql;
}

describe("windowFor", () => {
  it("covers the last 30 days", () => {
    expect(RANGE.until).toEqual(NOW);
    expect(RANGE.since.toISOString()).toBe("2026-09-05T12:00:00.000Z");
  });
});

describe("isValidLogin", () => {
  it.each(["poteto", "gndelia", "a", "carl-c", "a1-b2"])("accepts %s", (l) => expect(isValidLogin(l)).toBe(true));
  it.each(["", "-a", "a-", "a--b", "foo author:x", "a".repeat(40), "app/dependabot"])("rejects %j", (l) =>
    expect(isValidLogin(l)).toBe(false),
  );
});

describe("mergedQuery", () => {
  it("filters merged PRs by author and merge date", () => {
    expect(mergedQuery("poteto", RANGE)).toBe("is:pr is:merged author:poteto merged:2026-09-05T12:00:00Z..2026-10-05T12:00:00Z");
  });
});

describe("fetchFast", () => {
  it("returns the user, the count, and the first titles", async () => {
    const gql = fakeGql(() => ({
      repositoryOwner: { __typename: "User", login: "HJSimpson", avatarUrl: "https://avatars/1" },
      search: { issueCount: 37, nodes: [pr("feat: donut detector", "2026-10-01T00:00:00Z")] },
    }));
    expect(await fetchFast(gql, "hjsimpson", RANGE)).toEqual({
      owner: { kind: "user", login: "HJSimpson", avatarUrl: "https://avatars/1" },
      count: 37,
      titles: ["feat: donut detector"],
    });
  });

  it("detects organizations", async () => {
    const gql = fakeGql(() => ({ repositoryOwner: { __typename: "Organization", login: "vercel", avatarUrl: "" }, search: { issueCount: 0, nodes: [] } }));
    expect((await fetchFast(gql, "vercel", RANGE)).owner).toEqual({ kind: "org", login: "vercel" });
  });

  it("detects missing users", async () => {
    const gql = fakeGql(() => ({ repositoryOwner: null, search: { issueCount: 0, nodes: [] } }));
    expect((await fetchFast(gql, "hjsimpsn", RANGE)).owner).toEqual({ kind: "missing" });
  });

  it("does not call GitHub for an invalid login", async () => {
    const handler = vi.fn();
    expect((await fetchFast(fakeGql(handler), "foo author:x", RANGE)).owner).toEqual({ kind: "missing" });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("countMerged", () => {
  it("returns the issue count for an author", async () => {
    const gql = fakeGql((_, vars) => {
      expect(vars.q).toContain("author:app/dependabot");
      return { search: { issueCount: 960629 } };
    });
    expect(await countMerged(gql, "app/dependabot", RANGE)).toBe(960629);
  });
});

describe("fetchDetails", () => {
  it("pages through results and aggregates per day, repo, and lines", async () => {
    const pages: Record<string, unknown> = {
      first: {
        search: {
          issueCount: 3,
          pageInfo: { hasNextPage: true, endCursor: "c1" },
          nodes: [pr("a", "2026-09-05T13:00:00Z", "acme/app", 5, 1), pr("b", "2026-09-06T13:00:00Z", "acme/lib", 7, 3)],
        },
      },
      c1: {
        search: { issueCount: 3, pageInfo: { hasNextPage: false, endCursor: null }, nodes: [pr("c", "2026-10-05T11:00:00Z", "acme/app", 1, 0)] },
      },
    };
    const gql = fakeGql((_, vars) => pages[(vars.after as string | null) ?? "first"]);
    const d = await fetchDetails(gql, "hjsimpson", RANGE);
    expect(d.perDay[0]).toBe(1);
    expect(d.perDay[1]).toBe(1);
    expect(d.perDay[29]).toBe(1);
    expect(d.perDay.reduce((a, b) => a + b, 0)).toBe(3);
    expect(d.topRepo).toEqual({ name: "acme/app", count: 2 });
    expect(d).toMatchObject({ additions: 13, deletions: 4, titles: ["a", "b", "c"] });
  });

  it("splits the date range when a query has more than 1,000 results", async () => {
    const queries: string[] = [];
    const gql = fakeGql((_, vars) => {
      const q = vars.q as string;
      queries.push(q);
      const isFull = q.endsWith("2026-10-05T12:00:00Z") && q.includes("merged:2026-09-05T12:00:00Z..");
      const count = isFull ? 1500 : 750;
      const day = q.match(/merged:(\S+)\.\./)![1];
      return { search: { issueCount: count, pageInfo: { hasNextPage: false, endCursor: null }, nodes: [pr(`pr ${day}`, day)] } };
    });
    const d = await fetchDetails(gql, "maxshipper", RANGE);
    expect(queries).toHaveLength(3);
    expect(queries[1]).toContain("merged:2026-09-05T12:00:00Z..2026-09-20T12:00:00Z");
    expect(queries[2]).toContain("merged:2026-09-20T12:00:01Z..2026-10-05T12:00:00Z");
    expect(d.perDay.reduce((a, b) => a + b, 0)).toBe(2);
  });
});

describe("createGql", () => {
  const ok = (body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status: 200, headers });

  it("sends the token and returns data", async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect((init!.headers as Record<string, string>).authorization).toBe("bearer t0k");
      return ok({ data: { x: 1 } });
    });
    expect(await createGql("t0k", fetchImpl as typeof fetch)("query", {})).toEqual({ x: 1 });
  });

  it("throws a rate limit error on 403 with the reset time", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 403, headers: { "x-ratelimit-reset": "1791230000" } }));
    const err = await createGql("t", fetchImpl as typeof fetch)("query", {}).catch((e) => e);
    expect(err).toBeInstanceOf(GitHubRateLimitError);
    expect((err as GitHubRateLimitError).resetAt?.getTime()).toBe(1791230000 * 1000);
  });

  it("throws a rate limit error on a RATE_LIMITED GraphQL error", async () => {
    const fetchImpl = vi.fn(async () => ok({ errors: [{ type: "RATE_LIMITED", message: "limit" }] }));
    await expect(createGql("t", fetchImpl as typeof fetch)("query", {})).rejects.toBeInstanceOf(GitHubRateLimitError);
  });
});
