import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Upload, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Yönetim · Aydoğdu Oto Kurtarma" }, { name: "robots", content: "noindex,nofollow" }] }),
});

type GalleryRow = { id: string; image_url: string; caption: string | null };

function Admin() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gallery, setGallery] = useState<GalleryRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  // login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const refresh = async () => {
    const { data } = await supabase.from("gallery_images").select("id,image_url,caption").order("created_at", { ascending: false });
    setGallery(data ?? []);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
        setIsAdmin(!!roleData);
        await refresh();
      }
      setLoading(false);
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return toast.error(error.message);
    toast.success("Giriş başarılı");
    window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("gallery").getPublicUrl(path);
      const { error: insErr } = await supabase.from("gallery_images").insert({ image_url: publicUrl, caption: caption || null });
      if (insErr) throw insErr;
      toast.success("Görsel eklendi");
      setCaption("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Yükleme hatası");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (row: GalleryRow) => {
    if (!confirm("Görsel silinsin mi?")) return;
    const path = row.image_url.split("/gallery/")[1];
    if (path) await supabase.storage.from("gallery").remove([path]);
    await supabase.from("gallery_images").delete().eq("id", row.id);
    toast.success("Silindi");
    await refresh();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Yükleniyor...</div>;

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-card">
          <h1 className="text-2xl font-bold mb-1">Yönetim Girişi</h1>
          <p className="text-sm text-muted-foreground mb-6">Sadece yetkili kullanıcılar.</p>
          <label className="block text-sm font-medium mb-1">E-posta</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-4 rounded-lg bg-input border border-border px-3 py-2 text-foreground" />
          <label className="block text-sm font-medium mb-1">Şifre</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-6 rounded-lg bg-input border border-border px-3 py-2 text-foreground" />
          <button type="submit" className="w-full rounded-lg bg-gradient-amber py-2.5 font-semibold text-primary-foreground shadow-glow">Giriş Yap</button>
          <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-3 w-3" /> Siteye dön</Link>
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold mb-2">Yetkisiz Erişim</h1>
          <p className="text-muted-foreground mb-6">Hesabınız admin olarak tanımlanmamış. Sahip kişiyle iletişime geçin.</p>
          <button onClick={handleLogout} className="rounded-lg bg-secondary px-4 py-2 text-sm">Çıkış Yap</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-display font-bold tracking-wide">AYDOĞDU · Yönetim</Link>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
            <LogOut className="h-4 w-4" /> Çıkış
          </button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        <section className="rounded-2xl bg-card border border-border p-6 shadow-card max-w-xl">
          <h2 className="text-xl font-bold mb-4">Yeni Görsel Yükle</h2>
          <input
            type="text"
            placeholder="Açıklama (opsiyonel)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full mb-4 rounded-lg bg-input border border-border px-3 py-2"
          />
          <label className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 py-10 cursor-pointer hover:border-primary/60 transition ${uploading ? "opacity-60" : ""}`}>
            <Upload className="h-5 w-5 text-primary" />
            <span>{uploading ? "Yükleniyor..." : "Görsel seç"}</span>
            <input type="file" accept="image/*" hidden disabled={uploading} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
          </label>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold mb-4">Galeri ({gallery.length})</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {gallery.map((g) => (
              <div key={g.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                <img src={g.image_url} alt={g.caption || ""} className="w-full h-full object-cover" />
                <button onClick={() => handleDelete(g)} className="absolute top-2 right-2 h-9 w-9 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
