import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, Check, X, Upload, Image as ImageIcon, Eye } from "lucide-react";

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && (!user || !isAdmin)) nav("/"); }, [user, isAdmin, loading, nav]);
  if (!user || !isAdmin) return <div className="container py-20 text-center text-muted-foreground">กำลังตรวจสอบสิทธิ์...</div>;

  return (
    <div className="container py-8">
      <h1 className="font-display text-3xl font-bold mb-6">หลังบ้าน Admin</h1>
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="settings">ตั้งค่าเว็บ</TabsTrigger>
          <TabsTrigger value="payment">การชำระเงิน</TabsTrigger>
          <TabsTrigger value="appearance">สี & เอฟเฟกต์</TabsTrigger>
          <TabsTrigger value="products">สินค้า</TabsTrigger>
          <TabsTrigger value="categories">หมวดหมู่</TabsTrigger>
          <TabsTrigger value="discounts">โค้ดส่วนลด</TabsTrigger>
          <TabsTrigger value="announcements">ประกาศ</TabsTrigger>
          <TabsTrigger value="topups">เติมเงิน</TabsTrigger>
          <TabsTrigger value="orders">คำสั่งซื้อ</TabsTrigger>
          <TabsTrigger value="users">ผู้ใช้ & Wallet</TabsTrigger>
        </TabsList>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="payment"><PaymentTab /></TabsContent>
        <TabsContent value="appearance"><AppearanceTab /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="discounts"><DiscountsTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
        <TabsContent value="topups"><TopupsTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
      </Tabs>
    </div>
  );
};

const SettingsTab = () => {
  const [s, setS] = useState<any>(null);
  useEffect(() => { supabase.from("site_settings").select("*").eq("id",1).maybeSingle().then(({data}) => setS(data)); }, []);
  if (!s) return <div>กำลังโหลด...</div>;
  const save = async () => {
    const { error } = await supabase.from("site_settings").update(s).eq("id", 1);
    if (error) toast.error(error.message); else toast.success("บันทึกแล้ว — เว็บอัปเดตทันที");
  };
  return (
    <Card className="p-6 gradient-card space-y-4 max-w-2xl">
      <Field label="ชื่อร้าน"><Input value={s.shop_name} onChange={e=>setS({...s, shop_name:e.target.value})} /></Field>
      <Field label="หัวข้อ Hero (หน้าแรก)"><Input value={s.hero_title||""} onChange={e=>setS({...s, hero_title:e.target.value})} /></Field>
      <Field label="ข้อความรอง Hero"><Textarea value={s.hero_subtitle||""} onChange={e=>setS({...s, hero_subtitle:e.target.value})} /></Field>
      <Field label="ข้อความ Banner (เก่า)"><Input value={s.banner_text} onChange={e=>setS({...s, banner_text:e.target.value})} /></Field>
      <Field label="Discord URL"><Input value={s.discord_url} onChange={e=>setS({...s, discord_url:e.target.value})} /></Field>
      <Field label="Footer"><Input value={s.footer_text||""} onChange={e=>setS({...s, footer_text:e.target.value})} /></Field>
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label>แสดงแถบประกาศด้านบนสุด</Label>
          <Switch checked={!!s.show_announcement_bar} onCheckedChange={v=>setS({...s, show_announcement_bar:v})}/>
        </div>
        <Field label="ข้อความแถบประกาศ"><Input value={s.announcement_bar_text||""} onChange={e=>setS({...s, announcement_bar_text:e.target.value})} /></Field>
      </div>
      <Button onClick={save} className="gradient-primary text-primary-foreground">บันทึก</Button>
    </Card>
  );
};

