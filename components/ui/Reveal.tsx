import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Retained for API compatibility; content now renders immediately. */
  delay?: number;
  className?: string;
};

/**
 * Layout wrapper formerly used for scroll-triggered fade-ins. Content now
 * renders immediately so data is visible on first paint, in print, and to
 * crawlers — a deliberate choice for an analytical, report-style product.
 */
export default function Reveal({ children, className }: Props) {
  return <div className={className}>{children}</div>;
}
