"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

type State = "hidden" | "visible" | "immediate";

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export default function Reveal({ children, delay = 0, className }: Props) {
  const [state, setState] = useState<State>("hidden");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Defer to avoid synchronous setState-in-effect
      const id = setTimeout(() => setState("immediate"), 0);
      return () => clearTimeout(id);
    }

    const el = ref.current;
    if (!el) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          if (delay > 0) {
            timeoutId = setTimeout(() => setState("visible"), delay);
          } else {
            setState("visible");
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [delay]);

  // Under reduced-motion: plain div with no transform/transition
  if (state === "immediate") {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    state === "visible" ? 1 : 0,
        transform:  state === "visible" ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.55s ease-out ${delay}ms, transform 0.55s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
