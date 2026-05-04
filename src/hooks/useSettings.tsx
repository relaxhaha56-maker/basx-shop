import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  id: number;
  shop_name: string;
  primary_hue: number;
  accent_hue: number;
  particle_type: string;
  particle_count: number;
  particle_speed: number;
  particle_enabled: boolean;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  discord_url: string;
  banner_text: string;
  easyslip_enabled: boolean;
  truemoney_enabled: boolean;
  truemoney_phone: string;
  expected_account_name: string;
  expected_account_number: string;
  hero_title: string;
  hero_subtitle: string;
  footer_text: string;
  glow_intensity: number;
  button_radius: number;
  background_hue: number;
  gradient_style: string;
  show_announcement_bar: boolean;
  announcement_bar_text: string;
};

const SettingsContext = createContext<SiteSettings | null>(null);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (data) setSettings(data as SiteSettings);
    };
    load();
    const ch = supabase
      .channel("site_settings_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, (p) => {
        if (p.new) setSettings(p.new as SiteSettings);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Apply theme hue + customization live
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", `${settings.primary_hue} 100% 55%`);
    root.style.setProperty("--primary-glow", `${settings.accent_hue} 100% 65%`);
    root.style.setProperty("--accent", `${settings.primary_hue} 100% 55%`);
    root.style.setProperty("--ring", `${settings.primary_hue} 100% 55%`);
    root.style.setProperty("--background", `${settings.background_hue ?? 222} 30% 6%`);
    root.style.setProperty("--card", `${settings.background_hue ?? 222} 28% 9%`);
    root.style.setProperty("--secondary", `${settings.background_hue ?? 222} 25% 14%`);
    const glow = settings.glow_intensity ?? 1;
    root.style.setProperty("--shadow-glow", `0 0 ${30 * glow}px hsl(var(--primary) / ${0.45 * glow})`);
    root.style.setProperty("--radius", `${(settings.button_radius ?? 8) / 16}rem`);
    const angle = settings.gradient_style === "horizontal" ? "90deg"
      : settings.gradient_style === "vertical" ? "180deg"
      : settings.gradient_style === "radial" ? null : "135deg";
    root.style.setProperty("--gradient-primary",
      angle ? `linear-gradient(${angle}, hsl(var(--primary)), hsl(var(--primary-glow)))`
            : `radial-gradient(circle, hsl(var(--primary)), hsl(var(--primary-glow)))`);
  }, [settings]);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
