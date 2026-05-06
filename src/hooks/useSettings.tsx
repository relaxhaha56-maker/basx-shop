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
  discord_url: string;
  banner_text: string;
  easyslip_enabled: boolean;
  truemoney_enabled: boolean;
  hero_title: string;
  hero_subtitle: string;
  footer_text: string;
  glow_intensity: number;
  button_radius: number;
  background_hue: number;
  gradient_style: string;
  show_announcement_bar: boolean;
  announcement_bar_text: string;
  // New customization fields
  font_heading: string;
  font_body: string;
  logo_url: string;
  hero_bg_url: string;
  hero_overlay_opacity: number;
  card_style: string;
  noise_texture: boolean;
  cursor_glow: boolean;
  page_transition: string;
  custom_css: string;
  scanline_effect: boolean;
  animation_speed: number;
  card_blur: number;
};

const SettingsContext = createContext<SiteSettings | null>(null);

const FONT_LINKS: Record<string, string> = {
  Orbitron: "Orbitron:wght@500;700;900",
  Kanit: "Kanit:wght@300;400;500;600;700",
  Prompt: "Prompt:wght@300;400;500;600;700",
  Sarabun: "Sarabun:wght@300;400;500;600;700",
  Mitr: "Mitr:wght@300;400;500;600;700",
  Bai_Jamjuree: "Bai+Jamjuree:wght@300;400;500;600;700",
  Chakra_Petch: "Chakra+Petch:wght@300;400;500;600;700",
  Audiowide: "Audiowide",
  "Press_Start_2P": "Press+Start+2P",
  Rajdhani: "Rajdhani:wght@400;500;600;700",
  Inter: "Inter:wght@300;400;500;600;700",
};

const ensureFont = (family: string) => {
  const key = family.replace(/ /g, "_");
  const spec = FONT_LINKS[key];
  if (!spec) return;
  const id = `font-${key}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(link);
};

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

  // Apply theme + customization live
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

    // Fonts
    const heading = settings.font_heading || "Orbitron";
    const body = settings.font_body || "Kanit";
    ensureFont(heading); ensureFont(body);
    root.style.setProperty("--font-heading", `'${heading.replace(/_/g, " ")}', sans-serif`);
    root.style.setProperty("--font-body", `'${body.replace(/_/g, " ")}', sans-serif`);

    // Animation speed
    root.style.setProperty("--anim-speed", `${1 / (settings.animation_speed || 1)}`);

    // Card blur
    root.style.setProperty("--card-blur", `${settings.card_blur || 0}px`);

    // Body classes for effects
    document.body.classList.toggle("fx-noise", !!settings.noise_texture);
    document.body.classList.toggle("fx-cursor-glow", !!settings.cursor_glow);
    document.body.classList.toggle("fx-scanline", !!settings.scanline_effect);
    document.body.dataset.cardStyle = settings.card_style || "classic";
    document.body.dataset.pageTransition = settings.page_transition || "fade";

    // Custom CSS injection (admin-only authored)
    let tag = document.getElementById("admin-custom-css") as HTMLStyleElement | null;
    if (!tag) { tag = document.createElement("style"); tag.id = "admin-custom-css"; document.head.appendChild(tag); }
    tag.textContent = settings.custom_css || "";
  }, [settings]);

  // Cursor glow follower
  useEffect(() => {
    if (!settings?.cursor_glow) return;
    const handler = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--cursor-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [settings?.cursor_glow]);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
