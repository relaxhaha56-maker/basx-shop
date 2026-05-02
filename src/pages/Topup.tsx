import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Wallet, Upload, Image as ImageIcon, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";

type TR = { id: string; amount: number; status: string; created_at: string; topup_type: string; auto_verified: boolean };

const Topup = () => {
  const { user, profile, refreshProfile } = useAuth();
  const settings = useSettings();
  const nav = useNavigate();
  const [history, setHistory] = useState<TR[]>([]);

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

  return (
    <div className="container py-10 grid lg:grid-cols-2 gap-6 max-w-5xl">
      <Card className="p-6 gradient-card border-glow">
        <h1 className="font-display text-2xl font-bold mb-1">เติมเงินเข้า Wallet</h1>
        <p className="text-sm text-muted-foreground mb-6">เลือกช่องทางที่สะดวก</p>

        <Tabs defaultValue="bank">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="bank">🏦 โอนธนาคาร</TabsTrigger>
            <TabsTrigger value="truemoney">🧧 TrueMoney ซอง</TabsTrigger>
          </TabsList>
          <TabsContent value="bank"><BankForm onDone={() => { load(); refreshProfile(); }} /></TabsContent>
          <TabsContent value="truemoney"><TrueMoneyForm onDone={() => { load(); refreshProfile(); }} /></TabsContent>
        </Tabs>
      </Card>

      <Card className="p-6 gradient-card border-border">
        <h2 className="font-display text-xl font-bold mb-1">ยอด Wallet ของคุณ</h2>
        <p className="text-3xl font-black text-primary text-glow">฿{Number(profile?.wallet_balance ?? 0).toFixed(2)}</p>

        <h3 className="mt-6 mb-3 font-semibold">ประวัติการเติม</h3>
        <div className="space-y-2 max-h-96 overflow-auto">
          {history.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีรายการ</p>}
          {history.map(h => (
            <div key={h.id} className="p-3 rounded-lg bg-secondary border border-border flex justify-between items-center text-sm">
              <div>
                <p className="font-semibold">{h.topup_type === "truemoney" ? "🧧" : "🏦"} ฿{Number(h.amount).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("th-TH")}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                h.status === "approved" ? "bg-primary/20 text-primary" :
                h.status === "rejected" ? "bg-destructive/20 text-destructive" :
                "bg-secondary text-muted-foreground border border-border"
              }`}>{h.status === "approved" ? (h.auto_verified ? "อัตโนมัติ ✓" : "อนุมัติแล้ว") : h.status === "rejected" ? "ปฏิเสธ" : "รออนุมัติ"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const BankForm = ({ onDone }: { onDone: () => void }) => {
  const { user } = useAuth();
  const settings = useSettings();
  const [amount, setAmount] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState("");
  const [busy, setBusy] = useState(false);

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("คัดลอกแล้ว"); };

  const onFile = (f: File) => {
    if (f.size > 5 * 1024 * 1024) return toast.error("ไฟล์ใหญ่เกิน 5 MB");
    if (!f.type.startsWith("image/")) return toast.error("ต้องเป็นรูปภาพ");
    setSlipFile(f);
    setSlipPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return toast.error("กรอกจำนวนเงินให้ถูกต้อง");
    if (!slipFile) return toast.error("กรุณาแนบสลิป");
    setBusy(true);
    try {
      // Upload slip
      const ext = slipFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("slips").upload(path, slipFile);
      if (upErr) throw upErr;

      // Create topup
      const { data: tr, error } = await supabase.from("topup_requests").insert({
        user_id: user.id, amount: amt, slip_url: path, topup_type: "bank",
      }).select().single();
      if (error) throw error;

      // Try auto-verify
      if (settings?.easyslip_enabled) {
        const { data, error: vErr } = await supabase.functions.invoke("verify-slip", { body: { topup_id: tr.id } });
        if (!vErr && data?.ok && data?.status === "approved") {
          toast.success(`เติมสำเร็จอัตโนมัติ! +฿${data.amount}`);
        } else {
          toast.success("ส่งสลิปแล้ว — รอแอดมินตรวจสอบ");
        }
      } else {
        toast.success("ส่งสลิปแล้ว — รอแอดมินตรวจสอบ");
      }

      setAmount(""); setSlipFile(null); setSlipPreview("");
      onDone();
    } catch (e: any) {
      toast.error(e.message || "เกิดข้อผิดพลาด");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4 mt-4">
      <div className="rounded-xl p-5 bg-secondary border border-primary/30 space-y-3">
        <div className="flex items-center gap-2 text-primary"><Wallet className="h-4 w-4" /><span className="font-semibold">โอนผ่านธนาคาร</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">ธนาคาร</span><span className="font-semibold">{settings?.bank_name}</span></div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">เลขบัญชี</span>
          <button type="button" onClick={() => copy(settings?.bank_account_number || "")} className="font-semibold text-primary text-glow flex items-center gap-2">
            {settings?.bank_account_number} <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex justify-between"><span className="text-muted-foreground">ชื่อบัญชี</span><span className="font-semibold">{settings?.bank_account_name}</span></div>
      </div>

      <div className="space-y-2">
        <Label>จำนวนเงิน (บาท)</Label>
        <Input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label>แนบสลิป (รูปภาพ ≤5MB) <span className="text-destructive">*</span></Label>
        <div className="flex items-center gap-3">
          <div className="h-24 w-24 rounded bg-secondary overflow-hidden shrink-0 flex items-center justify-center border border-border">
            {slipPreview ? <img src={slipPreview} className="w-full h-full object-cover" alt=""/> : <ImageIcon className="h-6 w-6 text-muted-foreground"/>}
          </div>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0] && onFile(e.target.files[0])} />
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-secondary border border-border text-sm hover:bg-secondary/80">
              <Upload className="h-4 w-4"/>เลือกรูปสลิป
            </span>
          </label>
        </div>
        {settings?.easyslip_enabled && <p className="text-xs text-primary">⚡ เปิดระบบตรวจสลิปอัตโนมัติ — เติมทันทีถ้าสลิปถูกต้อง</p>}
      </div>

      <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground font-semibold">
        {busy ? "กำลังส่ง..." : "ส่งสลิป"}
      </Button>
    </form>
  );
};

const TrueMoneyForm = ({ onDone }: { onDone: () => void }) => {
  const settings = useSettings();
  const [voucherUrl, setVoucherUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherUrl.trim()) return toast.error("วางลิงก์ซอง");
    if (!settings?.truemoney_enabled) return toast.error("ระบบ TrueMoney ปิดอยู่");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-truemoney", { body: { voucher_url: voucherUrl.trim() } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "รับซองไม่สำเร็จ");
      toast.success(`เติมสำเร็จ! +฿${data.amount}`);
      setVoucherUrl("");
      onDone();
    } catch (e: any) {
      toast.error(e.message || "รับซองไม่สำเร็จ");
    } finally { setBusy(false); }
  };

  if (!settings?.truemoney_enabled) {
    return <div className="mt-6 p-4 rounded-lg bg-secondary border border-border text-sm text-muted-foreground text-center">
      ระบบ TrueMoney ปิดอยู่ในตอนนี้
    </div>;
  }

  return (
    <form onSubmit={submit} className="space-y-4 mt-4">
      <div className="rounded-xl p-5 bg-secondary border border-primary/30 space-y-2">
        <div className="flex items-center gap-2 text-primary"><Gift className="h-4 w-4"/><span className="font-semibold">รับซอง TrueMoney อัตโนมัติ</span></div>
        <p className="text-xs text-muted-foreground">วางลิงก์ซองของขวัญด้านล่าง ระบบจะรับซองและเติม Wallet ทันที</p>
      </div>
      <div className="space-y-2">
        <Label>ลิงก์ซองของขวัญ</Label>
        <Input value={voucherUrl} onChange={e=>setVoucherUrl(e.target.value)} placeholder="https://gift.truemoney.com/campaign/?v=..." required />
      </div>
      <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground font-semibold">
        {busy ? "กำลังรับซอง..." : "รับซอง & เติม Wallet"}
      </Button>
    </form>
  );
};

export default Topup;
