import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BotsBoard } from "@/components/BotsBoard";
import { DetailsPanel } from "@/components/DetailsPanel";
import { HorseCard } from "@/components/HorseCard";
import { MeasureForm } from "@/components/MeasureForm";
import { PotetoGrid } from "@/components/PotetoGrid";
import { ShareActions } from "@/components/ShareActions";
import { XEmbed } from "@/components/XEmbed";
import { AGENTS } from "@/lib/agents";
import type { UserRow } from "@/lib/db/schema";
import { deps } from "@/lib/deps";
import { isValidLogin } from "@/lib/github";
import { dict, format, hasLang, localePath, SHADOW_SCENE, TALK_POST, type Lang } from "@/lib/i18n";
import { dependabot, POTETO, POTETO_COUNT } from "@/lib/racers";
import { botCount, closest, dependabotCount, getSnapshot, rank } from "@/lib/snapshot";
import { refreshUser } from "./actions";

export const revalidate = 43200;

export function generateStaticParams() {
  return [];
}

type Params = { lang: string; login: string };

const snapshot = cache((login: string) => getSnapshot(deps(), login));

async function load({ lang, login }: Params) {
  if (!hasLang(lang) || !isValidLogin(login)) notFound();
  return { lang, row: await snapshot(login.toLowerCase()) };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, row } = await load(await params);
  const t = dict(lang);
  const { n, pct } = format(lang);
  const path = `/u/${row.login}`;
  const ogImage = `/api/og/${lang}/${row.login}?v=${row.fetchedAt.getTime()}`;
  const title = row.status === "ok" ? `@${row.displayLogin}: ${n(row.mergedCount)} PRs · ${pct((row.mergedCount / POTETO_COUNT) * 100)} · ${t.siteName}` : t.siteName;
  return {
    title,
    alternates: { canonical: localePath(lang, path), languages: { en: path, es: localePath("es", path), "x-default": path } },
    robots: row.status === "ok" ? undefined : { index: false },
    openGraph: row.status === "ok" ? { title, images: [{ url: ogImage, width: 1200, height: 630 }] } : undefined,
    twitter: row.status === "ok" ? { card: "summary_large_image", title, images: [ogImage] } : undefined,
  };
}

function ErrorView({ lang, row }: { lang: Lang; row: UserRow }) {
  const t = dict(lang);
  const org = row.status === "org";
  return (
    <div className="error">
      <span className="meta">@{row.displayLogin}</span>
      <h1>{org ? t.orgHead : t.missingHead}</h1>
      <p>{org ? t.orgBody(row.displayLogin) : t.missingBody(row.displayLogin)}</p>
      <MeasureForm lang={lang} label={t.askLabel} button={t.measure} measuring={t.measuring} hint={t.hint} invalid={t.invalidLogin} />
    </div>
  );
}

function PotetoView({ lang, row }: { lang: Lang; row: UserRow }) {
  const t = dict(lang);
  return (
    <div className="error">
      <span className="meta">github.com/{row.displayLogin}</span>
      <h1>{t.potetoHead}</h1>
      <p>{t.potetoBody(format(lang).n(row.mergedCount))}</p>
      <XEmbed url={TALK_POST} fallback={t.potetoEmbed} />
      <MeasureForm lang={lang} label={t.askLabel} button={t.measure} measuring={t.measuring} hint={t.hint} invalid={t.invalidLogin} />
    </div>
  );
}

