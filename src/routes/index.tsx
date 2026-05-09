import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, MapPin, Clock, Truck, Wrench, ShieldCheck, Star, ArrowRight, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-tow.jpg";
import flatbedImg from "@/assets/service-flatbed.jpg";
import roadsideImg from "@/assets/service-roadside.jpg";
import transportImg from "@/assets/service-transport.jpg";

export const Route = createFileRoute("/")({
  component: Home,
});

const PHONES = [
  { label: "Acil Hat 1", value: "0535 874 57 71", tel: "+905358745771" },
  { label: "Acil Hat 2", value: "0553 550 41 47", tel: "+905535504147" },
];

const SERVICES = [
  { icon: Truck, title: "Şehir İçi Çekici", desc: "Mersin il sınırları içinde hızlı ve güvenli araç çekme.", img: flatbedImg },
  { icon: Wrench, title: "Yol Yardım", desc: "Akü takviyesi, lastik değişimi, benzin ikmali ve daha fazlası.", img: roadsideImg },
  { icon: ShieldCheck, title: "Şehirler Arası Transfer", desc: "Lüks ve standart araçlar için güvenli uzun mesafe taşıma.", img: transportImg },
];

const TESTIMONIALS = [
  { name: "Mehmet K.", text: "Gece 2'de yolda kaldım, 20 dakikada geldiler. Hem fiyat çok uygundu hem de aracıma çok dikkat ettiler. Tavsiye ederim.", rating: 5 },
  { name: "Ayşe Y.", text: "Mersin'de en güvendiğim çekici firması. Profesyonel, zamanında ve nazik bir ekip. Teşekkürler Aydoğdu!", rating: 5 },
  { name: "Burak D.", text: "Otoyolda kaza yaptım, çok stresliydim. Telefonda bile rahatlattılar, aracımı sorunsuz teslim ettiler.", rating: 5 },
  { name: "Selin A.", text: "Aküm bitmişti, 15 dakika içinde geldiler ve çalıştırdılar. Fiyat son derece makuldü.", rating: 5 },
  { name: "Hakan T.", text: "Adana'dan Mersin'e aracımı taşıttım, tek çizik bile olmadı. İşinin ehli insanlar.", rating: 5 },
  { name: "Zeynep B.", text: "Her saatte ulaşılabilir olmaları büyük avantaj. Bir kez aradıktan sonra başka çekici aramadım.", rating: 5 },
];

