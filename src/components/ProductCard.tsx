import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Smartphone, Apple, Monitor, Package } from "lucide-react";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  discount_price: number | null;
  delivery_type: string;
  category_id: string | null;
  categories?: { name: string; platform: string | null } | null;
};

const platformIcon = (p?: string | null) => {
  if (p === "android") return <Smartphone className="h-3.5 w-3.5" />;
  if (p === "ios") return <Apple className="h-3.5 w-3.5" />;
  if (p === "pc") return <Monitor className="h-3.5 w-3.5" />;
  return <Package className="h-3.5 w-3.5" />;
};

export const ProductCard = ({ product }: { product: Product }) => {
  const { user, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [stock, setStock] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  const loadStock = async () => {
    const { count } = await supabase
      .from("product_stock")
      .select("*", { count: "exact", head: true })
      .eq("product_id", product.id)
      .eq("sold", false);
    setStock(count || 0);
  };
  useEffect(() => { loadStock(); }, [product.id]);

  const finalPrice = product.discount_price ?? product.price;
  const hasDiscount = product.discount_price != null && product.discount_price < product.price;

  const buy = async () => {
    if (!user) { toast.error("กรุณาเข้าสู่ระบบ"); nav("/auth"); return; }
    if (stock <= 0) { toast.error("สินค้าหมด"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("purchase_product", { _product_id: product.id });
      if (error) throw error;
      toast.success("ซื้อสำเร็จ! ดูรายละเอียดที่หน้าประวัติ");
      await refreshProfile();
      await loadStock();
      nav("/history");
    } catch (e: any) {
      const msg = e.message || "";
      if (msg.includes("insufficient_balance")) toast.error("ยอดเงินไม่พอ — กรุณาเติมเงิน");
      else if (msg.includes("out_of_stock")) toast.error("สินค้าหมด");
      else toast.error(msg || "ซื้อไม่สำเร็จ");
    } finally { setBusy(false); }
  };

  return (
    <Card className="overflow-hidden gradient-card border-border hover-lift hover-glow group flex flex-col">
      <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package className="h-12 w-12" /></div>
        )}
        {product.categories?.platform && (
          <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur text-foreground border-primary/40">
            {platformIcon(product.categories.platform)}<span className="ml-1 uppercase">{product.categories.platform}</span>
          </Badge>
        )}
        {stock <= 0 && <div className="absolute inset-0 bg-background/80 flex items-center justify-center font-display font-bold text-destructive">สินค้าหมด</div>}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold line-clamp-1">{product.name}</h3>
        {product.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{product.description}</p>}
        <div className="mt-3 flex items-baseline gap-2">
          {hasDiscount && <span className="text-xs text-muted-foreground line-through">฿{Number(product.price).toFixed(2)}</span>}
          <span className="text-lg font-bold text-primary text-glow">฿{Number(finalPrice).toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">เหลือ {stock} ชิ้น</p>
        <Button onClick={buy} disabled={busy || stock <= 0} className="mt-3 gradient-primary text-primary-foreground font-semibold w-full">
          {busy ? "กำลังซื้อ..." : "สั่งซื้อ"}
        </Button>
      </div>
    </Card>
  );
};
