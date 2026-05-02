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

  // Apply theme hue live
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", `${settings.primary_hue} 100% 55%`);
    root.style.setProperty("--primary-glow", `${settings.accent_hue} 100% 65%`);
    root.style.setProperty("--accent", `${settings.primary_hue} 100% 55%`);
    root.style.setProperty("--ring", `${settings.primary_hue} 100% 55%`);
  }, [settings]);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
