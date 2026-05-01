import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

type TR = { id: string; amount: number; status: string; created_at: string; slip_note: string | null };

const Topup = () => {
  const { user, profile } = useAuth();
  const settings = useSettings();
  const nav = useNavigate();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<TR[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("topup_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    setHistory((data as any) || []);
  };
  useEffect(() => { load(); }, [user]);

  if (!user) {
    return <div className="container py-16 text-center">
      <Card className="p-10 gradient-card max-w-md mx-auto"><p className="mb-4">กรุณาเข้าสู่ระบบเพื่อเติมเงิน</p>
        <Button onClick={() => nav("/auth")} className="gradient-primary text-primary-foreground">เข้าสู่ระบบ</Button></Card>
    </div>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt < 1) { toast.error("กรอกจำนวนเงินให้ถูกต้อง"); return; }
    setBusy(true);
    const { error } = await supabase.from("topup_requests").insert({ user_id: user.id, amount: amt, slip_note: note || null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("ส่งคำขอเติมเงินแล้ว — รอแอดมินอนุมัติ");
    setAmount(""); setNote(""); load();
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("คัดลอกแล้ว"); };

  return (
    <div className="container py-10 grid lg:grid-cols-2 gap-6 max-w-5xl">
      <Card className="p-6 gradient-card border-glow">
        <h1 className="font-display text-2xl font-bold mb-1">เติมเงินเข้า Wallet</h1>
        <p className="text-sm text-muted-foreground mb-6">โอนเงินตามรายละเอียดแล้วแจ้งจำนวนด้านล่าง</p>

        <div className="rounded-xl p-5 bg-secondary border border-primary/30 space-y-3 mb-6">
          <div className="flex items-center gap-2 text-primary"><Wallet className="h-4 w-4" /><span className="font-semibold">โอนผ่านธนาคาร</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">ธนาคาร</span><span className="font-semibold">{settings?.bank_name}</span></div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">เลขบัญชี</span>
            <button onClick={() => copy(settings?.bank_account_number || "")} className="font-semibold text-primary text-glow flex items-center gap-2">
              {settings?.bank_account_number} <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex justify-between"><span className="text-muted-foreground">ชื่อบัญชี</span><span className="font-semibold">{settings?.bank_account_name}</span></div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>จำนวนเงิน (บาท)</Label>
            <Input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>หมายเหตุ / เลขสลิป (ไม่บังคับ)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} />
          </div>
          <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground font-semibold">
            {busy ? "กำลังส่ง..." : "ส่งคำขอเติมเงิน"}
          </Button>
        </form>
      </Card>

      <Card className="p-6 gradient-card border-border">
        <h2 className="font-display text-xl font-bold mb-1">ยอด Wallet ของคุณ</h2>
        <p className="text-3xl font-black text-primary text-glow">฿{Number(profile?.wallet_balance ?? 0).toFixed(2)}</p>

        <h3 className="mt-6 mb-3 font-semibold">ประวัติการเติม</h3>
        <div className="space-y-2 max-h-80 overflow-auto">
          {history.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีรายการ</p>}
          {history.map(h => (
            <div key={h.id} className="p-3 rounded-lg bg-secondary border border-border flex justify-between items-center text-sm">
              <div>
                <p className="font-semibold">฿{Number(h.amount).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("th-TH")}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                h.status === "approved" ? "bg-primary/20 text-primary" :
                h.status === "rejected" ? "bg-destructive/20 text-destructive" :
                "bg-secondary text-muted-foreground border border-border"
              }`}>{h.status === "approved" ? "อนุมัติแล้ว" : h.status === "rejected" ? "ปฏิเสธ" : "รออนุมัติ"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Topup;
