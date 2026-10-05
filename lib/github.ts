export const WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;
const PAGE_SIZE = 100;
const SEARCH_LIMIT = 1000;
const TITLE_SAMPLE = 150;

export type Window = { since: Date; until: Date };

export type Owner =
  | { kind: "user"; login: string; avatarUrl: string }
  | { kind: "org"; login: string }
  | { kind: "missing" };

export type FastResult = { owner: Owner; count: number; titles: string[] };

export type Details = {
  perDay: number[];
  topRepo: { name: string; count: number } | null;
  additions: number;
  deletions: number;
  titles: string[];
};

export type Gql = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;

export class GitHubRateLimitError extends Error {
  resetAt: Date | null;
  constructor(resetAt: Date | null) {
    super("GitHub rate limit reached");
    this.resetAt = resetAt;
  }
}

export class GitHubError extends Error {}

const LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isValidLogin(login: string) {
  return LOGIN.test(login);
}

export function windowFor(now: Date): Window {
  return { since: new Date(now.getTime() - WINDOW_DAYS * DAY_MS), until: now };
}

const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

export function mergedQuery(author: string, range: Window) {
  return `is:pr is:merged author:${author} merged:${iso(range.since)}..${iso(range.until)}`;
}

export function createGql(token: string, fetchImpl: typeof fetch = fetch, timeoutMs = 10_000): Gql {
  return async <T>(query: string, variables: Record<string, unknown>) => {
    const res = await fetchImpl("https://api.github.com/graphql", {
      method: "POST",
      headers: { authorization: `bearer ${token}`, "content-type": "application/json", "user-agent": "how-many-prs" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const reset = res.headers.get("x-ratelimit-reset");
    const resetAt = reset ? new Date(Number(reset) * 1000) : null;
    if (res.status === 403 || res.status === 429) throw new GitHubRateLimitError(resetAt);
    if (!res.ok) throw new GitHubError(`GitHub responded ${res.status}`);
    const body = (await res.json()) as { data?: T; errors?: { type?: string; message: string }[] };
    if (body.errors?.some((e) => e.type === "RATE_LIMITED")) throw new GitHubRateLimitError(resetAt);
    if (!body.data) throw new GitHubError(body.errors?.map((e) => e.message).join("; ") ?? "Empty GitHub response");
    return body.data;
  };
}

type PrNode = { title: string; mergedAt: string; additions: number; deletions: number; repository: { nameWithOwner: string } };

type SearchPage = {
  search: { issueCount: number; pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: PrNode[] };
};

const PR_FIELDS = `... on PullRequest { title mergedAt additions deletions repository { nameWithOwner } }`;

const FAST_QUERY = `query Fast($login: String!, $q: String!) {
  repositoryOwner(login: $login) { __typename login avatarUrl }
  search(query: $q, type: ISSUE, first: ${PAGE_SIZE}) { issueCount nodes { ... on PullRequest { title } } }
}`;

const PAGE_QUERY = `query Page($q: String!, $after: String) {
  search(query: $q, type: ISSUE, first: ${PAGE_SIZE}, after: $after) {
    issueCount pageInfo { hasNextPage endCursor } nodes { ${PR_FIELDS} }
  }
}`;

const COUNT_QUERY = `query Count($q: String!) { search(query: $q, type: ISSUE, first: 1) { issueCount } }`;

export async function fetchFast(gql: Gql, login: string, range: Window): Promise<FastResult> {
  if (!isValidLogin(login)) return { owner: { kind: "missing" }, count: 0, titles: [] };
  const data = await gql<{
    repositoryOwner: { __typename: string; login: string; avatarUrl: string } | null;
    search: { issueCount: number; nodes: { title: string }[] };
  }>(FAST_QUERY, { login, q: mergedQuery(login, range) });
  const o = data.repositoryOwner;
  if (!o) return { owner: { kind: "missing" }, count: 0, titles: [] };
  if (o.__typename !== "User") return { owner: { kind: "org", login: o.login }, count: 0, titles: [] };
  return {
    owner: { kind: "user", login: o.login, avatarUrl: o.avatarUrl },
    count: data.search.issueCount,
    titles: data.search.nodes.map((n) => n.title),
  };
}

export async function countMerged(gql: Gql, author: string, range: Window): Promise<number> {
  const data = await gql<{ search: { issueCount: number } }>(COUNT_QUERY, { q: mergedQuery(author, range) });
  return data.search.issueCount;
}

async function collect(gql: Gql, login: string, range: Window, out: PrNode[]): Promise<void> {
  let after: string | null = null;
  for (;;) {
    const data: SearchPage = await gql<SearchPage>(PAGE_QUERY, { q: mergedQuery(login, range), after });
    const { issueCount, pageInfo, nodes } = data.search;
    if (after === null && issueCount > SEARCH_LIMIT) {
      const mid = new Date((range.since.getTime() + range.until.getTime()) / 2);
      await collect(gql, login, { since: range.since, until: mid }, out);
      await collect(gql, login, { since: new Date(mid.getTime() + 1000), until: range.until }, out);
      return;
    }
    out.push(...nodes);
    if (!pageInfo.hasNextPage || !pageInfo.endCursor) return;
    after = pageInfo.endCursor;
  }
}

export async function fetchDetails(gql: Gql, login: string, range: Window): Promise<Details> {
  const prs: PrNode[] = [];
  if (isValidLogin(login)) await collect(gql, login, range, prs);
  const perDay = Array<number>(WINDOW_DAYS).fill(0);
  const repos = new Map<string, number>();
  let additions = 0, deletions = 0;
  for (const pr of prs) {
    const day = Math.floor((new Date(pr.mergedAt).getTime() - range.since.getTime()) / DAY_MS);
    perDay[Math.min(WINDOW_DAYS - 1, Math.max(0, day))]++;
    repos.set(pr.repository.nameWithOwner, (repos.get(pr.repository.nameWithOwner) ?? 0) + 1);
    additions += pr.additions;
    deletions += pr.deletions;
  }
  let topRepo: Details["topRepo"] = null;
  for (const [name, count] of repos) if (!topRepo || count > topRepo.count) topRepo = { name, count };
  const titles = [...prs].sort((a, b) => a.mergedAt.localeCompare(b.mergedAt)).slice(-TITLE_SAMPLE).map((p) => p.title);
  return { perDay, topRepo, additions, deletions, titles };
}
