"use client";

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { Details } from "@/lib/github";
import { dict, format, type Lang } from "@/lib/i18n";

const STEPS = [1, 2, 5, 10, 25, 50, 100, 250];
const PITCH = 20.8;
const CELL = 16.6;
const DAY_MS = 86_400_000;

function PerDay({ perDay, cell, start, lang }: { perDay: number[]; cell: number; start: number; lang: Lang }) {
  const { day } = format(lang);
  const rows = Math.max(7, Math.ceil(Math.max(...perDay) / cell));
  const rects: ReactElement[] = [];
  perDay.forEach((n, i) => {
    for (let r = 0; r < rows; r++) {
      rects.push(
        <rect key={`${i}-${r}`} x={i * PITCH} y={(rows - 1 - r) * PITCH} width={CELL} height={CELL} className={r < Math.ceil(n / cell) ? "cell-you" : "cell-empty"} />,
      );
    }
  });
  return (
    <svg viewBox={`0 0 ${30 * PITCH - (PITCH - CELL)} ${rows * PITCH + 26}`} role="img" aria-label="Merged PRs per day">
      {rects}
      {[0, 7, 14, 21, 28].map((i) => (
        <text key={i} x={i * PITCH} y={rows * PITCH + 18} className="axis-label">
          {day(new Date(start + i * DAY_MS))}
        </text>
      ))}
    </svg>
  );
}

type Props = { lang: Lang; login: string; windowStart: number; version: number; children: ReactNode };

export function DetailsPanel({ lang, login, windowStart, version, children }: Props) {
  const t = dict(lang);
  const { n } = format(lang);
  const [details, setDetails] = useState<Details | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/details/${login}?v=${version}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Details) => alive && setDetails(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [login, version]);

  const peak = details ? Math.max(...details.perDay) : 0;
  const cell = STEPS.find((v) => peak / v <= 10) ?? 500;
  return (
    <>
      {details ? (
        <p className="facts-line">
          {details.topRepo && <>{t.topRepo(details.topRepo.name, n(details.topRepo.count))} </>}
          {t.lines(n(details.additions), n(details.deletions))}
        </p>
      ) : (
        !failed && <p className="facts-line skeleton">{t.loading}</p>
      )}
      <div className="split">
        {details && (
          <div className="col">
            <span className="label">{t.perDay(cell)}</span>
            <div className="pd">
              <PerDay perDay={details.perDay} cell={cell} start={windowStart} lang={lang} />
            </div>
          </div>
        )}
        {children}
      </div>
    </>
  );
}
