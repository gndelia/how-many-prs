"use client";

import { useParams } from "next/navigation";
import { dict, hasLang } from "@/lib/i18n";

export default function ResultError({ reset }: { error: Error; reset: () => void }) {
  const { lang } = useParams<{ lang: string }>();
  const t = dict(hasLang(lang) ? lang : "en");
  return (
    <div className="busy">
      <h1>{t.busyHead}</h1>
      <p>{t.busyBody}</p>
      <div>
        <button className="btn" type="button" onClick={reset}>
          {t.refresh}
        </button>
      </div>
    </div>
  );
}