const PaymentTab = () => {
  const [s, setS] = useState<any>(null);
  const [priv, setPriv] = useState<any>(null);
  useEffect(() => {
    supabase.from("site_settings").select("*").eq("id",1).maybeSingle().then(({data}) => setS(data));
    supabase.from("private_settings").select("*").eq("id",1).maybeSingle().then(({data}) =>
      setPriv(data || { id:1, expected_account_name:"", expected_account_number:"", truemoney_phone:"" }));
  }, []);
  if (!s || !priv) return <div>กำลังโหลด...</div>;
  const save = async () => {
    const { error } = await supabase.from("site_settings").update(s).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    const { error: e2 } = await supabase.from("private_settings").upsert({ ...priv, id: 1 });
    if (e2) toast.error(e2.message); else toast.success("บันทึกแล้ว");
  };
  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="p-6 gradient-card space-y-4">
        <h3 className="font-bold flex items-center gap-2">🏦 ธนาคาร + ตรวจสลิปอัตโนมัติ (EasySlip)</h3>
        <Field label="ชื่อธนาคาร"><Input value={s.bank_name} onChange={e=>setS({...s, bank_name:e.target.value})} /></Field>
        <Field label="เลขบัญชี (โชว์ให้ลูกค้า)"><Input value={s.bank_account_number} onChange={e=>setS({...s, bank_account_number:e.target.value})} /></Field>
        <Field label="ชื่อบัญชี (โชว์ให้ลูกค้า)"><Input value={s.bank_account_name} onChange={e=>setS({...s, bank_account_name:e.target.value})} /></Field>
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>เปิดบอทเช็คสลิปอัตโนมัติ (EasySlip)</Label>
              <p className="text-xs text-muted-foreground">ถ้าปิด สลิปจะรอแอดมินอนุมัติเอง</p>
            </div>
            <Switch checked={s.easyslip_enabled} onCheckedChange={v=>setS({...s, easyslip_enabled:v})} />
          </div>
          <Field label="ชื่อบัญชีตามที่จะปรากฏในสลิป (ใช้ตรวจสอบ — เก็บเป็นความลับ)"><Input value={priv.expected_account_name} onChange={e=>setPriv({...priv, expected_account_name:e.target.value})} placeholder="เช่น สรุณวริทธิ์ ..." /></Field>
          <Field label="เลขบัญชีจริง (ใช้เปรียบเทียบ 4 ตัวท้าย — เก็บเป็นความลับ)"><Input value={priv.expected_account_number} onChange={e=>setPriv({...priv, expected_account_number:e.target.value})} placeholder="เช่น 1234567890" /></Field>
        </div>
      </Card>

      <Card className="p-6 gradient-card space-y-4">
        <h3 className="font-bold flex items-center gap-2">🧧 TrueMoney Wallet ซองของขวัญ (เติมอัตโนมัติ)</h3>
        <div className="flex items-center justify-between">
          <Label>เปิดรับซอง TrueMoney อัตโนมัติ</Label>
          <Switch checked={s.truemoney_enabled} onCheckedChange={v=>setS({...s, truemoney_enabled:v})} />
        </div>
        <Field label="เบอร์ TrueMoney Wallet ของร้าน (10 หลัก — เก็บเป็นความลับ)"><Input value={priv.truemoney_phone} onChange={e=>setPriv({...priv, truemoney_phone:e.target.value})} placeholder="0812345678" /></Field>
        <p className="text-xs text-muted-foreground">ลูกค้าจะวางลิงก์ซอง → ระบบรับเงินเข้าเบอร์นี้ → เติม Wallet ลูกค้าอัตโนมัติ</p>
      </Card>

      <Button onClick={save} className="gradient-primary text-primary-foreground">บันทึกทั้งหมด</Button>
    </div>
  );
};


