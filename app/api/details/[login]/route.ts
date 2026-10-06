import { deps } from "@/lib/deps";
import { isValidLogin } from "@/lib/github";
import { ensureDetails } from "@/lib/snapshot";

export async function GET(_request: Request, { params }: RouteContext<"/api/details/[login]">) {
  const { login } = await params;
  if (!isValidLogin(login)) return Response.json({ error: "invalid login" }, { status: 400 });
  const details = await ensureDetails(deps(), login);
  if (!details) return Response.json({ error: "not found" }, { status: 404 });
  if (details === "busy") return Response.json({ error: "busy" }, { status: 503, headers: { "cache-control": "no-store" } });
  return Response.json(details, { headers: { "cache-control": "public, s-maxage=43200, stale-while-revalidate=3600" } });
}
