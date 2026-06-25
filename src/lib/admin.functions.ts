import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function checkPassword(pw: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("Yönetici şifresi yapılandırılmamış.");
  if (pw !== expected) throw new Error("Şifre hatalı.");
}

export const adminVerify = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ password: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    return { ok: true };
  });

export const adminUpload = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      password: z.string().min(1),
      fileBase64: z.string().min(1),
      filename: z.string().min(1),
      contentType: z.string().min(1),
      caption: z.string().nullable().optional(),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const ext = data.filename.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Uint8Array.from(atob(data.fileBase64), (c) => c.charCodeAt(0));
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
    z.object({ password: z.string().min(1), id: z.string().uuid(), imageUrl: z.string().url() }).parse(data),
  )
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const path = data.imageUrl.split("/gallery/")[1];
    if (path) await supabaseAdmin.storage.from("gallery").remove([path]);
    const { error } = await supabaseAdmin.from("gallery_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });