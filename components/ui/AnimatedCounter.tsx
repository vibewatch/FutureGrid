type Props = {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Retained for API compatibility; the final value renders immediately. */
  durationMs?: number;
  className?: string;
};

/**
 * Formatted numeric figure. Previously animated a count-up from zero, which
 * rendered misleading "0" values before hydration and in screenshots/print;
 * the final value is now rendered directly.
 */
export default function AnimatedCounter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: Props) {
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
