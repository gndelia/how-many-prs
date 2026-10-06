import type { Metadata } from "next";
import { Big_Shoulders, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LangSwitch } from "@/components/LangSwitch";
import { THEME_SCRIPT, ThemeToggle } from "@/components/ThemeToggle";
import { dict, hasLang, LOCALES, localePath, REPO } from "@/lib/i18n";
import "../globals.css";

const display = Big_Shoulders({ subsets: ["latin"], weight: ["800", "900"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono" });

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLang(lang)) return {};
  const t = dict(lang);
  return {
    title: t.siteName,
    description: t.hero,
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLang(lang)) notFound();
  const t = dict(lang);
  return (
    <html lang={lang} className={`${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <div className="wrap">
          <header className="site-head">
            <Link className="mark" href={localePath(lang, "/")}>
              {t.siteName}
            </Link>
            <nav className="nav" aria-label="Site">
              <a className="gh" href={REPO} target="_blank" rel="noopener" aria-label={t.githubLabel}>
                <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
                  />
                </svg>
                <span>{t.github}</span>
              </a>
              <ThemeToggle label={t.themeLabel} />
              <LangSwitch lang={lang} />
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
