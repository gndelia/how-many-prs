export const LOCALES = ["en", "es"] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = "en";

export const hasLang = (v: string): v is Lang => (LOCALES as readonly string[]).includes(v);

export const localePath = (lang: Lang, path: string) => (lang === DEFAULT_LANG ? path : `/${lang}${path === "/" ? "" : path}`);

export const TALK_POST = "https://x.com/poteto/status/2102050467505430555";
export const SHADOW_SCENE = "https://www.youtube.com/watch?v=oiZzkTqDqO4";
export const REPO = "https://github.com/gndelia/how-many-prs";

export function format(lang: Lang) {
  const tag = lang === "es" ? "es-AR" : "en-US";
  const n = (v: number) => new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(v);
  const pct = (v: number, digits = 1) => {
    const s = new Intl.NumberFormat(tag, { maximumFractionDigits: digits }).format(v);
    return lang === "es" ? `${s} %` : `${s}%`;
  };
  const day = (d: Date) =>
    new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" }).format(d).replace(".", "");
  return { n, pct, day };
}

const en = {
  siteName: "How many PRs?",
  github: "GitHub",
  githubLabel: "Source code on GitHub",
  themeLabel: "Switch light or dark theme",
  hero: "@poteto shipped 2,000 PRs in 30 days.",
  askLabel: "How many did you ship?",
  measure: "Measure",
  hint: "Public repos only. PRs that bots or agents open with their own account count for the bot, not for you. Results update every 12 hours.",
  recent: "Recently measured",
  recentKey: (cell: number) => `= ${cell} merged PRs. The gap after 20 cells is one poteto.`,
  foot1: "@poteto's 2,000 is the number from the talk. We do not scan @poteto's account.",
  foot2: "Fan-made. Not affiliated with GitHub or @poteto.",
  invalidLogin: "Enter a GitHub username.",
  behindHead: (n: string, p: string) => `You merged ${n} PRs. That is ${p} of @poteto.`,
  aheadHead: (n: string) => `You merged ${n} PRs. You are the poteto now.`,
  gridCap: "One poteto: 2,000 cells, one per PR. The green ones are yours.",
  shareLabel: "This is what your link shows when you share it",
  post: "Post on X",
  copy: "Copy link",
  copied: "Link copied",
  updated: (h: number) => (h < 1 ? "Updated less than an hour ago." : `Updated ${h}h ago.`),
  refresh: "Refresh",
  refreshIn: (m: number) => `Refresh available in ${m} min.`,
  merged: "merged PRs",
  ofPoteto: "of a poteto",
  rank: (total: string) => `rank, of ${total} measured`,
  topRepo: (repo: string, n: string) => `Top repo: ${repo} (${n} PRs).`,
  lines: (a: string, d: string) => `Lines: +${a} / −${d}.`,
  perDay: (cell: number) => `Your merged PRs per day · ■ = ${cell} PR${cell > 1 ? "s" : ""}`,
  loading: "Counting your PRs…",
  close: "Close to your count",
  punchBehind: "Don't worry, you're not the only one feeling behind.",
  punchAhead: "You're ahead of @poteto. You're still behind a bot.",
  punchLegend: (d: string, who: string, p: string) => `@dependabot merged ${d} PRs in the same 30 days. ${who} ${p} of a dependabot.`,
  punchWhoBehind: "@poteto is",
  punchWhoAhead: "You are",
  shadow: "Don't worry, @poteto is just like you:",
  shadowAhead: "Don't worry, you're just like @poteto:",
  shadowLink: "you both live in another user's shadow.",
  orgHead: "This account can't race.",
  orgBody: (login: string) => `@${login} is an organization. Organizations don't open pull requests. Enter a person's username.`,
  missingHead: "No horse in this race.",
  missingBody: (login: string) => `No GitHub user called @${login}. Check the spelling and try again.`,
  busyHead: "Too many people are measuring right now.",
  busyBody: "Try again in a minute.",
  shareText: (n: string, p: string) => `I merged ${n} PRs in 30 days. That's ${p} of @poteto.`,
  shareTextAhead: (n: string) => `I merged ${n} PRs in 30 days. I'm the poteto now.`,
  langSuggest: "¿Preferís verlo en español?",
  potetoHead: "@poteto merged 2,000 PRs in 30 days.",
  potetoBody: (n: string) =>
    `Most of those PRs are in private repos, so the public count for the last 30 days is only ${n}. This site uses the 2,000 from the talk.`,
  potetoEmbed: "Watch the talk on X",
  watchTalk: "Watch the talk if you haven't!",
  botsHead: "And everyone is behind the bots.",
  botsSub: "Merged PRs in the same 30 days. The agents count only the PRs they open with their own account.",
  you: "you",
  tryAnother: "Try another username →",
};

