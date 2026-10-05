import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { renderCard, DARK, LIGHT, type Racer } from "../lib/card.ts";

const fontFiles = ["BigShouldersDisplay-800", "BigShouldersDisplay-900", "JetBrainsMono-400", "JetBrainsMono-700"].map((f) => `assets/fonts/${f}.ttf`);

async function avatar(login: string) {
  const res = await fetch(`https://github.com/${login}.png?size=96`);
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${res.headers.get("content-type") ?? "image/png"};base64,${buf.toString("base64")}`;
}

const poteto: Racer = { login: "poteto", count: 2000, titles: ["fix: flaky agent test", "feat: grokbot reviews PRs", "perf: cold start −40%", "refactor: delete 3k lines"] };
const dependabot: Racer = { login: "dependabot", count: 960629, titles: ["chore(deps): bump lodash", "chore(deps): bump axios"] };
const user: Racer = { login: "gndelia", count: 37, titles: ["feat: donut detector", "fix: snooze reactor alarm"] };
const ahead: Racer = { login: "maxshipper", count: 2418, titles: ["feat: monorepo autosplit", "fix: race in merge queue"] };

poteto.avatar = await avatar("poteto");
user.avatar = await avatar("gndelia");

const cases = [
  ["behind-light", { reference: poteto, subject: user, locale: "en", theme: LIGHT }],
  ["ahead-dark", { reference: poteto, subject: ahead, locale: "en", theme: DARK }],
  ["dependabot-es", { reference: dependabot, subject: poteto, locale: "es", theme: LIGHT }],
] as const;

mkdirSync("out", { recursive: true });
for (const [name, input] of cases) {
  const t0 = performance.now();
  const svg = renderCard(input);
  const png = new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "JetBrains Mono" } }).render().asPng();
  writeFileSync(`out/${name}.png`, png);
  console.log(`${name}: ${(performance.now() - t0).toFixed(0)}ms, ${(png.length / 1024).toFixed(0)}KB`);
}
console.log("fonts ok:", readFileSync(fontFiles[0]).length > 0);