const AppearanceTab = () => {
  const [s, setS] = useState<any>(null);
  useEffect(() => { supabase.from("site_settings").select("*").eq("id",1).maybeSingle().then(({data}) => setS(data)); }, []);
  if (!s) return <div>...</div>;
  const save = async () => {
    const { error } = await supabase.from("site_settings").update(s).eq("id",1);
    if (error) toast.error(error.message); else toast.success("อัปเดตแล้ว");
  };
  return (
    <Card className="p-6 gradient-card space-y-6 max-w-2xl">
      <Field label={`โทนสีหลัก (Hue: ${s.primary_hue})`}>
        <Slider value={[s.primary_hue]} min={0} max={360} step={1} onValueChange={v=>setS({...s, primary_hue:v[0]})} />
        <div className="h-3 mt-2 rounded" style={{background:`hsl(${s.primary_hue} 100% 55%)`}} />
      </Field>
      <Field label={`สี Glow รอง (Hue: ${s.accent_hue})`}>
        <Slider value={[s.accent_hue]} min={0} max={360} step={1} onValueChange={v=>setS({...s, accent_hue:v[0]})} />
        <div className="h-3 mt-2 rounded" style={{background:`hsl(${s.accent_hue} 100% 65%)`}} />
      </Field>
      <Field label={`สีพื้นหลัง (Hue: ${s.background_hue ?? 222})`}>
        <Slider value={[s.background_hue ?? 222]} min={0} max={360} step={1} onValueChange={v=>setS({...s, background_hue:v[0]})} />
        <div className="h-3 mt-2 rounded" style={{background:`hsl(${s.background_hue ?? 222} 30% 6%)`}} />
      </Field>
      <Field label={`ความเข้มแสงเรืองรอง: ${Number(s.glow_intensity ?? 1).toFixed(1)}x`}>
        <Slider value={[Number(s.glow_intensity ?? 1)]} min={0} max={3} step={0.1} onValueChange={v=>setS({...s, glow_intensity:v[0]})} />
      </Field>
      <Field label={`ความโค้งปุ่ม: ${s.button_radius ?? 8}px`}>
        <Slider value={[s.button_radius ?? 8]} min={0} max={32} step={1} onValueChange={v=>setS({...s, button_radius:v[0]})} />
      </Field>
      <Field label="สไตล์ไล่สี (Gradient)">
        <Select value={s.gradient_style ?? "diagonal"} onValueChange={v=>setS({...s, gradient_style:v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="diagonal">เฉียง</SelectItem>
            <SelectItem value="horizontal">แนวนอน</SelectItem>
            <SelectItem value="vertical">แนวตั้ง</SelectItem>
            <SelectItem value="radial">รัศมี</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="border-t border-border pt-4 space-y-4">
        <h3 className="font-bold text-primary">🎨 ฟอนต์ & โลโก้</h3>
        <Field label="ฟอนต์หัวข้อ">
          <Select value={s.font_heading || "Orbitron"} onValueChange={v=>setS({...s, font_heading:v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Orbitron","Audiowide","Press_Start_2P","Chakra_Petch","Rajdhani","Kanit","Prompt","Mitr","Bai_Jamjuree","Sarabun","Inter"].map(f=>
                <SelectItem key={f} value={f}>{f.replace(/_/g," ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="ฟอนต์เนื้อหา">
          <Select value={s.font_body || "Kanit"} onValueChange={v=>setS({...s, font_body:v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Kanit","Prompt","Sarabun","Mitr","Bai_Jamjuree","Chakra_Petch","Rajdhani","Inter"].map(f=>
                <SelectItem key={f} value={f}>{f.replace(/_/g," ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="โลโก้ร้าน">
          <ImageUpload value={s.logo_url||""} onChange={url=>setS({...s, logo_url:url})} />
        </Field>
        <Field label="พื้นหลัง Hero (รูปใหญ่)">
          <ImageUpload value={s.hero_bg_url||""} onChange={url=>setS({...s, hero_bg_url:url})} />
        </Field>
        <Field label={`ความเข้ม Overlay บน Hero: ${Number(s.hero_overlay_opacity ?? 0.6).toFixed(2)}`}>
          <Slider value={[Number(s.hero_overlay_opacity ?? 0.6)]} min={0} max={1} step={0.05} onValueChange={v=>setS({...s, hero_overlay_opacity:v[0]})} />
        </Field>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <h3 className="font-bold text-primary">🃏 สไตล์การ์ด & เอฟเฟกต์ฉาก</h3>
        <Field label="สไตล์การ์ดสินค้า">
          <Select value={s.card_style || "classic"} onValueChange={v=>setS({...s, card_style:v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Classic (ไล่สี)</SelectItem>
              <SelectItem value="glass">Glass (กระจกฝ้า)</SelectItem>
              <SelectItem value="neon">Neon (กรอบเรืองแสง)</SelectItem>
              <SelectItem value="minimal">Minimal (เรียบ)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={`เบลอเพิ่ม (Glass): ${s.card_blur ?? 0}px`}>
          <Slider value={[s.card_blur ?? 0]} min={0} max={30} step={1} onValueChange={v=>setS({...s, card_blur:v[0]})} />
        </Field>
        <div className="flex items-center justify-between"><Label>Noise Texture (เม็ดเกรน)</Label>
          <Switch checked={!!s.noise_texture} onCheckedChange={v=>setS({...s, noise_texture:v})}/></div>
        <div className="flex items-center justify-between"><Label>Cursor Glow (แสงตามเมาส์)</Label>
          <Switch checked={!!s.cursor_glow} onCheckedChange={v=>setS({...s, cursor_glow:v})}/></div>
        <div className="flex items-center justify-between"><Label>Scanline (เส้น CRT เรโทร)</Label>
          <Switch checked={!!s.scanline_effect} onCheckedChange={v=>setS({...s, scanline_effect:v})}/></div>
        <Field label="แอนิเมชันเปลี่ยนหน้า">
          <Select value={s.page_transition || "fade"} onValueChange={v=>setS({...s, page_transition:v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fade">Fade</SelectItem>
              <SelectItem value="slide">Slide</SelectItem>
              <SelectItem value="zoom">Zoom</SelectItem>
              <SelectItem value="none">ไม่มี</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={`ความเร็วแอนิเมชัน: ${Number(s.animation_speed ?? 1).toFixed(1)}x`}>
          <Slider value={[Number(s.animation_speed ?? 1)]} min={0.3} max={3} step={0.1} onValueChange={v=>setS({...s, animation_speed:v[0]})} />
        </Field>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <h3 className="font-bold text-primary">✨ อนุภาคพื้นหลัง</h3>
        <div className="flex items-center justify-between">
          <Label>เปิดเอฟเฟกต์อนุภาค</Label>
          <Switch checked={s.particle_enabled} onCheckedChange={v=>setS({...s, particle_enabled:v})} />
        </div>
        <Field label="ประเภทอนุภาค">
          <Select value={s.particle_type} onValueChange={v=>setS({...s, particle_type:v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="snow">หิมะ ❄️</SelectItem>
              <SelectItem value="sakura">ซากุระ 🌸</SelectItem>
              <SelectItem value="stars">ดาว ✨</SelectItem>
              <SelectItem value="bubbles">ฟองอากาศ 🫧</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={`จำนวนอนุภาค: ${s.particle_count}`}>
          <Slider value={[s.particle_count]} min={10} max={300} step={5} onValueChange={v=>setS({...s, particle_count:v[0]})} />
        </Field>
        <Field label={`ความเร็ว: ${s.particle_speed}x`}>
          <Slider value={[Number(s.particle_speed)]} min={0.1} max={5} step={0.1} onValueChange={v=>setS({...s, particle_speed:v[0]})} />
        </Field>
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <h3 className="font-bold text-primary">🧪 Custom CSS (ขั้นสูง)</h3>
        <p className="text-xs text-muted-foreground">เขียน CSS เพิ่มเองได้ จะ inject เข้าเว็บทันที — ใช้ระวังนะ</p>
        <Textarea rows={6} className="font-mono text-xs" value={s.custom_css || ""} onChange={e=>setS({...s, custom_css:e.target.value})} placeholder=".gradient-card { transform: rotate(0deg); }" />
      </div>

      <Button onClick={save} className="gradient-primary text-primary-foreground w-full">บันทึกทั้งหมด</Button>
    </Card>
  );
};

// Image upload helper
const ImageUpload = ({ value, onChange }: { value: string; onChange: (url: string) => void }) => {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("ไฟล์ใหญ่เกิน 5 MB");
    if (!file.type.startsWith("image/")) return toast.error("ต้องเป็นไฟล์รูปภาพ");
    setBusy(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error } = await supabase.storage.from("products").upload(path, file, { upsert: false });
    setBusy(false);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    onChange(data.publicUrl);
    toast.success("อัปโหลดสำเร็จ");
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 rounded bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
          {value ? <img src={value} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="h-6 w-6 text-muted-foreground"/>}
        </div>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0] && upload(e.target.files[0])} />
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-secondary border border-border text-sm hover:bg-secondary/80">
            <Upload className="h-4 w-4"/> {busy ? "กำลังอัปโหลด..." : "อัปโหลดรูป (≤5MB)"}
          </span>
        </label>
        {value && <Button size="sm" variant="ghost" onClick={()=>onChange("")}>ลบ</Button>}
      </div>
    </div>
  );
};

const ProductsTab = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [stockProduct, setStockProduct] = useState<any>(null);

  const load = async () => {
    const { data: p } = await supabase.from("products").select("*, categories(name)").order("created_at",{ascending:false});
    setProducts((p as any) || []);
    const { data: c } = await supabase.from("categories").select("*").order("sort_order");
    setCats((c as any) || []);
  };
  useEffect(() => { load(); }, []);

  const blank = { name:"", description:"", image_url:"", price:0, discount_price:null, category_id:null, delivery_type:"key", active:true };

  const save = async () => {
    if (!editing) return;
    const payload = {...editing};
    if (payload.discount_price === "" || payload.discount_price === null) payload.discount_price = null;
    delete payload.categories;
    if (payload.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", payload.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("บันทึกแล้ว"); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("ลบสินค้านี้?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing(blank)} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1"/> เพิ่มสินค้า</Button>

      {editing && (
        <Card className="p-6 gradient-card border-glow space-y-3">
          <h3 className="font-bold">{editing.id ? "แก้ไขสินค้า" : "สินค้าใหม่"}</h3>
          <Field label="ชื่อสินค้า"><Input value={editing.name} onChange={e=>setEditing({...editing, name:e.target.value})} /></Field>
          <Field label="คำอธิบาย"><Textarea value={editing.description||""} onChange={e=>setEditing({...editing, description:e.target.value})} /></Field>
          <Field label="รูปภาพ"><ImageUpload value={editing.image_url||""} onChange={url=>setEditing({...editing, image_url:url})} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ราคาเต็ม"><Input type="number" step="0.01" value={editing.price} onChange={e=>setEditing({...editing, price:parseFloat(e.target.value)||0})} /></Field>
            <Field label="ราคาลด (ว่าง=ไม่ลด)"><Input type="number" step="0.01" value={editing.discount_price ?? ""} onChange={e=>setEditing({...editing, discount_price: e.target.value===""?null:parseFloat(e.target.value)})} /></Field>
          </div>
          <Field label="หมวดหมู่">
            <Select value={editing.category_id ?? "none"} onValueChange={v=>setEditing({...editing, category_id: v==="none"?null:v})}>
              <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ไม่ระบุ</SelectItem>
                {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="ลูกค้าจะได้รับ">
            <Select value={editing.delivery_type} onValueChange={v=>setEditing({...editing, delivery_type:v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="key">คีย์เท่านั้น</SelectItem>
                <SelectItem value="link">ลิงก์เท่านั้น</SelectItem>
                <SelectItem value="key_link">คีย์ + ลิงก์</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center justify-between"><Label>เปิดขาย</Label><Switch checked={editing.active} onCheckedChange={v=>setEditing({...editing, active:v})} /></div>
          <div className="flex gap-2"><Button onClick={save} className="gradient-primary text-primary-foreground">บันทึก</Button><Button variant="ghost" onClick={()=>setEditing(null)}>ยกเลิก</Button></div>
        </Card>
      )}

      {stockProduct && <StockEditor product={stockProduct} onClose={() => { setStockProduct(null); load(); }} />}

      <div className="grid gap-3">
        {products.map(p => (
          <Card key={p.id} className="p-4 gradient-card flex items-center gap-4">
            <div className="h-16 w-16 rounded bg-secondary overflow-hidden shrink-0">
              {p.image_url && <img src={p.image_url} className="w-full h-full object-cover" alt={p.name} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.categories?.name || "-"} • ฿{Number(p.discount_price ?? p.price).toFixed(2)} • {p.active ? "เปิดขาย" : "ปิด"} • {p.delivery_type}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setStockProduct(p)}>สต็อก</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(p)}>แก้ไข</Button>
            <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

const StockEditor = ({ product, onClose }: { product: any; onClose: () => void }) => {
  const [items, setItems] = useState<any[]>([]);
  const [keyVal, setKeyVal] = useState("");
  const [linkVal, setLinkVal] = useState("");
  const dt = product.delivery_type as string;
  const needKey = dt === "key" || dt === "key_link";
  const needLink = dt === "link" || dt === "key_link";

  const load = async () => {
    const { data } = await supabase.from("product_stock").select("*").eq("product_id", product.id).order("created_at",{ascending:false});
    setItems((data as any) || []);
  };
  useEffect(() => { load(); }, [product.id]);
  const add = async () => {
    if (needKey && !keyVal) return toast.error("ต้องใส่คีย์");
    if (needLink && !linkVal) return toast.error("ต้องใส่ลิงก์");
    const { error } = await supabase.from("product_stock").insert({
      product_id: product.id,
      key_value: needKey ? keyVal : null,
      link_value: needLink ? linkVal : null,
    });
    if (error) return toast.error(error.message);
    setKeyVal(""); setLinkVal(""); load();
    toast.success("เพิ่มสต็อกแล้ว");
  };
  const del = async (id: string) => { await supabase.from("product_stock").delete().eq("id", id); load(); };
  const available = items.filter(i => !i.sold).length;
  return (
    <Card className="p-6 gradient-card border-glow space-y-3">
      <div className="flex justify-between"><h3 className="font-bold">สต็อก: {product.name} ({available} เหลือ)</h3><Button variant="ghost" size="sm" onClick={onClose}>ปิด</Button></div>
      <p className="text-xs text-muted-foreground">รูปแบบสินค้า: {dt === "key" ? "คีย์เท่านั้น" : dt === "link" ? "ลิงก์เท่านั้น" : "คีย์ + ลิงก์"}</p>
      <div className="grid gap-2">
        {needKey && <Input placeholder="คีย์ที่จะส่งให้ลูกค้า" value={keyVal} onChange={e=>setKeyVal(e.target.value)} />}
        {needLink && <Input placeholder="ลิงก์โหลดที่จะส่งให้ลูกค้า" value={linkVal} onChange={e=>setLinkVal(e.target.value)} />}
        <Button onClick={add} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1"/>เพิ่มสต็อก 1 ชิ้น</Button>
      </div>
      <div className="space-y-1 max-h-64 overflow-auto">
        {items.map(i => (
          <div key={i.id} className="flex items-center gap-2 p-2 rounded bg-secondary text-xs">
            <span className={`px-2 py-0.5 rounded ${i.sold ? "bg-destructive/30 text-destructive" : "bg-primary/20 text-primary"}`}>{i.sold ? "ขายแล้ว" : "พร้อมขาย"}</span>
            <code className="flex-1 truncate">{i.key_value || "-"} | {i.link_value || "-"}</code>
            {!i.sold && <Button size="sm" variant="ghost" onClick={()=>del(i.id)}><Trash2 className="h-3.5 w-3.5"/></Button>}
          </div>
        ))}
      </div>
    </Card>
  );
};

const CategoriesTab = () => {
  const [cats, setCats] = useState<any[]>([]);
  const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [platform, setPlatform] = useState("none");
  const load = () => supabase.from("categories").select("*").order("sort_order").then(({data})=>setCats((data as any)||[]));
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!name || !slug) return toast.error("กรอกชื่อและ slug");
    const { error } = await supabase.from("categories").insert({ name, slug, platform: platform==="none"?null:platform });
    if (error) return toast.error(error.message);
    setName(""); setSlug(""); load();
  };
  const del = async (id: string) => { await supabase.from("categories").delete().eq("id", id); load(); };
  return (
    <Card className="p-6 gradient-card space-y-4 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <Input placeholder="ชื่อ" value={name} onChange={e=>setName(e.target.value)} />
        <Input placeholder="slug" value={slug} onChange={e=>setSlug(e.target.value)} />
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">-</SelectItem>
            <SelectItem value="android">Android</SelectItem>
            <SelectItem value="ios">iOS</SelectItem>
            <SelectItem value="pc">PC</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={add} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1"/>เพิ่ม</Button>
      </div>
      <div className="space-y-2">
        {cats.map(c => (
          <div key={c.id} className="flex items-center gap-2 p-2 rounded bg-secondary">
            <span className="flex-1">{c.name} <span className="text-muted-foreground text-xs">/{c.slug} {c.platform && `• ${c.platform}`}</span></span>
            <Button size="sm" variant="ghost" onClick={()=>del(c.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

const DiscountsTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState(10);
  const [productId, setProductId] = useState("all");
  const [maxUses, setMaxUses] = useState<string>("");

  const load = async () => {
    const { data } = await supabase.from("discount_codes").select("*, products(name)").order("created_at",{ascending:false});
    setItems((data as any) || []);
    const { data: p } = await supabase.from("products").select("id, name").order("name");
    setProducts((p as any) || []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!code) return toast.error("ใส่โค้ด");
    const { error } = await supabase.from("discount_codes").insert({
      code: code.toUpperCase().trim(),
      discount_type: type,
      discount_value: value,
      product_id: productId === "all" ? null : productId,
      max_uses: maxUses ? parseInt(maxUses) : null,
    });
    if (error) return toast.error(error.message);
    setCode(""); setValue(10); setMaxUses(""); setProductId("all"); load();
    toast.success("สร้างโค้ดแล้ว");
  };
  const del = async (id: string) => { if (!confirm("ลบโค้ด?")) return; await supabase.from("discount_codes").delete().eq("id", id); load(); };
  const toggle = async (i: any) => { await supabase.from("discount_codes").update({ active: !i.active }).eq("id", i.id); load(); };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="p-6 gradient-card space-y-3">
        <h3 className="font-bold">สร้างโค้ดส่วนลดใหม่</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="โค้ด"><Input placeholder="SAVE10" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} /></Field>
          <Field label="ประเภท">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">ลด %</SelectItem>
                <SelectItem value="amount">ลดเป็นบาท</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={type === "percent" ? "ลด (%)" : "ลด (บาท)"}>
            <Input type="number" step="0.01" value={value} onChange={e=>setValue(parseFloat(e.target.value)||0)} />
          </Field>
          <Field label="จำกัดจำนวนครั้ง (ว่าง=ไม่จำกัด)">
            <Input type="number" value={maxUses} onChange={e=>setMaxUses(e.target.value)} />
          </Field>
          <Field label="ใช้กับสินค้า">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสินค้า</SelectItem>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button onClick={add} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1"/>สร้างโค้ด</Button>
      </Card>

      <div className="space-y-2">
        {items.map(i => (
          <Card key={i.id} className="p-4 gradient-card flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-primary">{i.code}</p>
              <p className="text-xs text-muted-foreground">
                {i.discount_type === "percent" ? `ลด ${i.discount_value}%` : `ลด ฿${i.discount_value}`} •
                {i.products?.name ? ` เฉพาะ "${i.products.name}"` : " ทุกสินค้า"} •
                ใช้แล้ว {i.uses_count}{i.max_uses ? `/${i.max_uses}` : ""} ครั้ง
              </p>
            </div>
            <Switch checked={i.active} onCheckedChange={()=>toggle(i)} />
            <Button size="sm" variant="ghost" onClick={()=>del(i.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

const AnnouncementsTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const load = () => supabase.from("announcements").select("*").order("created_at",{ascending:false}).then(({data})=>setItems((data as any)||[]));
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!title) return;
    const { error } = await supabase.from("announcements").insert({ title, body });
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); load();
  };
  const del = async (id: string) => { await supabase.from("announcements").delete().eq("id", id); load(); };
  const toggle = async (i: any) => { await supabase.from("announcements").update({active: !i.active}).eq("id", i.id); load(); };
  return (
    <Card className="p-6 gradient-card space-y-4 max-w-2xl">
      <Input placeholder="หัวข้อ" value={title} onChange={e=>setTitle(e.target.value)} />
      <Textarea placeholder="เนื้อหา" value={body} onChange={e=>setBody(e.target.value)} />
      <Button onClick={add} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1"/>เพิ่มประกาศ</Button>
      <div className="space-y-2">
        {items.map(i => (
          <div key={i.id} className="p-3 rounded bg-secondary flex justify-between gap-2">
            <div className="flex-1">
              <p className="font-semibold">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.body}</p>
            </div>
            <Switch checked={i.active} onCheckedChange={()=>toggle(i)} />
            <Button size="sm" variant="ghost" onClick={()=>del(i.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
          </div>
        ))}
      </div>
    </Card>
  );
};

const SlipPreview = ({ path }: { path: string }) => {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    supabase.storage.from("slips").createSignedUrl(path, 600).then(({data}) => data?.signedUrl && setUrl(data.signedUrl));
  }, [path]);
  if (!url) return <span className="text-xs text-muted-foreground">โหลดสลิป...</span>;
  return <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary text-xs hover:underline"><Eye className="h-3.5 w-3.5"/>ดูสลิป</a>;
};

const TopupsTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const load = () => supabase.from("topup_requests").select("*, profiles(username, display_name)").order("created_at",{ascending:false}).then(({data})=>setItems((data as any)||[]));
  useEffect(() => { load(); }, []);
  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_topup", { _topup_id: id });
    if (error) return toast.error(error.message);
    toast.success("อนุมัติแล้ว"); load();
  };
  const reject = async (id: string) => {
    await supabase.from("topup_requests").update({status:"rejected", reviewed_at: new Date().toISOString()}).eq("id", id);
    load();
  };
  return (
    <div className="space-y-2">
      {items.length === 0 && <Card className="p-6 gradient-card text-muted-foreground">ไม่มีรายการ</Card>}
      {items.map(t => (
        <Card key={t.id} className="p-4 gradient-card flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-semibold">
              {t.topup_type === "truemoney" ? "🧧" : "🏦"} ฿{Number(t.amount).toFixed(2)} —
              {" "}{t.profiles?.display_name || t.profiles?.username || t.user_id.slice(0,8)}
              {t.auto_verified && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">อัตโนมัติ ✓</span>}
            </p>
            <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("th-TH")} • {t.slip_note || ""}</p>
            {t.slip_url && <div className="mt-1"><SlipPreview path={t.slip_url}/></div>}
            {t.voucher_url && <p className="text-xs mt-1 text-muted-foreground truncate">🧧 {t.voucher_url}</p>}
          </div>
          <span className={`px-2 py-1 rounded text-xs ${t.status==="pending"?"bg-secondary":t.status==="approved"?"bg-primary/20 text-primary":"bg-destructive/20 text-destructive"}`}>{t.status}</span>
          {t.status==="pending" && <>
            <Button size="sm" onClick={()=>approve(t.id)} className="gradient-primary text-primary-foreground"><Check className="h-4 w-4"/></Button>
            <Button size="sm" variant="outline" onClick={()=>reject(t.id)}><X className="h-4 w-4"/></Button>
          </>}
        </Card>
      ))}
    </div>
  );
};

const OrdersTab = () => {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("orders").select("*, profiles(username, display_name)").order("created_at",{ascending:false}).limit(100)
      .then(({data})=>setItems((data as any)||[]));
  }, []);
  return (
    <div className="space-y-2">
      {items.map(o => (
        <Card key={o.id} className="p-4 gradient-card text-sm">
          <div className="flex justify-between"><span className="font-semibold">{o.product_name}</span><span className="text-primary">฿{Number(o.price_paid).toFixed(2)}</span></div>
          <p className="text-xs text-muted-foreground">{o.profiles?.display_name || o.profiles?.username} • {new Date(o.created_at).toLocaleString("th-TH")}{o.discount_code ? ` • โค้ด ${o.discount_code} (-฿${Number(o.discount_amount).toFixed(2)})` : ""}</p>
          {o.delivered_key && <p className="text-xs mt-1">Key: <code>{o.delivered_key}</code></p>}
          {o.delivered_link && <p className="text-xs">Link: <code>{o.delivered_link}</code></p>}
        </Card>
      ))}
    </div>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await supabase.from("profiles")
      .select("id, username, display_name, wallet_balance, created_at")
      .order("created_at", { ascending: false }).limit(200);
    setUsers((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const adjust = async (uid: string, sign: 1 | -1) => {
    const raw = parseFloat(amounts[uid] || "0");
    if (!raw || raw <= 0) return toast.error("กรอกจำนวนเงิน");
    setBusy(uid);
    const { error } = await supabase.rpc("admin_adjust_wallet", {
      _user_id: uid, _amount: sign * raw, _note: notes[uid] || null,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(sign > 0 ? `เติม ฿${raw} สำเร็จ` : `หัก ฿${raw} สำเร็จ`);
    setAmounts(a => ({ ...a, [uid]: "" }));
    setNotes(n => ({ ...n, [uid]: "" }));
    load();
  };

  const filtered = users.filter(u =>
    !q || (u.username || "").toLowerCase().includes(q.toLowerCase()) ||
    (u.display_name || "").toLowerCase().includes(q.toLowerCase()) ||
    u.id.includes(q)
  );

  return (
    <div className="space-y-3">
      <Input placeholder="ค้นหา username / display name / user id" value={q} onChange={e=>setQ(e.target.value)} className="max-w-md"/>
      {filtered.map(u => (
        <Card key={u.id} className="p-4 gradient-card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold">{u.display_name || u.username || u.id.slice(0,8)}</p>
              <p className="text-xs text-muted-foreground">@{u.username} • {u.id.slice(0,8)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Wallet</p>
              <p className="text-xl font-black text-primary">฿{Number(u.wallet_balance).toFixed(2)}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-[140px,1fr,auto,auto] gap-2 items-center">
            <Input type="number" min="0" step="0.01" placeholder="จำนวน ฿"
              value={amounts[u.id] || ""} onChange={e=>setAmounts(a=>({...a, [u.id]: e.target.value}))}/>
            <Input placeholder="หมายเหตุ (ไม่บังคับ)"
              value={notes[u.id] || ""} onChange={e=>setNotes(n=>({...n, [u.id]: e.target.value}))}/>
            <Button size="sm" disabled={busy===u.id} onClick={()=>adjust(u.id, 1)} className="gradient-primary text-primary-foreground">+ เติม</Button>
            <Button size="sm" variant="outline" disabled={busy===u.id} onClick={()=>adjust(u.id, -1)}>– หัก</Button>
          </div>
        </Card>
      ))}
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">ไม่พบผู้ใช้</p>}
    </div>
  );
};

const Field = ({label, children}: {label:string; children:React.ReactNode}) => (
  <div className="space-y-2"><Label>{label}</Label>{children}</div>
);

export default Admin;
