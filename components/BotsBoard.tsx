import { format, type Lang } from "@/lib/i18n";

export type BoardRow = { key: string; label: string; count: number; you?: boolean };

export function BotsBoard({ lang, rows }: { lang: Lang; rows: BoardRow[] }) {
  const { n } = format(lang);
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const max = sorted[0]?.count || 1;
  return (
    <ol className="bots">
      {sorted.map((r, i) => (
        <li key={r.key} className={r.you ? "me" : undefined}>
          <span className="rank">{i + 1}</span>
          <b>{r.label}</b>
          <span className="num">{n(r.count)}</span>
          <span className="bar" aria-hidden="true">
            <i style={{ width: `${Math.max(0.4, (r.count / max) * 100)}%` }} />
          </span>
        </li>
      ))}
    </ol>
  );
}
