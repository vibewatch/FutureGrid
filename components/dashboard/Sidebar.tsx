"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import CommandPalette from "@/components/ui/CommandPalette";
import { getDataSources } from "@/lib/data";
import { useT } from "@/lib/i18n/useT";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

const _dataAsOf: string | null = (() => {
  try {
    const { generatedAt } = getDataSources();
    if (!generatedAt) return null;
    const d = new Date(generatedAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return null;
  }
})();

// ─── Inline SVG icons (stroke-based, 18–20 px) ─────────────────────────────────
function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3"  y="3"  width="7" height="7" rx="1" />
      <rect x="14" y="3"  width="7" height="7" rx="1" />
      <rect x="3"  y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconSectors() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3"  y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7"  width="4" height="14" rx="1" />
      <rect x="17" y="4"  width="4" height="17" rx="1" />
    </svg>
  );
}

function IconCareers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
}

function IconSkills() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconLabor() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="2 12 6 12 8 4 10 20 12 12 14 16 16 12 22 12" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconSources() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconExplore() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6"  cy="6"  r="1.5" />
      <circle cx="12" cy="4"  r="1.5" />
      <circle cx="18" cy="8"  r="1.5" />
      <circle cx="5"  cy="14" r="1.5" />
      <circle cx="13" cy="12" r="1.5" />
      <circle cx="19" cy="16" r="1.5" />
      <circle cx="8"  cy="19" r="1.5" />
      <circle cx="16" cy="20" r="1.5" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="8 17 10 13 12 15 14 11 16 14" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Detect client-side mount to avoid hydration mismatch with next-themes
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <button
        className="p-1.5 rounded-md text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors w-8 h-8"
        aria-label="Toggle theme"
        disabled
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
    >
      {isDark ? <IconSun /> : <IconMoon />}
    </button>
  );
}

// ─── Nav sections ──────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { key: "secOverview",   items: [ { href: "/",        labelKey: "dashboard", Icon: IconDashboard }, { href: "/report",   labelKey: "report",   Icon: IconReport  } ] },
  { key: "secExposure",   items: [ { href: "/careers", labelKey: "careers",   Icon: IconCareers   }, { href: "/sectors",  labelKey: "sectors",  Icon: IconSectors }, { href: "/explore", labelKey: "explore", Icon: IconExplore } ] },
  { key: "secLabor",      items: [ { href: "/labor",   labelKey: "labor",     Icon: IconLabor     }, { href: "/global",   labelKey: "global",   Icon: IconGlobe   } ] },
  { key: "secTransition", items: [ { href: "/skills",  labelKey: "skills",    Icon: IconSkills    } ] },
  { key: "secAbout",      items: [ { href: "/sources", labelKey: "sources",   Icon: IconSources   } ] },
];

// ─── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md">
      <div className="w-8 h-8 rounded-lg brand-grad flex items-center justify-center text-white font-black text-xs tracking-tight shadow-lg shrink-0">
        FG
      </div>
      <span className="text-[17px] font-bold tracking-tight text-zinc-900 dark:text-white leading-none">
        Future<span className="text-gradient">Grid</span>
      </span>
    </Link>
  );
}

// ─── Search button ─────────────────────────────────────────────────────────────
function SearchButton({ onNavigate }: { onNavigate?: () => void }) {
  const handleClick = () => {
    window.dispatchEvent(new Event("open-command-palette"));
    onNavigate?.();
  };
  return (
    <div className="px-3 pt-3 pb-1">
      <button
        onClick={handleClick}
        aria-label="Open search command palette (Cmd K)"
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg glass text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        {/* Search icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="flex-1 text-left text-xs">Search…</span>
        <kbd className="text-[10px] border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 font-sans">⌘K</kbd>
      </button>
    </div>
  );
}

// ─── Nav list (shared between desktop sidebar & mobile drawer) ─────────────────
function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const t = useT("nav");
  return (
    <>
      <SearchButton onNavigate={onNavigate} />
      <nav className="flex-1 p-3" aria-label="Main navigation">
        <ul className="space-y-4">
          {NAV_SECTIONS.map((section) => (
            <li key={section.key}>
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-500 select-none">
                {t(section.key)}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ href, labelKey, Icon }) => {
                  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                          isActive
                            ? "bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-white"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 brand-grad rounded-full"
                            aria-hidden="true"
                          />
                        )}
                        <span className={isActive ? "text-violet-500 dark:text-violet-400" : ""}>
                          <Icon />
                        </span>
                        <span className={isActive ? "text-gradient font-semibold" : ""}>
                          {t(labelKey)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/60 text-xs text-zinc-500 space-y-1">
        <p className="leading-snug">Data: Anthropic Economic Index · BLS · O*NET</p>
        <Link href="/sources" className="text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors">
          View sources →
        </Link>
        {_dataAsOf && (
          <p className="text-zinc-400 dark:text-zinc-600 leading-snug">Data as of {_dataAsOf}</p>
        )}
      </div>
    </>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hamburgerRef  = useRef<HTMLButtonElement>(null);
  const drawerRef     = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close drawer on route change (deferred to avoid synchronous setState-in-effect)
  useEffect(() => {
    const id = setTimeout(() => setDrawerOpen(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);

  // Focus management: focus close button on open, restore hamburger on close
  useEffect(() => {
    if (drawerOpen) {
      closeButtonRef.current?.focus();
    } else {
      hamburgerRef.current?.focus();
    }
  }, [drawerOpen]);

  // Escape to close + Tab focus trap
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  return (
    <>
      {/* CommandPalette — global singleton, available app-wide via Sidebar mount */}
      <CommandPalette />

      {/* ── Mobile top bar (hidden at lg+) ─────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800/80 flex items-center gap-3 px-4 lg:hidden z-50">
        <button
          ref={hamburgerRef}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
        >
          <IconMenu />
        </button>
        <Logo />
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* ── Desktop sidebar (hidden below lg) ──────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-60 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-sm border-r border-zinc-200 dark:border-zinc-800/60 flex-col z-40">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <NavList pathname={pathname} />
      </aside>

      {/* ── Mobile overlay ──────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile slide-in drawer ──────────────────────────────────────────── */}
      <aside
        ref={drawerRef}
        className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col z-50 lg:hidden motion-safe:transition-transform motion-safe:duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation drawer"
        aria-hidden={!drawerOpen}
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
          <Logo onClick={() => setDrawerOpen(false)} />
          <button
            ref={closeButtonRef}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
          >
            <IconX />
          </button>
        </div>
        <NavList pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
      </aside>
    </>
  );
}