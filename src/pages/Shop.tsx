import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, Product } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Cat = { id: string; name: string; slug: string; platform: string | null };

const Shop = () => {
  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCats((data as any) || []));
  }, []);

  useEffect(() => {
    let q = supabase.from("products").select("*, categories(name, platform)").eq("active", true).order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("category_id", filter);
    q.then(({ data }) => setProducts((data as any) || []));
  }, [filter]);

  return (
    <div className="container py-10 space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">ร้านค้า</h1>
        <p className="text-muted-foreground">เลือกหมวดหมู่ที่ต้องการ</p>
      </div>
      <Card className="p-3 gradient-card border-border flex flex-wrap gap-2">
        <Button variant={filter === "all" ? "default" : "ghost"} size="sm" onClick={() => setFilter("all")}
          className={filter==="all" ? "gradient-primary text-primary-foreground" : ""}>ทั้งหมด</Button>
        {cats.map(c => (
          <Button key={c.id} variant={filter === c.id ? "default" : "ghost"} size="sm" onClick={() => setFilter(c.id)}
            className={filter===c.id ? "gradient-primary text-primary-foreground" : ""}>{c.name}</Button>
        ))}
      </Card>
      {products.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground gradient-card">ไม่มีสินค้าในหมวดนี้</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};

export default Shop;