export type Dict = typeof en;

const es: Dict = {
  siteName: "¿Cuántos PRs?",
  github: "GitHub",
  githubLabel: "Código fuente en GitHub",
  themeLabel: "Cambiar entre tema claro y oscuro",
  hero: "@poteto shippeó 2.000 PRs en 30 días.",
  askLabel: "¿Cuántos shippeaste vos?",
  measure: "Medir",
  hint: "Solo repos públicos. Los PRs que abren bots o agentes con su propia cuenta cuentan para el bot, no para vos. Los resultados se actualizan cada 12 horas.",
  recent: "Medidos hace poco",
  recentKey: (cell) => `= ${cell} PRs mergeados. El hueco después de 20 celdas es un poteto.`,
  foot1: "Los 2.000 de @poteto salen de la charla. No escaneamos la cuenta de @poteto.",
  foot2: "Hecho por fans. Sin relación con GitHub ni @poteto.",
  invalidLogin: "Ingresá un usuario de GitHub.",
  behindHead: (n, p) => `Mergeaste ${n} PRs. Eso es el ${p} de @poteto.`,
  aheadHead: (n) => `Mergeaste ${n} PRs. Ahora el poteto sos vos.`,
  gridCap: "Un poteto: 2.000 celdas, una por PR. Las verdes son tuyas.",
  shareLabel: "Así se ve tu link cuando lo compartís",
  post: "Compartir en X",
  copy: "Copiar link",
  copied: "Link copiado",
  updated: (h) => (h < 1 ? "Actualizado hace menos de una hora." : `Actualizado hace ${h} h.`),
  refresh: "Actualizar",
  refreshIn: (m) => `Podés actualizar en ${m} min.`,
  merged: "PRs mergeados",
  ofPoteto: "de un poteto",
  rank: (total) => `puesto, de ${total} medidos`,
  topRepo: (repo, n) => `Repo con más PRs: ${repo} (${n}).`,
  lines: (a, d) => `Líneas: +${a} / −${d}.`,
  perDay: (cell) => `Tus PRs mergeados por día · ■ = ${cell} PR${cell > 1 ? "s" : ""}`,
  loading: "Contando tus PRs…",
  close: "Cerca de tu número",
  punchBehind: "Tranqui, no sos el único que va atrás.",
  punchAhead: "Vas adelante de @poteto. Igual vas atrás de un bot.",
  punchLegend: (d, who, p) => `@dependabot mergeó ${d} PRs en los mismos 30 días. ${who} el ${p} de un dependabot.`,
  punchWhoBehind: "@poteto es",
  punchWhoAhead: "Vos sos",
  shadow: "Tranqui, @poteto es igual que vos:",
  shadowAhead: "Tranqui, sos igual que @poteto:",
  shadowLink: "los dos viven a la sombra de otro usuario.",
  orgHead: "Esta cuenta no puede correr.",
  orgBody: (login) => `@${login} es una organización. Las organizaciones no abren pull requests. Ingresá el usuario de una persona.`,
  missingHead: "No hay caballo en esta carrera.",
  missingBody: (login) => `No hay ningún usuario de GitHub llamado @${login}. Revisá cómo lo escribiste y probá de nuevo.`,
  busyHead: "Hay demasiada gente midiendo ahora.",
  busyBody: "Probá de nuevo en un minuto.",
  shareText: (n, p) => `Mergeé ${n} PRs en 30 días. Eso es el ${p} de @poteto.`,
  shareTextAhead: (n) => `Mergeé ${n} PRs en 30 días. Ahora el poteto soy yo.`,
  langSuggest: "Prefer English?",
  potetoHead: "@poteto mergeó 2.000 PRs en 30 días.",
  potetoBody: (n) =>
    `La mayoría de esos PRs están en repos privados, así que el conteo público de los últimos 30 días es de solo ${n}. Este sitio usa los 2.000 de la charla.`,
  potetoEmbed: "Mirá la charla en X",
  watchTalk: "¡Mirá la charla si todavía no la viste!",
  botsHead: "Y todos van atrás de los bots.",
  botsSub: "PRs mergeados en los mismos 30 días. Los agentes solo cuentan los PRs que abren con su propia cuenta.",
  you: "vos",
  tryAnother: "Probá con otro usuario →",
};

export const dict = (lang: Lang): Dict => (lang === "es" ? es : en);
