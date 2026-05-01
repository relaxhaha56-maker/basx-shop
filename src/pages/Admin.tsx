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
import { Trash2, Plus, Check, X } from "lucide-react";

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
          <TabsTrigger value="appearance">สี & เอฟเฟกต์</TabsTrigger>
          <TabsTrigger value="products">สินค้า</TabsTrigger>
          <TabsTrigger value="categories">หมวดหมู่</TabsTrigger>
          <TabsTrigger value="announcements">ประกาศ</TabsTrigger>
          <TabsTrigger value="topups">เติมเงิน</TabsTrigger>
          <TabsTrigger value="orders">คำสั่งซื้อ</TabsTrigger>
        </TabsList>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="appearance"><AppearanceTab /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
        <TabsContent value="topups"><TopupsTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
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
      <Field label="ข้อความ Banner"><Input value={s.banner_text} onChange={e=>setS({...s, banner_text:e.target.value})} /></Field>
      <Field label="Discord URL"><Input value={s.discord_url} onChange={e=>setS({...s, discord_url:e.target.value})} /></Field>
      <h3 className="font-bold pt-2">ข้อมูลบัญชีธนาคาร</h3>
      <Field label="ชื่อธนาคาร"><Input value={s.bank_name} onChange={e=>setS({...s, bank_name:e.target.value})} /></Field>
      <Field label="เลขบัญชี"><Input value={s.bank_account_number} onChange={e=>setS({...s, bank_account_number:e.target.value})} /></Field>
      <Field label="ชื่อบัญชี"><Input value={s.bank_account_name} onChange={e=>setS({...s, bank_account_name:e.target.value})} /></Field>
      <Button onClick={save} className="gradient-primary text-primary-foreground">บันทึก</Button>
    </Card>
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

      <div className="border-t border-border pt-4 space-y-4">
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
      <Button onClick={save} className="gradient-primary text-primary-foreground">บันทึก</Button>
    </Card>
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
          <Field label="URL รูปภาพ"><Input value={editing.image_url||""} onChange={e=>setEditing({...editing, image_url:e.target.value})} /></Field>
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
              <p className="text-xs text-muted-foreground">{p.categories?.name || "-"} • ฿{Number(p.discount_price ?? p.price).toFixed(2)} • {p.active ? "เปิดขาย" : "ปิด"}</p>
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
  const load = async () => {
    const { data } = await supabase.from("product_stock").select("*").eq("product_id", product.id).order("created_at",{ascending:false});
    setItems((data as any) || []);
  };
  useEffect(() => { load(); }, [product.id]);
  const add = async () => {
    if (!keyVal && !linkVal) return toast.error("ใส่ key หรือ link อย่างน้อย 1");
    const { error } = await supabase.from("product_stock").insert({ product_id: product.id, key_value: keyVal||null, link_value: linkVal||null });
    if (error) return toast.error(error.message);
    setKeyVal(""); setLinkVal(""); load();
  };
  const del = async (id: string) => { await supabase.from("product_stock").delete().eq("id", id); load(); };
  const available = items.filter(i => !i.sold).length;
  return (
    <Card className="p-6 gradient-card border-glow space-y-3">
      <div className="flex justify-between"><h3 className="font-bold">สต็อก: {product.name} ({available} เหลือ)</h3><Button variant="ghost" size="sm" onClick={onClose}>ปิด</Button></div>
      <div className="grid sm:grid-cols-3 gap-2">
        <Input placeholder="คีย์ (ถ้ามี)" value={keyVal} onChange={e=>setKeyVal(e.target.value)} />
        <Input placeholder="ลิงก์ (ถ้ามี)" value={linkVal} onChange={e=>setLinkVal(e.target.value)} />
        <Button onClick={add} className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1"/>เพิ่มสต็อก</Button>
      </div>
      <div className="space-y-1 max-h-64 overflow-auto">
        {items.map(i => (
          <div key={i.id} className="flex items-center gap-2 p-2 rounded bg-secondary text-xs">
            <span className={`px-2 py-0.5 rounded ${i.sold ? "bg-destructive/30 text-destructive" : "bg-primary/20 text-primary"}`}>{i.sold ? "ขายแล้ว" : "พร้อมขาย"}</span>
            <code className="flex-1 truncate">{i.key_value || "-"} | {i.link_value || "-"}</code>
            <Button size="sm" variant="ghost" onClick={()=>del(i.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
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
            <p className="font-semibold">฿{Number(t.amount).toFixed(2)} — {t.profiles?.display_name || t.profiles?.username || t.user_id.slice(0,8)}</p>
            <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("th-TH")} • {t.slip_note || "-"}</p>
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
          <p className="text-xs text-muted-foreground">{o.profiles?.display_name || o.profiles?.username} • {new Date(o.created_at).toLocaleString("th-TH")}</p>
          {o.delivered_key && <p className="text-xs mt-1">Key: <code>{o.delivered_key}</code></p>}
          {o.delivered_link && <p className="text-xs">Link: <code>{o.delivered_link}</code></p>}
        </Card>
      ))}
    </div>
  );
};

const Field = ({label, children}: {label:string; children:React.ReactNode}) => (
  <div className="space-y-2"><Label>{label}</Label>{children}</div>
);

export default Admin;
