import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Copy, Key, LinkIcon } from "lucide-react";
import { toast } from "sonner";

type Order = { id: string; product_name: string; price_paid: number; delivered_key: string | null; delivered_link: string | null; created_at: string };

const History = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data as any) || []));
  }, [user]);

  if (!user) return (
    <div className="container py-16 text-center">
      <Card className="p-10 gradient-card max-w-md mx-auto"><p className="mb-4">กรุณาเข้าสู่ระบบ</p>
      <Button onClick={() => nav("/auth")} className="gradient-primary text-primary-foreground">เข้าสู่ระบบ</Button></Card>
    </div>
  );

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("คัดลอกแล้ว"); };

  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="font-display text-3xl font-bold mb-2">ประวัติการสั่งซื้อ</h1>
      <p className="text-muted-foreground mb-6">รหัส/ลิงก์ที่คุณซื้อจะอยู่ที่นี่ตลอดไป</p>
      <div className="space-y-4">
        {orders.length === 0 && <Card className="p-10 text-center text-muted-foreground gradient-card">ยังไม่มีคำสั่งซื้อ</Card>}
        {orders.map(o => (
          <Card key={o.id} className="p-5 gradient-card border-border">
            <div className="flex flex-wrap justify-between gap-2 mb-3">
              <div>
                <h3 className="font-bold">{o.product_name}</h3>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("th-TH")}</p>
              </div>
              <span className="text-primary font-bold text-glow">฿{Number(o.price_paid).toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              {o.delivered_key && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-primary/30">
                  <Key className="h-4 w-4 text-primary shrink-0" />
                  <code className="flex-1 text-sm break-all">{o.delivered_key}</code>
                  <Button size="sm" variant="ghost" onClick={() => copy(o.delivered_key!)}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              )}
              {o.delivered_link && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-primary/30">
                  <LinkIcon className="h-4 w-4 text-primary shrink-0" />
                  <a href={o.delivered_link} target="_blank" rel="noreferrer" className="flex-1 text-sm break-all text-primary hover:underline">{o.delivered_link}</a>
                  <Button size="sm" variant="ghost" onClick={() => copy(o.delivered_link!)}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              )}
              {!o.delivered_key && !o.delivered_link && <p className="text-sm text-muted-foreground">ไม่มีข้อมูลการจัดส่ง</p>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default History;
