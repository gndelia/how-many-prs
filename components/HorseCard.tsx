import { CSS_THEME, renderCard, type Racer } from "@/lib/card";
import type { Lang } from "@/lib/i18n";

type Props = { reference: Racer; subject: Racer; lang: Lang; id: string };

export function HorseCard({ reference, subject, lang, id }: Props) {
  const card = (compact: boolean) =>
    renderCard({ reference, subject, locale: lang, theme: CSS_THEME, compact, idPrefix: `${id}${compact ? "c" : "w"}` });
  return (
    <div className="og-frame">
      <div className="cw" dangerouslySetInnerHTML={{ __html: card(false) }} />
      <div className="cn" dangerouslySetInnerHTML={{ __html: card(true) }} />
    </div>
  );
}
