import { hasLang, LOCALES } from "@/lib/i18n";
import { renderHomePng } from "@/lib/og";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function GET(_request: Request, { params }: RouteContext<"/api/og/[lang]">) {
  const { lang } = await params;
  if (!hasLang(lang)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(renderHomePng(lang)), { headers: { "content-type": "image/png" } });
}
