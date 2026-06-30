"use client";

import { useEffect, useRef } from "react";

const GRID_SIZE = 60;
const GRID_ALPHA = 0.06;
const VIOLET = [139, 92, 246] as const;
const CYAN   = [34, 211, 238] as const;

type GlowDot = {
  x: number; y: number;
  vx: number; vy: number;
  r: number; alpha: number;
  color: readonly [number, number, number];
};

export default function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = window.devicePixelRatio || 1;
    let w = 0, h = 0;
    const offset = { x: 0, y: 0 };

    function resize() {
      if (!canvas) return;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const dots: GlowDot[] = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: 80 + Math.random() * 100,
      alpha: 0.025 + Math.random() * 0.035,
      color: i % 2 === 0 ? VIOLET : CYAN,
    }));

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // Drifting grid lines
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${VIOLET[0]},${VIOLET[1]},${VIOLET[2]},${GRID_ALPHA})`;
      ctx.lineWidth = 0.5;
      const ox = ((offset.x % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
      const oy = ((offset.y % GRID_SIZE) + GRID_SIZE) % GRID_SIZE;
      for (let x = ox - GRID_SIZE; x <= w + GRID_SIZE; x += GRID_SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = oy - GRID_SIZE; y <= h + GRID_SIZE; y += GRID_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Glow dots
      for (const dot of dots) {
        const g = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dot.r);
        g.addColorStop(0, `rgba(${dot.color[0]},${dot.color[1]},${dot.color[2]},${dot.alpha})`);
        g.addColorStop(1, `rgba(${dot.color[0]},${dot.color[1]},${dot.color[2]},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();

        if (!reduced) {
          dot.x += dot.vx;
          dot.y += dot.vy;
          if (dot.x < -dot.r) dot.x = w + dot.r;
          if (dot.x > w + dot.r) dot.x = -dot.r;
          if (dot.y < -dot.r) dot.y = h + dot.r;
          if (dot.y > h + dot.r) dot.y = -dot.r;
        }
      }
    }

    // Static mode (reduced motion)
    if (reduced) {
      draw();
      const onResize = () => { resize(); draw(); };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    // Animated mode
    let raf: number;
    function animate() {
      offset.x += 0.18;
      offset.y += 0.09;
      draw();
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    />
  );
}
