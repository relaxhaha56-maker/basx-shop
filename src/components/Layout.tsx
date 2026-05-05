import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ParticleEffect } from "./ParticleEffect";
import { useSettings } from "@/hooks/useSettings";

export const Layout = () => {
  const s = useSettings();
  const loc = useLocation();
  return (
    <div className="min-h-screen flex flex-col relative">
      <ParticleEffect />
      {s?.show_announcement_bar && s?.announcement_bar_text && (
        <div className="relative z-20 gradient-primary text-primary-foreground text-center text-sm font-semibold py-2 px-4">
          {s.announcement_bar_text}
        </div>
      )}
      <Header />
      <main key={loc.pathname} className="flex-1 relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
