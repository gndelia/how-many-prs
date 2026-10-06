import { countMerged, createGql, windowFor } from "../lib/github.ts";

const gql = createGql(process.env.GITHUB_TOKEN!);
const range = windowFor(new Date());
const candidates = process.argv.slice(2);

for (const app of candidates) {
  try {
    console.log(app.padEnd(28), await countMerged(gql, `app/${app}`, range));
  } catch (e) {
    console.log(app.padEnd(28), "error:", (e as Error).message.slice(0, 80));
  }
}
