import { deps } from "@/lib/deps";
import { isValidLogin } from "@/lib/github";
import { hasLang } from "@/lib/i18n";
import { renderCardPng, renderSharePng } from "@/lib/og";
import { POTETO } from "@/lib/racers";
import { getSnapshot } from "@/lib/snapshot";

export async function GET(request: Request, { params }: RouteContext<"/api/og/[lang]/[login]">) {
  const { lang, login } = await params;
  if (!hasLang(lang) || !isValidLogin(login)) return new Response("Not found", { status: 404 });
  const row = await getSnapshot(deps(), login);
  if (row.status !== "ok") return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const solo = url.searchParams.get("style") === "solo";
  const version = String(row.fetchedAt.getTime());
  if (url.searchParams.get("v") !== version) {
    url.search = `?v=${version}${solo ? "&style=solo" : ""}`;
    return Response.redirect(url, 307);
  }
  const racer = { login: row.displayLogin, count: row.mergedCount, titles: row.titles, avatar: row.avatarUrl ?? undefined };
  const png = solo ? await renderSharePng(racer, lang) : await renderCardPng({ reference: POTETO, subject: racer, locale: lang });
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
