import { notFound } from "next/navigation";
import { ContributionHero } from "@/components/ContributionHero";
import { Leaderboard, LEADERBOARD_CELL_PRS } from "@/components/Leaderboard";
import { MeasureForm } from "@/components/MeasureForm";
import { TalkAccordion } from "@/components/TalkAccordion";
import { getDb } from "@/lib/db/client";
import { dict, hasLang, TALK_POST } from "@/lib/i18n";
import { recent } from "@/lib/snapshot";

export const revalidate = 300;

async function recentRows() {
  try {
    return await recent(getDb(), 8);
  } catch (error) {
    console.error("Could not read recent lookups", error);
    return [];
  }
}

export default async function Landing({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLang(lang)) notFound();
  const t = dict(lang);
  const rows = await recentRows();
  return (
    <section>
      <div className="hero">
        <h1>{t.hero}</h1>
        <TalkAccordion url={TALK_POST} summary={t.watchTalk} fallback={t.potetoEmbed} />
        <ContributionHero />
      </div>
      <MeasureForm lang={lang} label={t.askLabel} button={t.measure} measuring={t.measuring} hint={t.hint} invalid={t.invalidLogin} />
      {rows.length > 0 && (
        <div className="board-wrap">
          <h2>{t.recent}</h2>
          <span className="meta">
            <span className="g">■</span> {t.recentKey(LEADERBOARD_CELL_PRS)}
          </span>
          <Leaderboard lang={lang} rows={rows} />
        </div>
      )}
      <div className="foot meta">
        <span>{t.foot1}</span>
        <span>{t.foot2}</span>
      </div>
    </section>
  );
}
