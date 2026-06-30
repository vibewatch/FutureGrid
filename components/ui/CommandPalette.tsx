"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSearchIndex, type SearchItem } from "@/lib/data";

function riskColor(risk: number): string {
  if (risk < 30) return "#22c55e";
  if (risk < 50) return "#eab308";
  if (risk < 70) return "#f97316";
  return "#ef4444";
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

const TYPE_META: Record<SearchItem["type"], { label: string; abbr: string; colorClass: string }> = {
  occupation: { label: "Occupations",  abbr: "J",  colorClass: "bg-violet-500/15 text-violet-400" },
  sector:     { label: "Sectors",      abbr: "S",  colorClass: "bg-cyan-500/15 text-cyan-400"    },
  skill:      { label: "Skills",       abbr: "Sk", colorClass: "bg-green-500/15 text-green-400"  },
};

export default function CommandPalette() {
  const router = useRouter();

  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [selected, setSelected] = useState(0);
  const [reducedMotion] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const prevFocusRef = useRef<Element | null>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const dialogRef    = useRef<HTMLDivElement>(null);

  // ── Open / close helpers ───────────────────────────────────────────────────

  const openPalette = useCallback(() => {
    prevFocusRef.current = document.activeElement;
    // Load search index once
    if (allItems.length === 0) {
      setAllItems(getSearchIndex());
    }
    setQuery("");
    setSelected(0);
    setOpen(true);
  }, [allItems.length]);

  // Focus restoration on close — handled in an effect so no refs are read
  // during render or inside callbacks passed as JSX props
  useEffect(() => {
    if (!open && prevFocusRef.current instanceof HTMLElement) {
      prevFocusRef.current.focus();
    }
  }, [open]);

  const closePalette = useCallback(() => setOpen(false), []);

  // navigateTo: only closes open state + calls router.push — zero ref access
  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // ── Global: Cmd/Ctrl+K ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openPalette]);

  // ── Custom window event ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = () => openPalette();
    window.addEventListener("open-command-palette", handler);
    return () => window.removeEventListener("open-command-palette", handler);
  }, [openPalette]);

  // ── Focus input on open ───────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open]);

  // ── Filter + group ─────────────────────────────────────────────────────────

  const filtered = useMemo((): SearchItem[] => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 20);
    return allItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.sublabel?.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [allItems, query]);

  const groups = useMemo(() => {
    const map = new Map<SearchItem["type"], SearchItem[]>();
    for (const item of filtered) {
      if (!map.has(item.type)) map.set(item.type, []);
      map.get(item.type)!.push(item);
    }
    return Array.from(map.entries()).map(([type, items]) => ({ type, items }));
  }, [filtered]);

  // ── Dialog keyboard: ↑ ↓ Enter Esc + Tab trap ────────────────────────────

  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closePalette();
          return;

        case "ArrowDown":
          e.preventDefault();
          if (filtered.length > 0)
            setSelected((s) => (s + 1) % filtered.length);
          return;

        case "ArrowUp":
          e.preventDefault();
          if (filtered.length > 0)
            setSelected((s) => (s - 1 + filtered.length) % filtered.length);
          return;

        case "Enter": {
          const item = filtered[selected];
          if (item) navigateTo(item.href);
          return;
        }

        case "Tab": {
          const dialog = dialogRef.current;
          if (!dialog) return;
          const focusable = Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
            )
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last  = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
          } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, filtered, selected, navigateTo, closePalette]);

  // ── Scroll selected item into view ─────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(`cp-item-${selected}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, selected]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!open) return null;

  // Flat index offset helper: find where each group starts in `filtered`
  const groupOffset = (groupIndex: number) => {
    let offset = 0;
    for (let i = 0; i < groupIndex; i++) offset += groups[i].items.length;
    return offset;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={closePalette}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette — search occupations, sectors, skills"
        className={`fixed left-1/2 z-[9999] w-full max-w-lg -translate-x-1/2 glass shadow-2xl overflow-hidden${
          !reducedMotion ? " animate-fade-up" : ""
        }`}
        style={{ top: "18vh" }}
      >
        {/* Search row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-200 dark:border-zinc-700/60">
          <span className="text-zinc-500 shrink-0">
            <IconSearch />
          </span>
          <input
            ref={inputRef}
            id="cp-input"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search occupations, sectors, skills…"
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="cp-listbox"
            aria-activedescendant={filtered.length > 0 ? `cp-item-${selected}` : undefined}
            className="flex-1 bg-transparent text-zinc-900 dark:text-white placeholder:text-zinc-500 text-sm outline-none"
          />
          <kbd className="text-[10px] text-zinc-500 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          id="cp-listbox"
          role="listbox"
          aria-label="Search results"
          className="max-h-80 overflow-y-auto py-1.5"
        >
          {filtered.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8 select-none">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            groups.map(({ type, items }, gi) => {
              const meta   = TYPE_META[type];
              const offset = groupOffset(gi);
              return (
                <div key={type}>
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600 px-4 pt-2.5 pb-1 select-none">
                    {meta.label}
                  </p>
                  {items.map((item, ii) => {
                    const idx        = offset + ii;
                    const isSelected = idx === selected;
                    return (
                      <div
                        key={`${item.type}::${item.href}`}
                        id={`cp-item-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelected(idx)}
                        onClick={() => navigateTo(item.href)}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors${
                          isSelected
                            ? " bg-violet-500/20 text-zinc-900 dark:text-white"
                            : " text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        {/* Type badge */}
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${meta.colorClass}`}
                          aria-hidden="true"
                        >
                          {meta.abbr}
                        </span>

                        {/* Label + sublabel */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate leading-tight">{item.label}</p>
                          {item.sublabel && (
                            <p className="text-xs text-zinc-500 truncate leading-tight">{item.sublabel}</p>
                          )}
                        </div>

                        {/* Risk badge */}
                        {item.risk !== undefined && (
                          <span
                            className="ml-auto text-xs font-semibold shrink-0 tabular-nums"
                            style={{ color: riskColor(item.risk) }}
                          >
                            {item.risk.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="border-t border-zinc-200 dark:border-zinc-700/60 px-4 py-2 flex items-center gap-4 text-[11px] text-zinc-600 select-none">
          <span>
            <kbd className="border border-zinc-300 dark:border-zinc-700/80 rounded px-1">↑</kbd>
            <kbd className="border border-zinc-300 dark:border-zinc-700/80 rounded px-1 ml-0.5">↓</kbd>
            {" "}navigate
          </span>
          <span><kbd className="border border-zinc-300 dark:border-zinc-700/80 rounded px-1">↵</kbd> open</span>
          <span><kbd className="border border-zinc-300 dark:border-zinc-700/80 rounded px-1">Esc</kbd> close</span>
          {filtered.length > 0 && (
            <span className="ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </>
  );
}
