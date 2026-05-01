import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ParticleEffect } from "./ParticleEffect";

export const Layout = () => (
  <div className="min-h-screen flex flex-col relative">
    <ParticleEffect />
    <Header />
    <main className="flex-1 relative z-10 animate-fade-in">
      <Outlet />
    </main>
    <Footer />
  </div>
);
