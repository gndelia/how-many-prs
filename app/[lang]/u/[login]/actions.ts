"use server";

import { revalidatePath } from "next/cache";
import { deps } from "@/lib/deps";
import { isValidLogin } from "@/lib/github";
import { LOCALES } from "@/lib/i18n";
import { refresh } from "@/lib/snapshot";

export async function refreshUser(login: string) {
  if (!isValidLogin(login)) return;
  const result = await refresh(deps(), login);
  if (!result.ok) return;
  for (const lang of LOCALES) revalidatePath(`/${lang}/u/${login.toLowerCase()}`);
}
