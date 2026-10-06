export type Locale = "en" | "es";

export type Racer = {
  login: string;
  count: number;
  titles: string[];
  avatar?: string;
  riderColor?: "accent";
};

export type Theme = {
  ground: string;
  ink: string;
  muted: string;
  you: string;
  empty: string;
  accent: string;
  merged: string;
  display?: string;
  mono?: string;
};

export const CSS_THEME: Theme = {
  ground: "var(--ground)",
  ink: "var(--chalk)",
  muted: "var(--muted)",
  you: "var(--you)",
  empty: "var(--c0)",
  accent: "var(--accent)",
  merged: "var(--merged)",
  display: "var(--font-display)",
  mono: "var(--font-mono)",
};

export const LIGHT: Theme = { ground: "#ffffff", ink: "#1f2328", muted: "#59636e", you: "#2da44e", empty: "#ebedf0", accent: "#0969da", merged: "#8250df" };
export const DARK: Theme = { ground: "#0d1117", ink: "#e6edf3", muted: "#9198a1", you: "#39d353", empty: "#1c232c", accent: "#4493f8", merged: "#a371f7" };

const HORSE = [
  "......AAAAA.........",
  "......AAAAA.........",
  "......AAAAA.........",
  "......AAAAA.........",
  "......AAAAA.........",
  ".......RRR......H...",
  ".......RRR.....HHH..",
  ".......RRRR...HHHHHH",
  ".......RRR.R.HHHH.HH",
  ".......RRR..HHHH....",
  ".HH....RRR.HHHH.....",
  "HH.HHHHRRRHHHHH.....",
  "H..HHHHHRHHHHH......",
  "...HHHHHRHHHHHH.....",
  "...HHHHHHHHHHHH.....",
  "...HHH.....HHHH.....",
  "..HH.........HHH....",
  ".HH............HH...",
  "HH..............HH..",
];

const DISPLAY = "Big Shoulders Display";
const MONO = "JetBrains Mono";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function formatters(locale: Locale) {
  const tag = locale === "es" ? "es-AR" : "en-US";
  const fmt = (n: number) => new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(n);
  const pct = (n: number, d: number) => {
    const v = new Intl.NumberFormat(tag, { maximumFractionDigits: d }).format(n);
    return locale === "es" ? `${v} %` : `${v}%`;
  };
  return { fmt, pct };
}

function rider(id: string, x: number, y: number, P: number, riderFill: string, horseFill: string, theme: Theme, avatar?: string) {
  let s = `<g transform="translate(${x} ${y})" shape-rendering="crispEdges">`;
  HORSE.forEach((row, ry) => {
    let cx = 0;
    while (cx < row.length) {
      const ch = row[cx];
      if (ch === "." || ch === "A") { cx++; continue; }
      let end = cx;
      while (row[end] === ch) end++;
      s += `<rect x="${cx * P}" y="${ry * P}" width="${(end - cx) * P}" height="${P}" fill="${ch === "H" ? horseFill : riderFill}"/>`;
      cx = end;
    }
  });
  const R = 4.3 * P, ax = 8.5 * P, ay = 5.5 * P - R;
  s += `</g><g transform="translate(${x} ${y})"><clipPath id="${id}"><circle cx="${ax}" cy="${ay}" r="${R}"/></clipPath>`;
  s += `<circle cx="${ax}" cy="${ay}" r="${R}" fill="${theme.empty}"/>`;
  if (avatar) {
    s += `<image href="${avatar}" x="${ax - R}" y="${ay - R}" width="${2 * R}" height="${2 * R}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`;
  } else {
    s += `<g clip-path="url(#${id})" fill="${riderFill}"><circle cx="${ax}" cy="${ay - 0.23 * R}" r="${0.35 * R}"/><ellipse cx="${ax}" cy="${ay + 0.84 * R}" rx="${0.68 * R}" ry="${0.58 * R}"/></g>`;
  }
  s += `<circle cx="${ax}" cy="${ay}" r="${R}" fill="none" stroke="${riderFill}" stroke-width="${Math.max(1.5, P / 3)}"/>`;
  return s + "</g>";
}

