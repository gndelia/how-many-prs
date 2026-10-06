"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { currentTheme } from "./ThemeToggle";

type Twttr = { widgets?: { load: (el?: HTMLElement) => void } };

const twttr = () => (window as unknown as { twttr?: Twttr }).twttr;

export function XEmbed({ url, fallback }: { url: string; fallback: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const quote = ref.current?.querySelector("blockquote");
    if (quote) quote.dataset.theme = currentTheme();
    if (ref.current) twttr()?.widgets?.load(ref.current);
  }, [url]);

  return (
    <div className="x-embed" ref={ref}>
      <blockquote className="twitter-tweet" data-dnt="true" data-align="center">
        <a href={url}>{fallback}</a>
      </blockquote>
      <Script src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" />
    </div>
  );
}
