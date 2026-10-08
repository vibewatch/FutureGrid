"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CommandPalette from "@/components/ui/CommandPalette";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { Logo, SearchButton } from "@/components/dashboard/shell-parts";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { NAV_SECTIONS, findActiveNav } from "@/components/dashboard/nav-config";
import { getDataSources } from "@/lib/data";
import { useT } from "@/lib/i18n/useT";

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

// ─── Nav list (shared between desktop sidebar & mobile drawer) ─────────────────
function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const t = useT("nav");
  const active = findActiveNav(pathname);
  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={t("mainNav")}>
        <ul className="space-y-5">
          {NAV_SECTIONS.map((section) => (
            <li key={section.key}>
              <p className="eyebrow mb-1.5 px-2.5 select-none">{t(section.key)}</p>
              <ul className="space-y-px">
                {section.items.map(({ href, labelKey, Icon }) => {
                  const isActive = active?.item.href === href;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13.5px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                          isActive
                            ? "bg-[var(--accent-soft)] font-semibold text-zinc-900 dark:text-white"
                            : "font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-[var(--accent)]" aria-hidden="true" />
                        )}
                        <span className={isActive ? "text-[var(--accent)]" : "text-zinc-400 dark:text-zinc-500"}>
                          <Icon />
                        </span>
                        <span>{t(labelKey)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-1.5 border-t border-[var(--border)] px-5 py-4 text-[11.5px] leading-snug text-zinc-500 dark:text-zinc-400">
        {_dataAsOf && (
          <p className="flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            {t("dataAsOf", { date: _dataAsOf })}
          </p>
        )}
        <p>{t("dataAttribution")}</p>
        <Link href="/sources" onClick={onNavigate} className="inline-block font-medium text-[var(--accent)] hover:underline underline-offset-2">
          {t("viewSources")} →
        </Link>
      </div>
    </>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const t = useT("nav");
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
      <header data-app-chrome className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/95 px-4 backdrop-blur lg:hidden">
        <button
          ref={hamburgerRef}
          onClick={() => setDrawerOpen(true)}
          aria-label={t("openNav")}
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <IconMenu />
        </button>
        <Logo />
        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* ── Desktop sidebar (hidden below lg) ──────────────────────────────── */}
      <aside data-app-chrome className="fixed left-0 top-0 z-40 hidden h-full w-60 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)] lg:flex">
        <div className="flex h-14 items-center border-b border-[var(--border)] px-5">
          <Logo />
        </div>
        <NavList pathname={pathname} />
      </aside>

      {/* ── Mobile overlay ──────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile slide-in drawer ──────────────────────────────────────────── */}
      <aside
        ref={drawerRef}
        className={`fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)] lg:hidden motion-safe:transition-transform motion-safe:duration-200 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label={t("navDrawer")}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen ? true : undefined}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
          <Logo onClick={() => setDrawerOpen(false)} />
          <button
            ref={closeButtonRef}
            onClick={() => setDrawerOpen(false)}
            aria-label={t("closeNav")}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <IconX />
          </button>
        </div>
        <div className="px-3 pt-3">
          <SearchButton onNavigate={() => setDrawerOpen(false)} className="w-full" />
        </div>
        <NavList pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
      </aside>
    </>
  );
}
