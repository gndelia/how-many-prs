import { format, type Lang } from "@/lib/i18n";

const CELL_PRS = 100;
const CELLS = 25;
const GAP_AT = 20;

function Strip({ count }: { count: number }) {
  const filled = count ? Math.max(1, Math.round(count / CELL_PRS)) : 0;
  const rects = [];
  for (let i = 0, slot = 0; slot < CELLS; i++) {
    if (i === GAP_AT) continue;
    rects.push(<rect key={i} x={i * 10} y={0} width={8} height={8} className={slot < filled ? "cell-on" : "cell-off"} />);
    slot++;
  }
  return (
    <svg viewBox="0 0 268 8" aria-hidden="true">
      {rects}
    </svg>
  );
}

export function Leaderboard({ lang, rows }: { lang: Lang; rows: { login: string; mergedCount: number }[] }) {
  const { n } = format(lang);
  return (
    <ol className="board">
      {rows.map((r) => (
        <li key={r.login}>
          <b>@{r.login}</b>
          <Strip count={r.mergedCount} />
          <span className="num">{n(r.mergedCount)}</span>
        </li>
      ))}
    </ol>
  );
}

export const LEADERBOARD_CELL_PRS = CELL_PRS;
