// Shared helpers for the Listening Room edge functions. STATUS: written, not deployed or run against live services.
import "./ticket-logic.js";                                  // sets globalThis.LRTicket (same file the browser prototype runs)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
export const T: any = (globalThis as any).LRTicket;
export const env = (k: string, d?: string) => Deno.env.get(k) ?? d ?? "";
export const REVEAL_SECONDS = 45;                       // how long a revealed address stays on screen
export const admin = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

const cors = () => ({ "Access-Control-Allow-Origin": env("SITE_ORIGIN", "*"), "Access-Control-Allow-Headers": "content-type, x-door-key", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" });
export const preflight = (req: Request) => req.method === "OPTIONS" ? new Response(null, { status: 204, headers: cors() }) : null;
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors(), "content-type": "application/json", "cache-control": "no-store" } });
export const fail = (code: string, message: string, status = 400) => json({ error: { code, message } }, status);

export async function ipHash(req: Request) {            // salted, so we can show reveal patterns without storing an address
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  return T.sha256Hex(env("IP_SALT", "change-me") + ip);
}
export function newRef(edition = "01") {
  const A = "ABCDEFGHJKMNPQRSTVWXYZ23456789", b = crypto.getRandomValues(new Uint8Array(6));
  return "LR-ED" + edition + "-" + Array.from(b, (x) => A[x % A.length]).join("");
}
export const tokenFor = (id: string, version: number) => T.macToken(env("TOKEN_SECRET"), id, version);

/** Loads a ticket + its event and proves the caller holds the card token. Never returns the address. */
export async function authedTicket(sb: ReturnType<typeof admin>, rid: string, token: string) {
  const { data: t } = await sb.from("tickets").select("*, events(*)").eq("id", rid).maybeSingle();
  if (!t) return { error: fail("not_found", "We could not find that reservation.", 404) };
  if (!token || !T.ctEq(await tokenFor(t.id, t.token_version), token)) return { error: fail("forbidden", "That link is not valid.", 403) };
  return { t, ev: t.events };
}
export function times(ev: any) {
  const start = Date.parse(ev.starts_at), end = Date.parse(ev.ends_at);
  return { start, end, unlockAt: start - ev.unlock_lead_min * 60000, phraseAt: start - ev.door_phrase_lead_min * 60000 };
}
export function effectiveState(t: any, now: number) { return (t.state === "held" || t.state === "pending") && Date.parse(t.hold_until) <= now ? "expired" : t.state; }
