"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { isValidLogin } from "@/lib/github";
import { localePath, type Lang } from "@/lib/i18n";

type Props = { lang: Lang; label: string; button: string; hint: string; invalid: string; defaultValue?: string };

export function MeasureForm({ lang, label, button, hint, invalid, defaultValue = "" }: Props) {
  const router = useRouter();
  const [error, setError] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const login = String(new FormData(e.currentTarget).get("login") ?? "").trim().replace(/^@/, "");
    if (!isValidLogin(login)) return setError(true);
    router.push(localePath(lang, `/u/${login.toLowerCase()}`));
  }

  return (
    <form className="measure" onSubmit={submit}>
      <label htmlFor="login">{label}</label>
      <div className="field">
        <span className="prefix">github.com/</span>
        <input
          id="login"
          name="login"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          defaultValue={defaultValue}
          aria-invalid={error}
          onInput={() => setError(false)}
        />
        <button type="submit">{button}</button>
      </div>
      {error ? <p className="err">{invalid}</p> : <span className="meta">{hint}</span>}
    </form>
  );
}
