import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, User as UserIcon } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

// Map a username to an internal email (users never see/enter email)
const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@basx.local`;

const schema = z.object({
  username: z.string().trim()
    .min(3, "Username อย่างน้อย 3 ตัวอักษร")
    .max(24, "Username ไม่เกิน 24 ตัวอักษร")
    .regex(/^[a-zA-Z0-9_]+$/, "ใช้ได้เฉพาะ a-z, 0-9, _"),
  password: z.string().min(6, "รหัสผ่านอย่างน้อย 6 ตัวอักษร").max(72, "รหัสผ่านยาวเกินไป"),
});

const RATE_KEY = "basx_auth_attempts";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

function checkRateLimit(): { ok: boolean; waitSec: number } {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const recent = arr.filter(t => now - t < WINDOW_MS);
    if (recent.length >= MAX_ATTEMPTS) {
      return { ok: false, waitSec: Math.ceil((WINDOW_MS - (now - recent[0])) / 1000) };
    }
    recent.push(now);
    localStorage.setItem(RATE_KEY, JSON.stringify(recent));
    return { ok: true, waitSec: 0 };
  } catch { return { ok: true, waitSec: 0 }; }
}

const Auth = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const nav = useNavigate();
  const { user } = useAuth();
  const settings = useSettings();

  useEffect(() => { if (user) nav("/"); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const parsed = schema.safeParse({ username, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const rl = checkRateLimit();
    if (!rl.ok) {
      toast.error(`พยายามมากเกินไป กรุณารออีก ${rl.waitSec} วินาที`);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const email = usernameToEmail(parsed.data.username);
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: parsed.data.username, display_name: parsed.data.username },
          },
        });
        if (error) {
          if (/already|exists|registered/i.test(error.message)) throw new Error("ชื่อผู้ใช้นี้มีคนใช้แล้ว");
          if (/pwned|leaked|compromis/i.test(error.message)) throw new Error("รหัสผ่านนี้ถูกเปิดเผยในข้อมูลรั่วไหล กรุณาตั้งรหัสที่ปลอดภัยกว่านี้");
          throw error;
        }
        toast.success("สมัครสมาชิกสำเร็จ!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
        if (error) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        toast.success("เข้าสู่ระบบสำเร็จ");
      }
      nav("/");
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="container py-16 flex justify-center">
      <Card className="w-full max-w-md p-8 gradient-card border-glow">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl gradient-primary shadow-glow"><Lock className="h-6 w-6 text-primary-foreground" /></div>
          <div>
            <h1 className="font-display text-xl font-bold">{settings?.shop_name ?? "BasX SHOP"}</h1>
            <p className="text-sm text-primary text-glow">{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4" autoComplete="off">
          <div className="space-y-2">
            <Label>Username</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="x"
                required
                minLength={3}
                maxLength={24}
                autoComplete="off"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="x"
                required
                minLength={6}
                maxLength={72}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold shadow-glow">
            {loading ? "กำลังโหลด..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </Button>
        </form>
        <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="block mx-auto mt-4 text-sm text-primary hover:underline">
          {mode === "login" ? "ยังไม่มีบัญชี? สมัครเลย!" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
        </button>
        <p className="mt-6 text-xs text-center text-muted-foreground">
          🔒 ระบบเข้ารหัสรหัสผ่าน + ตรวจสอบ HIBP + จำกัดจำนวนครั้งที่ลองล็อกอิน
        </p>
      </Card>
    </div>
  );
};

export default Auth;
