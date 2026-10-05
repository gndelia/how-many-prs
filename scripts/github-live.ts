import { countMerged, createGql, fetchDetails, fetchFast, windowFor } from "../lib/github.ts";

const login = process.argv[2] ?? "poteto";
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("Set GITHUB_TOKEN in .env.local and run: node --env-file=.env.local scripts/github-live.ts <login>");
  process.exit(1);
}

const gql = createGql(token);
const range = windowFor(new Date());

let t = performance.now();
const fast = await fetchFast(gql, login, range);
console.log(`fast (${(performance.now() - t).toFixed(0)}ms):`, { owner: fast.owner, count: fast.count, titles: fast.titles.slice(0, 3) });

if (fast.owner.kind === "user") {
  t = performance.now();
  const d = await fetchDetails(gql, login, range);
  console.log(`details (${(performance.now() - t).toFixed(0)}ms):`, { ...d, titles: d.titles.slice(-3) });
}

t = performance.now();
const dependabot = await countMerged(gql, "app/dependabot", range);
console.log(`dependabot (${(performance.now() - t).toFixed(0)}ms):`, dependabot);
