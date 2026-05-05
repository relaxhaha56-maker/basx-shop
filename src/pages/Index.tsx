import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useSettings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductCard, Product } from "@/components/ProductCard";
import { ShoppingBag, Wallet, History, MessageCircle, Megaphone } from "lucide-react";

type Announcement = { id: string; title: string; body: string | null };

const Index = () => {
  const settings = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    supabase.from("products").select("*, categories(name, platform)").eq("active", true).order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setProducts((data as any) || []));
    supabase.from("announcements").select("*").eq("active", true).order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => setAnnouncements((data as any) || []));
  }, []);

  const quick = [
    { icon: ShoppingBag, label: "เลือกสินค้า", to: "/shop" },
    { icon: Wallet, label: "เติมเงิน", to: "/topup" },
    { icon: History, label: "ประวัติ", to: "/history" },
    { icon: MessageCircle, label: "ติดต่อเรา", to: "/contact" },
  ];

  return (
    <div className="container py-8 sm:py-12 space-y-12">
      {/* Hero */}
      <section className="grid lg:grid-cols-3 gap-6">
        <Card
          className={`lg:col-span-2 p-8 sm:p-12 gradient-card border-glow relative overflow-hidden animate-glow-pulse ${settings?.hero_bg_url ? "hero-bg" : ""}`}
          style={settings?.hero_bg_url ? {
            backgroundImage: `url(${settings.hero_bg_url})`,
            ['--hero-overlay' as any]: settings.hero_overlay_opacity ?? 0.6,
          } : undefined}
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative z-[1]">
            {settings?.logo_url && <img src={settings.logo_url} alt="logo" className="h-12 mb-3" />}
            <p className="text-sm uppercase tracking-[0.3em] text-primary text-glow mb-3">Premium Gaming Shop</p>
            <h1 className="font-display text-4xl sm:text-6xl font-black mb-4">{settings?.hero_title ?? settings?.shop_name ?? "BasX SHOP"}</h1>
            <p className="text-lg text-muted-foreground mb-6 max-w-xl">{settings?.hero_subtitle ?? settings?.banner_text ?? "ยินดีต้อนรับ"}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground font-semibold shadow-glow">
                <Link to="/shop">เริ่มช้อปเลย</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                <Link to="/topup">เติมเงิน</Link>
              </Button>
            </div>
          </div>
        </Card>
        <Card className="p-6 gradient-card border-border">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold">ประกาศ</h2>
          </div>
          <div className="space-y-3 max-h-72 overflow-auto">
            {announcements.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีประกาศ</p>}
            {announcements.map(a => (
              <div key={a.id} className="p-3 rounded-lg bg-secondary border border-border">
                <p className="font-semibold text-sm text-primary">{a.title}</p>
                {a.body && <p className="text-xs text-muted-foreground mt-1">{a.body}</p>}
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quick.map(q => (
          <Link key={q.to} to={q.to} className="group">
            <Card className="p-6 text-center gradient-card hover-lift hover-glow border-border">
              <q.icon className="h-8 w-8 mx-auto mb-2 text-primary group-hover:scale-110 transition" />
              <p className="font-semibold text-sm">{q.label}</p>
            </Card>
          </Link>
        ))}
      </section>

      {/* Recommended products */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">สินค้าแนะนำ</h2>
            <p className="text-muted-foreground text-sm">รายการสินค้าขายดีล่าสุด</p>
          </div>
          <Link to="/shop" className="text-sm text-primary hover:text-glow">ดูทั้งหมด →</Link>
        </div>
        {products.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground gradient-card">ยังไม่มีสินค้า — แอดมินสามารถเพิ่มในหน้า Admin</Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