export type CardInput = {
  reference: Racer;
  subject: Racer;
  locale: Locale;
  theme?: Theme;
  compact?: boolean;
  idPrefix?: string;
};

export function renderCard({ reference, subject, locale, theme = LIGHT, compact = false, idPrefix = "" }: CardInput): string {
  const { fmt, pct } = formatters(locale);
  const es = locale === "es";
  const share = (subject.count / reference.count) * 100;
  const ahead = subject.count > reference.count;
  const Px = 6, hh = HORSE.length * Px;
  const max = Math.max(subject.count, reference.count);
  let ids = 0;

  const plaque = (x: number, y: number, label: string, c: string) => {
    const fs = Math.min(32, 150 / (label.length * 0.5));
    return `<rect x="${x}" y="${y}" width="170" height="50" fill="${theme.empty}" stroke="${c}" stroke-width="2"/><text x="${x + 85}" y="${y + 25 + fs * 0.36}" text-anchor="middle" fill="${c}" font-family="${theme.display ?? DISPLAY}" font-weight="900" font-size="${fs}" letter-spacing="${fs * 0.08}">${esc(label)}</text>`;
  };

  const lane = (p: Racer, y0: number, isYou: boolean) => {
    const c = isYou ? theme.you : theme.ink;
    const ay = y0 + 222, AX = 60, BX = 1010;
    const gapX = compact ? 30 : 8.5, m = compact ? 2.4 : 1;
    const xAt = (v: number) => AX + (v / max) * (BX - AX);
    const unit = max / Math.floor((BX - AX) / gapX);
    const endX = xAt(p.count);
    let s = `<line x1="${AX}" y1="${ay}" x2="${BX}" y2="${ay}" stroke="${theme.ink}" stroke-width="2"/>`;
    const stepV = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000].find((v) => max / v <= 6) ?? 500000;
    for (let v = 0; v <= max + 1; v += stepV / 5) s += `<line x1="${xAt(v)}" y1="${ay - 3}" x2="${xAt(v)}" y2="${ay + 3}" stroke="${theme.ink}" stroke-width="1"/>`;
    const ticks: number[] = [];
    for (let v = 0; v < max - stepV * 0.4; v += stepV) ticks.push(v);
    ticks.push(max);
    ticks.forEach((v, i) => {
      const anchor = i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle";
      s += `<line x1="${xAt(v)}" y1="${ay - 6}" x2="${xAt(v)}" y2="${ay + 6}" stroke="${theme.ink}" stroke-width="2"/><text x="${xAt(v)}" y="${ay + 26}" text-anchor="${anchor}" fill="${theme.muted}" font-family="${theme.mono ?? MONO}" font-size="14">${fmt(v)}</text>`;
    });
    const titles = p.titles.length ? p.titles : ["merged PR"];
    const n = p.count ? Math.max(1, Math.round(p.count / unit)) : 0;
    let lastX = AX - 20;
    for (let k = 0; k < n; k++) {
      const x = AX + 4 + k * gapX;
      if (k > 0 && x > endX) break;
      lastX = x;
      const raw = titles[k % titles.length];
      const title = compact && raw.length > 15 ? raw.slice(0, 14) + "…" : raw;
      s += `<g fill="none" stroke="${theme.merged}" stroke-width="${1.3 * m}"><circle cx="${x}" cy="${ay - 8 * m}" r="${1.7 * m}"/><circle cx="${x}" cy="${ay - 22 * m}" r="${1.7 * m}"/><circle cx="${x + 4.5 * m}" cy="${ay - 13 * m}" r="${1.7 * m}"/><path d="M${x} ${ay - 9.7 * m}V${ay - 20.3 * m}M${x} ${ay - 20.3 * m}C${x} ${ay - 16 * m} ${x + 4.5 * m} ${ay - 18 * m} ${x + 4.5 * m} ${ay - 14.7 * m}"/></g>`;
      s += `<text transform="translate(${x + 2.5 * m} ${ay - 26 * m}) rotate(-90)" fill="${theme.ink}" font-family="${theme.mono ?? MONO}" font-size="${7 * m * 0.8}">${esc(title)}</text>`;
    }
    const hx = Math.max(endX, lastX + 10) + 14;
    const px = Math.max(hx - 10, lastX + 14);
    const riderFill = isYou ? theme.you : p.riderColor === "accent" ? theme.accent : theme.ink;
    return s + rider(`${idPrefix}av${++ids}`, hx, y0 + 34, Px, riderFill, theme.ink, theme, p.avatar) + plaque(px, y0 + 34 + hh + 4, p.login.toUpperCase(), c);
  };

  const big = ahead ? pct(share, 0) : pct(share, share < 1 ? 2 : 1);
  const unitName = (es ? "DE UN " : "OF A ") + reference.login.toUpperCase();
  return varsToStyle(`<svg viewBox="0 0 1200 630" width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
<rect width="1200" height="630" fill="${theme.ground}"/>
<text x="600" y="64" text-anchor="middle" fill="${theme.ink}" font-family="${theme.display ?? DISPLAY}" font-weight="900" font-size="60" letter-spacing="8">PRs</text>
<text x="40" y="64" fill="${theme.you}" font-family="${theme.display ?? DISPLAY}" font-weight="900" font-size="44">${big}<tspan fill="${theme.ink}" font-size="26" letter-spacing="2" dx="10">${esc(unitName)}</tspan></text>
<text x="1160" y="60" text-anchor="end" fill="${theme.muted}" font-family="${theme.mono ?? MONO}" font-size="16">@${esc(subject.login)} · ${fmt(subject.count)} PRs · ${es ? "30 días" : "30 days"}</text>
<line x1="0" y1="84" x2="1200" y2="84" stroke="${theme.ink}" stroke-width="2"/>
<line x1="0" y1="346" x2="1200" y2="346" stroke="${theme.ink}" stroke-width="2"/>
${lane(reference, 84, false)}
${lane(subject, 346, true)}
</svg>`);
}

