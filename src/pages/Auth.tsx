import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { user } = useAuth();
  const settings = useSettings();

  useEffect(() => { if (user) nav("/"); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { username, display_name: username } }
        });
        if (error) throw error;
        toast.success("สมัครสมาชิกสำเร็จ! ");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("เข้าสู่ระบบสำเร็จ");
      }
      nav("/");
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด");
    } finally { setLoading(false); }
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
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} required minLength={3} maxLength={32} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold shadow-glow">
            {loading ? "กำลังโหลด..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </Button>
        </form>
        <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="block mx-auto mt-4 text-sm text-primary hover:underline">
          {mode === "login" ? "ยังไม่มีบัญชี? สมัครเลย!" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
        </button>
      </Card>
    </div>
  );
};

export default Auth;
