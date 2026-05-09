import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminVerify, adminUpload, adminDelete } from "@/lib/admin.functions";
import { LogOut, Upload, Trash2, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: Admin,
  head: () => ({ meta: [{ title: "Yönetim · Aydoğdu Oto Kurtarma" }, { name: "robots", content: "noindex,nofollow" }] }),
});

const PW_KEY = "aydogdu_admin_pw";
type GalleryRow = { id: string; image_url: string; caption: string | null };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Admin() {
  const verifyFn = useServerFn(adminVerify);
  const uploadFn = useServerFn(adminUpload);
  const deleteFn = useServerFn(adminDelete);

  const [password, setPassword] = useState<string | null>(null);
  const [pwInput, setPwInput] = useState("");
  const [checking, setChecking] = useState(true);
  const [gallery, setGallery] = useState<GalleryRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");

  const refresh = async () => {
    const { data } = await supabase
      .from("gallery_images")
      .select("id,image_url,caption")
      .order("created_at", { ascending: false });
    setGallery(data ?? []);
  };

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(PW_KEY) : null;
    if (!stored) {
      setChecking(false);
      return;
    }
    verifyFn({ data: { password: stored } })
      .then(async () => {
        setPassword(stored);
        await refresh();
      })
      .catch(() => sessionStorage.removeItem(PW_KEY))
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await verifyFn({ data: { password: pwInput } });
      sessionStorage.setItem(PW_KEY, pwInput);
      setPassword(pwInput);
      toast.success("Giriş başarılı");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Giriş başarısız");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(PW_KEY);
    setPassword(null);
    setPwInput("");
  };

  const handleUpload = async (file: File) => {
    if (!file || !password) return;
    setUploading(true);
    try {
      const fileBase64 = await fileToBase64(file);
      await uploadFn({
        data: {
          password,
          fileBase64,
          filename: file.name,
          contentType: file.type || "image/jpeg",
          caption: caption || null,
        },
      });
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
    if (!password) return;
    if (!confirm("Görsel silinsin mi?")) return;
    try {
      await deleteFn({ data: { password, id: row.id, imageUrl: row.image_url } });
      toast.success("Silindi");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silme hatası");
    }
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Yükleniyor...</div>;
  }

  if (!password) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-card">
          <div className="h-12 w-12 rounded-xl bg-gradient-amber flex items-center justify-center shadow-glow mb-4">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Yönetim Girişi</h1>
          <p className="text-sm text-muted-foreground mb-6">Devam etmek için şifrenizi girin.</p>
          <label className="block text-sm font-medium mb-1">Şifre</label>
          <input
            type="password"
            required
            autoFocus
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            className="w-full mb-6 rounded-lg bg-input border border-border px-3 py-2 text-foreground"
          />
          <button type="submit" className="w-full rounded-lg bg-gradient-amber py-2.5 font-semibold text-primary-foreground shadow-glow">
            Giriş Yap
          </button>
          <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3 w-3" /> Siteye dön
          </Link>
        </form>
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