export function renderShareCard({ racer, locale, theme = LIGHT }: { racer: Racer; locale: Locale; theme?: Theme }): string {
  const { fmt } = formatters(locale);
  const P = 14;
  const count = fmt(racer.count);
  const countSize = Math.min(260, 560 / (count.length * 0.52));
  return `<svg viewBox="0 0 1200 630" width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
<rect width="1200" height="630" fill="${theme.ground}"/>
${rider("share-av", 150, 190, P, theme.you, theme.ink, theme, racer.avatar)}
<text x="580" y="350" fill="${theme.you}" font-family="${DISPLAY}" font-weight="900" font-size="${countSize}">${count}</text>
<text x="584" y="430" fill="${theme.ink}" font-family="${DISPLAY}" font-weight="800" font-size="64" letter-spacing="4">${locale === "es" ? "PRs EN 30 DÍAS" : "PRs IN 30 DAYS"}</text>
<text x="586" y="500" fill="${theme.muted}" font-family="${MONO}" font-size="34">@${esc(racer.login)}</text>
</svg>`;
}

function varsToStyle(svg: string) {
  return svg.replace(/<[^>]+>/g, (tag) => {
    const decls: string[] = [];
    const out = tag.replace(/\s(fill|stroke|font-family)="(var\([^"]+\))"/g, (_, prop: string, value: string) => {
      decls.push(`${prop}:${value}`);
      return "";
    });
    return decls.length ? out.replace(/(\/?>)$/, ` style="${decls.join(";")}"$1`) : tag;
  });
}