export default async function ResultPage({ params }: { params: Promise<Params> }) {
  const { lang, row } = await load(await params);
  if (row.status !== "ok") return <ErrorView lang={lang} row={row} />;
  if (row.login === POTETO.login) return <PotetoView lang={lang} row={row} />;

  const t = dict(lang);
  const { n, pct } = format(lang);
  const d = deps();
  const [position, near, depCount, agentCounts] = await Promise.all([
    rank(d.db, row.mergedCount),
    closest(d.db, row.login, row.mergedCount),
    dependabotCount(d),
    Promise.all(AGENTS.map((a) => botCount(d, a.app))),
  ]);
  const boardRows = [
    { key: "you", label: `@${row.displayLogin} (${t.you})`, count: row.mergedCount, you: true },
    { key: "poteto", label: "@poteto", count: POTETO.count },
    ...(depCount === null ? [] : [{ key: "dependabot", label: "@dependabot", count: depCount }]),
    ...AGENTS.flatMap((a, i) => (agentCounts[i] === null ? [] : [{ key: a.app, label: `${a.name} · @${a.handle}`, count: agentCounts[i]! }])),
  ];

  const share = (row.mergedCount / POTETO_COUNT) * 100;
  const ahead = row.mergedCount > POTETO_COUNT;
  const shareLabel = ahead ? pct(share, 0) : pct(share);
  const me = { login: row.displayLogin, count: row.mergedCount, titles: row.titles, avatar: row.avatarUrl ?? undefined };
  const punchWho = ahead ? me : POTETO;
  const sim = [...near, { login: row.displayLogin, mergedCount: row.mergedCount, me: true }].sort((a, b) => b.mergedCount - a.mergedCount);
  const refresh = refreshUser.bind(null, row.login);

  return (
    <>
      <div className="result-head">
        <span className="meta">github.com/{row.displayLogin}</span>
        <h1>{ahead ? t.aheadHead(n(row.mergedCount)) : t.behindHead(n(row.mergedCount), shareLabel)}</h1>
      </div>
      <PotetoGrid count={row.mergedCount} />
      <div className="grid-cap" style={{ paddingTop: 12 }}>
        <span className="meta">{t.gridCap}</span>
      </div>

      <div className="share">
        <HorseCard id="share" reference={POTETO} subject={me} lang={lang} />
      </div>
      <ShareActions
        lang={lang}
        fetchedAt={row.fetchedAt.getTime()}
        shareText={ahead ? t.shareTextAhead(n(row.mergedCount)) : t.shareText(n(row.mergedCount), shareLabel)}
        onRefresh={refresh}
      />

      <dl className="stats">
        <div>
          <dt>{n(row.mergedCount)}</dt>
          <dd className="label">{t.merged}</dd>
        </div>
        <div>
          <dt className="y">{shareLabel}</dt>
          <dd className="label">{t.ofPoteto}</dd>
        </div>
        <div>
          <dt>#{n(position.rank)}</dt>
          <dd className="label">{t.rank(n(position.total))}</dd>
        </div>
      </dl>

      <DetailsPanel lang={lang} login={row.login} windowStart={row.windowStart.getTime()} version={row.fetchedAt.getTime()}>
        {sim.length > 1 && (
          <div className="col">
            <span className="label">{t.close}</span>
            <ol className="sim">
              {sim.map((s) => (
                <li key={s.login} className={"me" in s ? "me" : undefined}>
                  <b>@{s.login}</b>
                  <span>{n(s.mergedCount)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </DetailsPanel>

      {depCount !== null && row.mergedCount <= depCount && (
        <div className="punch">
          <h2>{ahead ? t.punchAhead : t.punchBehind}</h2>
          <HorseCard id="punch" reference={dependabot(depCount)} subject={punchWho} lang={lang} />
          <p className="meta shadow">
            {ahead ? t.shadowAhead : t.shadow}{" "}
            <a href={SHADOW_SCENE} target="_blank" rel="noopener">
              {t.shadowLink} ↗
            </a>
          </p>
          <p>{t.punchLegend(n(depCount), ahead ? t.punchWhoAhead : t.punchWhoBehind, pct((punchWho.count / depCount) * 100, 2))}</p>
        </div>
      )}

      <div className="bots-wrap">
        <h2>{t.botsHead}</h2>
        <span className="meta">{t.botsSub}</span>
        <BotsBoard lang={lang} rows={boardRows} />
      </div>

      <div className="again">
        <Link className="btn solid" href={localePath(lang, "/")}>
          {t.tryAnother}
        </Link>
      </div>
    </>
  );
}
