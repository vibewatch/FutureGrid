"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
};

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export default function AnimatedCounter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 1500,
  className,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Observe scroll-into-view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Run count-up animation (or instant set under reduced-motion)
  useEffect(() => {
    if (!triggered) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Under reduced-motion use duration 0 → t hits 1 on first RAF tick
    const effectiveDuration = reduced ? 0 : durationMs;

    const startTime = performance.now();
    let rafId: number;

    function tick(now: number) {
      const t = effectiveDuration === 0 ? 1 : Math.min((now - startTime) / effectiveDuration, 1);
      setCurrent(easeOutExpo(t) * value);
      if (t < 1) rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [triggered, value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {current.toFixed(decimals)}
      {suffix}
    </span>
  );
}
