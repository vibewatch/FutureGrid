// Shared app-shell pieces used by the client-side Sidebar and TopBar. This
// module is intentionally not a "use client" entry: it is only imported from
// client components, so function props (onClick/onNavigate) are allowed.
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

// ─── Logo ──────────────────────────────────────────────────────────────────────
export function Logo({ onClick }: { onClick?: () => void }) {
  const t = useT("nav");
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-[11px] font-bold tracking-tight text-white dark:text-zinc-950" aria-hidden="true">
        FG
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-white">FutureGrid</span>
        <span className="mt-1 text-[10.5px] font-medium text-zinc-500 dark:text-zinc-400">{t("tagline")}</span>
      </span>
    </Link>
  );
}

// ─── Search button ─────────────────────────────────────────────────────────────
export function SearchButton({ onNavigate, className = "" }: { onNavigate?: () => void; className?: string }) {
  const t = useT("nav");
  const handleClick = () => {
    window.dispatchEvent(new Event("open-command-palette"));
    onNavigate?.();
  };
  return (
    <button
      onClick={handleClick}
      aria-label={t("openSearch")}
      className={`flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-sm text-zinc-500 transition-colors hover:border-[var(--border-strong)] hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span className="flex-1 text-left text-[13px]">{t("searchPlaceholder")}</span>
      <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 font-sans text-[10px] text-zinc-500">⌘K</kbd>
    </button>
  );
}

