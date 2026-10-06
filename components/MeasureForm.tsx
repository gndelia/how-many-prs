"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { isValidLogin } from "@/lib/github";
import { localePath, type Lang } from "@/lib/i18n";

type Props = { lang: Lang; label: string; button: string; measuring: string; hint: string; invalid: string; defaultValue?: string };

export function MeasureForm({ lang, label, button, measuring, hint, invalid, defaultValue = "" }: Props) {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setTick((t) => t + 1), 400);
    return () => clearInterval(id);
  }, [pending]);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const login = String(new FormData(e.currentTarget).get("login") ?? "").trim().replace(/^@/, "");
    if (!isValidLogin(login)) return setError(true);
    setTick(0);
    startTransition(() => router.push(localePath(lang, `/u/${login.toLowerCase()}`)));
  }

  const dots = 3 - (tick % 4);

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
        <button type="submit" disabled={pending}>
          {pending ? (
            <>
              {measuring}
              {".".repeat(dots)}
              <span aria-hidden="true" style={{ visibility: "hidden" }}>
                {".".repeat(3 - dots)}
              </span>
            </>
          ) : (
            button
          )}
        </button>
      </div>
      {error ? <p className="err">{invalid}</p> : <span className="meta">{hint}</span>}
    </form>
  );
}