function Home() {
  const [gallery, setGallery] = useState<{ id: string; image_url: string; caption: string | null }[]>([]);

  useEffect(() => {
    supabase.from("gallery_images").select("id,image_url,caption").order("sort_order").then(({ data }) => {
      if (data) setGallery(data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <img src={heroImg} alt="Aydoğdu Oto Kurtarma çekici aracı" width={1920} height={1080} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-background/55" />
        <div className="container relative mx-auto px-6 py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 border border-primary/30 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Clock className="h-4 w-4" /> 7 Gün 24 Saat Hizmet
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-foreground text-shadow-strong leading-[1.05] mb-6">
              Mersin'de <span className="text-primary">Güvendiğiniz</span><br />Oto Kurtarma
            </h1>
            <p className="text-lg md:text-xl text-foreground/90 text-shadow-strong max-w-2xl mb-10">
              Aydoğdu Oto Kurtarma — yolda kaldığınız her an, her yerde yanınızdayız. Hızlı, profesyonel ve uygun fiyatlı çekici hizmeti.
            </p>
            <div className="flex flex-wrap gap-4">
              {PHONES.map((p) => (
                <a key={p.tel} href={`tel:${p.tel}`} className="group inline-flex items-center gap-3 rounded-xl bg-gradient-amber px-6 py-4 text-primary-foreground font-semibold shadow-glow hover:scale-[1.03] transition-transform">
                  <Phone className="h-5 w-5" />
                  <span className="text-left leading-tight">
                    <span className="block text-xs opacity-80">{p.label}</span>
                    <span className="block text-lg">{p.value}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="hizmetler" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <SectionHead eyebrow="Hizmetlerimiz" title="Yolda Kaldığınız Her An, Yanınızdayız" />
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {SERVICES.map((s) => (
              <article key={s.title} className="group rounded-2xl overflow-hidden bg-card border border-border shadow-card hover:border-primary/50 transition-all">
                <div className="relative h-56 overflow-hidden">
                  <img src={s.img} alt={s.title} loading="lazy" width={1024} height={768} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 h-12 w-12 rounded-xl bg-gradient-amber flex items-center justify-center shadow-glow">
                    <s.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-semibold mb-2">{s.title}</h3>
                  <p className="text-muted-foreground">{s.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="galeri" className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <SectionHead eyebrow="Galeri" title="İşlerimizden Kareler" />
          {gallery.length === 0 ? (
            <div className="mt-12 text-center py-16 rounded-2xl border border-dashed border-border bg-card/50">
              <p className="text-muted-foreground">Galeri yakında eklenecek görsellerle dolacak.</p>
            </div>
          ) : (
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.map((g) => (
                <figure key={g.id} className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted border border-border shadow-card">
                  <img src={g.image_url} alt={g.caption || "Galeri görseli"} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {g.caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-4 text-sm text-foreground">
                      {g.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="yorumlar" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <SectionHead eyebrow="Müşteri Yorumları" title="Mersinlilerin Güvendiği Çekici" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {TESTIMONIALS.map((t, i) => (
              <article key={i} className="rounded-2xl bg-card border border-border p-6 shadow-card hover:border-primary/40 transition-colors">
                <Quote className="h-8 w-8 text-primary mb-4" />
                <p className="text-foreground/90 mb-6 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t.name}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, k) => (
                      <Star key={k} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="iletisim" className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <SectionHead eyebrow="İletişim" title="Bize Ulaşın" />
          <div className="grid md:grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto">
            {PHONES.map((p) => (
              <a key={p.tel} href={`tel:${p.tel}`} className="rounded-2xl bg-gradient-amber p-8 text-primary-foreground shadow-glow hover:scale-[1.02] transition-transform">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                    <Phone className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-sm opacity-80">{p.label}</div>
                    <div className="text-3xl font-bold">{p.value}</div>
                  </div>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
                  Hemen Ara <ArrowRight className="h-4 w-4" />
                </div>
              </a>
            ))}
            <div className="md:col-span-2 rounded-2xl bg-card border border-border p-8 flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Hizmet Bölgemiz</div>
                <div className="text-2xl font-semibold">Mersin ve Çevresi</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 bg-background">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p className="font-display text-lg text-foreground mb-2">AYDOĞDU OTO KURTARMA</p>
          <p>© {new Date().getFullYear()} Mersin · 7/24 Hizmet · <Link to="/admin" className="hover:text-primary">Yönetim</Link></p>
        </div>
      </footer>
    </div>
  );
}

function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-amber flex items-center justify-center shadow-glow">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg tracking-wide">AYDOĞDU</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#hizmetler" className="hover:text-primary transition-colors">Hizmetler</a>
          <a href="#galeri" className="hover:text-primary transition-colors">Galeri</a>
          <a href="#yorumlar" className="hover:text-primary transition-colors">Yorumlar</a>
          <a href="#iletisim" className="hover:text-primary transition-colors">İletişim</a>
        </nav>
        <a href="tel:+905358745771" className="inline-flex items-center gap-2 rounded-lg bg-gradient-amber px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
          <Phone className="h-4 w-4" /> Ara
        </a>
      </div>
    </header>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <span className="inline-block text-sm font-semibold tracking-widest text-primary uppercase mb-3">{eyebrow}</span>
      <h2 className="text-4xl md:text-5xl font-bold">{title}</h2>
    </div>
  );
}
