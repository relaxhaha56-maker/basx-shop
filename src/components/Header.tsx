import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Shield, Menu } from "lucide-react";
import logo from "@/assets/logo.png";
import { useState } from "react";

const links = [
  { to: "/", label: "หน้าหลัก" },
  { to: "/topup", label: "เติมเงิน" },
  { to: "/shop", label: "ร้านค้า" },
  { to: "/history", label: "ประวัติ" },
  { to: "/contact", label: "ติดต่อเรา" },
];

export const Header = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const settings = useSettings();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="container flex items-center justify-between h-16 gap-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="BasX SHOP logo" className="h-10 w-10 rounded-lg shadow-glow" />
          <span className="font-display font-black text-lg sm:text-xl text-glow tracking-wider">{settings?.shop_name ?? "BasX SHOP"}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({isActive}) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? "text-primary text-glow bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`
            }>{l.label}</NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && profile ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">฿{Number(profile.wallet_balance).toFixed(2)}</span>
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => nav("/admin")} className="border-primary/40 text-primary hover:bg-primary/10">
                  <Shield className="h-4 w-4 mr-1" /> Admin
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={async () => { await signOut(); nav("/"); }}><LogOut className="h-4 w-4" /></Button>
            </>
          ) : (
            <Button onClick={() => nav("/auth")} className="gradient-primary text-primary-foreground font-semibold shadow-glow">
              ล็อกอิน / สมัคร
            </Button>
          )}
          <button className="md:hidden p-2 rounded-lg hover:bg-secondary" onClick={() => setOpen(!open)}><Menu className="h-5 w-5" /></button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background/95">
          <div className="container py-2 flex flex-col">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"} onClick={() => setOpen(false)}
                className={({isActive}) => `px-4 py-3 text-sm rounded-lg ${isActive ? "text-primary" : "text-muted-foreground"}`}>{l.label}</NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
