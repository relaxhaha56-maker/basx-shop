import { useEffect, useRef } from "react";
import { useSettings } from "@/hooks/useSettings";

export const ParticleEffect = () => {
  const settings = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!settings || !settings.particle_enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.max(10, Math.min(300, settings.particle_count));
    const speedMul = Math.max(0.1, Math.min(5, settings.particle_speed));
    const type = settings.particle_type;

    const particles = Array.from({ length: count }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 3 + 1,
      vy: (Math.random() * 0.6 + 0.3) * speedMul,
      vx: (Math.random() - 0.5) * 0.4 * speedMul,
      sway: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.sway += 0.01;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.sway) * 0.3;
        if (p.y > canvas.height) { p.y = -5; p.x = Math.random() * canvas.width; }
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;

        if (type === "sakura") {
          ctx.fillStyle = `hsla(335, 80%, 75%, 0.85)`;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.r * 1.4, p.r * 0.8, p.sway, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === "stars") {
          ctx.fillStyle = `hsla(${settings.accent_hue}, 100%, 80%, 0.9)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === "bubbles") {
          ctx.strokeStyle = `hsla(${settings.primary_hue}, 100%, 70%, 0.6)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // snow (default)
          ctx.fillStyle = `rgba(255,255,255,0.85)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [settings]);

  if (!settings?.particle_enabled) return null;
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
};
