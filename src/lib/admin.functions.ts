import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type Attempt = { count: number; firstAt: number; lockedUntil: number };
const attempts = new Map<string, Attempt>();

function getClientIp(): string {
  try {
    // dynamic to avoid SSR issues during module load
    const { getRequestHeader } = require("@tanstack/react-start/server") as typeof import("@tanstack/react-start/server");
    return (
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip") ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (a?.lockedUntil && a.lockedUntil > now) {
    throw new Error("Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.");
  }
  if (a && now - a.firstAt > RATE_WINDOW_MS) attempts.delete(ip);
}

function recordFailure(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip) ?? { count: 0, firstAt: now, lockedUntil: 0 };
  a.count += 1;
  if (a.count >= RATE_MAX_ATTEMPTS) a.lockedUntil = now + LOCKOUT_MS;
  attempts.set(ip, a);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(payload: string): Promise<Uint8Array> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET tanımlı değil.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return new Uint8Array(sig);
}

async function issueToken(): Promise<string> {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = String(exp);
  const sig = await hmac(payload);
  return `${payload}.${b64url(sig)}`;
}

async function verifyToken(token: string): Promise<void> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) throw new Error("Oturum geçersiz.");
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Date.now()) throw new Error("Oturum süresi doldu.");
  const expected = await hmac(payload);
  const got = b64urlDecode(sig);
  if (!constantTimeEqual(expected, got)) throw new Error("Oturum geçersiz.");
}

export const adminVerify = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ password: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const ip = getClientIp();
    checkRateLimit(ip);
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("Yönetici şifresi yapılandırılmamış.");
    const a = new TextEncoder().encode(data.password);
    const b = new TextEncoder().encode(expected);
    if (!constantTimeEqual(a, b)) {
      recordFailure(ip);
      throw new Error("Şifre hatalı.");
    }
    attempts.delete(ip);
    const token = await issueToken();
    return { ok: true as const, token, expiresAt: Date.now() + TOKEN_TTL_MS };
  });

export const adminUpload = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      token: z.string().min(1),
      fileBase64: z.string().min(1),
      filename: z.string().min(1),
      contentType: z.string().min(1),
      caption: z.string().max(300).nullable().optional(),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    await verifyToken(data.token);
    const ext = ALLOWED_TYPES[data.contentType];
    if (!ext) throw new Error("Geçersiz dosya türü. Yalnızca JPG, PNG, WEBP, GIF.");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
    if (bytes.length > 8 * 1024 * 1024) throw new Error("Dosya 8MB'tan büyük olamaz.");
    const { error: upErr } = await supabaseAdmin.storage
      .from("gallery")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { data: { publicUrl } } = supabaseAdmin.storage.from("gallery").getPublicUrl(path);
    const { error: insErr } = await supabaseAdmin
      .from("gallery_images")
      .insert({ image_url: publicUrl, caption: data.caption || null });
    if (insErr) throw new Error(insErr.message);
    return { ok: true };
  });

export const adminDelete = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ token: z.string().min(1), id: z.string().uuid(), imageUrl: z.string().url() }).parse(data),
  )
  .handler(async ({ data }) => {
    await verifyToken(data.token);
    const path = data.imageUrl.split("/gallery/")[1];
    if (path) await supabaseAdmin.storage.from("gallery").remove([path]);
    const { error } = await supabaseAdmin.from("gallery_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });