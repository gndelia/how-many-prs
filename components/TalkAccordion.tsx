"use client";

import { useState } from "react";
import { XEmbed } from "./XEmbed";

export function TalkAccordion({ url, summary, fallback }: { url: string; summary: string; fallback: string }) {
  const [opened, setOpened] = useState(false);
  return (
    <details className="talk" onToggle={(e) => e.currentTarget.open && setOpened(true)}>
      <summary>{summary}</summary>
      {opened && <XEmbed url={url} fallback={fallback} />}
    </details>
  );
}
