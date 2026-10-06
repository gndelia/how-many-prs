import { deps } from "@/lib/deps";
import { isValidLogin } from "@/lib/github";
import { hasLang } from "@/lib/i18n";
import { renderCardPng } from "@/lib/og";
import { POTETO } from "@/lib/racers";
import { getSnapshot } from "@/lib/snapshot";

export async function GET(request: Request, { params }: RouteContext<"/api/og/[lang]/[login]">) {
  const { lang, login } = await params;
  if (!hasLang(lang) || !isValidLogin(login)) return new Response("Not found", { status: 404 });
  const row = await getSnapshot(deps(), login);
  if (row.status !== "ok") return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const version = String(row.fetchedAt.getTime());
  if (url.searchParams.get("v") !== version) {
    url.search = `?v=${version}`;
    return Response.redirect(url, 307);
  }
  const png = await renderCardPng({
    reference: POTETO,
    subject: { login: row.displayLogin, count: row.mergedCount, titles: row.titles, avatar: row.avatarUrl ?? undefined },
    locale: lang,
  });
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
