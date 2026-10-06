"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { dict, type Lang } from "@/lib/i18n";

const HOUR = 3_600_000;
const MINUTE = 60_000;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, MINUTE);
  return () => clearInterval(id);
}
const minuteNow = () => Math.floor(Date.now() / MINUTE) * MINUTE;
const noTime = () => null;

type Props = { lang: Lang; fetchedAt: number; shareText: string; onRefresh: () => Promise<void> };

export function ShareActions({ lang, fetchedAt, shareText, onRefresh }: Props) {
  const t = dict(lang);
  const [copied, setCopied] = useState(false);
  const now = useSyncExternalStore(subscribe, minuteNow, noTime);
  const [pending, start] = useTransition();

  const url = () => window.location.href.split("#")[0].split("?")[0];

  function post() {
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url())}`;
    window.open(intent, "_blank", "noopener");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.copy, url());
    }
  }

  const age = now === null ? null : now - fetchedAt;

  return (
    <div className="actions">
      <button className="btn solid" type="button" onClick={post}>
        {t.post}
      </button>
      <button className="btn" type="button" onClick={copy}>
        {copied ? t.copied : t.copy}
      </button>
      {age !== null && (
        <span className="meta">
          {t.updated(Math.floor(age / HOUR))}{" "}
          {age < HOUR ? (
            t.refreshIn(Math.ceil((HOUR - age) / MINUTE))
          ) : (
            <button type="button" className="linkish" disabled={pending} onClick={() => start(onRefresh)}>
              {t.refresh}
            </button>
          )}
        </span>
      )}
    </div>
  );
}
