import type { Racer } from "./card";

export const POTETO_COUNT = 2000;

export const POTETO: Racer = {
  login: "poteto",
  count: POTETO_COUNT,
  avatar: "https://github.com/poteto.png?size=96",
  riderColor: "accent",
  titles: [
    "fix: flaky agent test",
    "feat: grokbot reviews PRs",
    "chore: bump deps again",
    "perf: cold start −40%",
    "refactor: delete 3k lines",
    "feat: parallel agent queue",
    "fix: typo in typo fix",
    "test: verify the verifier",
    "feat: agent writes changelog",
    "docs: how to ship 2000 PRs",
  ],
};

export const DEPENDABOT_TITLES = [
  "chore(deps): bump lodash",
  "chore(deps): bump axios",
  "chore(deps-dev): bump jest",
  "chore(deps): bump react",
  "chore(deps): bump lodash (again)",
  "chore(deps): bump next",
  "chore(deps): bump vite",
  "chore(deps): bump left-pad",
];

export const dependabot = (count: number): Racer => ({
  login: "dependabot",
  count,
  avatar: "https://github.com/dependabot.png?size=96",
  titles: DEPENDABOT_TITLES,
  riderColor: "accent",
});
