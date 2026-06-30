"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number; // 0–100
  size?: number; // default 140
  label?: string;
  sublabel?: string;
  className?: string;
}

function bandColor(value: number): string {
  if (value < 30) return "#22c55e";
  if (value < 50) return "#eab308";
  if (value < 70) return "#f97316";
  return "#ef4444";
}

function bandLabel(value: number): string {
  if (value < 30) return "Low";
  if (value < 50) return "Medium";
  if (value < 70) return "High";
  return "Very High";
}

export default function RiskGauge({
  value,
  size = 140,
  label,
  sublabel,
  className,
}: Props) {
  const strokeWidth = Math.max(10, size * 0.088);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const finalOffset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);

  // dashOffset animates from circumference (empty) → finalOffset (filled)
  const [dashOffset, setDashOffset] = useState(circumference);
  const [triggered, setTriggered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Observe scroll-into-view — setState only in observer callback, not effect body
  useEffect(() => {
    const el = containerRef.current;
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

  // RAF-based animation (same pattern as AnimatedCounter) — respects reduced-motion
  useEffect(() => {
    if (!triggered) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : 900;
    const startTime = performance.now();
    const startOff  = circumference;
    let rafId: number;

    function tick(now: number) {
      const t      = duration === 0 ? 1 : Math.min((now - startTime) / duration, 1);
      const eased  = 1 - Math.pow(1 - t, 3); // cubic easeOut
      setDashOffset(startOff + (finalOffset - startOff) * eased);
      if (t < 1) rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [triggered, circumference, finalOffset]);

  const color = bandColor(value);
  const cx = size / 2;
  const cy = size / 2;

  // Vertical layout for text rows
  const rowCount = 1 + (label ? 1 : 0) + (sublabel ? 1 : 0);
  const rowH = size * 0.16;
  const startY = cy - ((rowCount - 1) * rowH) / 2;
  const valueFontSize = Math.max(16, size * 0.22);
  const labelFontSize = Math.max(10, size * 0.10);
  const sublabelFontSize = Math.max(9, size * 0.085);

  const ariaLabel = `${label ?? "Automation risk"}: ${value}% — ${bandLabel(value)} risk${
    sublabel ? `, ${sublabel}` : ""
  }`;

  return (
    <div
      ref={containerRef}
      className={`inline-flex flex-col items-center ${className ?? ""}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={ariaLabel}
      >
        {/* Track ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
        />
        {/* Soft glow behind progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={0.18}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Center value */}
        <text
          x={cx}
          y={startY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={valueFontSize}
          fontWeight="700"
        >
          {value}%
        </text>
        {label && (
          <text
            x={cx}
            y={startY + rowH}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#a1a1aa"
            fontSize={labelFontSize}
          >
            {label}
          </text>
        )}
        {sublabel && (
          <text
            x={cx}
            y={startY + rowH * (label ? 2 : 1)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#71717a"
            fontSize={sublabelFontSize}
          >
            {sublabel}
          </text>
        )}
      </svg>
    </div>
  );
}
