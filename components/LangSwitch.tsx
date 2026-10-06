"use client";

import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/i18n";

export function LangSwitch({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? "/";
  const base = pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";
  const href = (l: Lang) => (l === "en" ? base : `/es${base === "/" ? "" : base}`);
  return (
    <div className="lang" role="group" aria-label="Language">
      {(["en", "es"] as const).map((l) => (
        <a key={l} href={href(l)} aria-current={l === lang ? "true" : undefined} className={l === lang ? "on" : undefined} hrefLang={l}>
          {l.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
