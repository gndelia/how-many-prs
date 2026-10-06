import "server-only";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { LIGHT, renderCard, type CardInput, type Racer } from "./card";

const FONTS = ["BigShouldersDisplay-800", "BigShouldersDisplay-900", "JetBrainsMono-400", "JetBrainsMono-700"].map((f) =>
  join(process.cwd(), "assets/fonts", `${f}.ttf`),
);

async function dataUri(url: string | undefined) {
  if (!url) return undefined;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${res.headers.get("content-type") ?? "image/png"};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

const withAvatar = async (r: Racer): Promise<Racer> => ({ ...r, avatar: await dataUri(r.avatar) });

export async function renderCardPng(input: Omit<CardInput, "theme">): Promise<Buffer> {
  const [reference, subject] = await Promise.all([withAvatar(input.reference), withAvatar(input.subject)]);
  const svg = renderCard({ ...input, reference, subject, theme: LIGHT, compact: true });
  return new Resvg(svg, { font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "JetBrains Mono" } }).render().asPng();
}
