import type { ComponentType } from "react";

export interface NavItem {
  href: string;
  /** Key into the "nav" i18n namespace. */
  labelKey: string;
  Icon: ComponentType;
}

export interface NavSection {
  /** Key into the "nav" i18n namespace. */
  key: string;
  items: NavItem[];
}

// ─── Inline SVG icons (stroke-based, 16 px) ─────────────────────────────────
function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3"  y="3"  width="7" height="7" rx="1" />
      <rect x="14" y="3"  width="7" height="7" rx="1" />
      <rect x="3"  y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconSectors() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3"  y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7"  width="4" height="14" rx="1" />
      <rect x="17" y="4"  width="4" height="17" rx="1" />
    </svg>
  );
}

function IconCareers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
}

function IconVisa() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 9h20" />
      <path d="M7 15h4" />
      <path d="M15 15h2" />
    </svg>
  );
}

function IconSkills() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconLabor() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="2 12 6 12 8 4 10 20 12 12 14 16 16 12 22 12" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconSources() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconExplore() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="8 17 10 13 12 15 14 11 16 14" />
    </svg>
  );
}

function IconMethodology() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3H5a2 2 0 0 0-2 2v4" />
      <path d="M9 3h10a2 2 0 0 1 2 2v4" />
      <path d="M3 9v10a2 2 0 0 0 2 2h4" />
      <path d="M21 9v10a2 2 0 0 1-2 2h-4" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function IconInsights() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <circle cx="8" cy="14" r="1.5" />
      <circle cx="13" cy="10" r="1.5" />
      <circle cx="18" cy="7" r="1.5" />
      <path d="M9.2 13.1l2.6-2.2" />
      <path d="M14.4 9.4l2.2-1.5" />
    </svg>
  );
}

function IconFrontier() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <rect x="6" y="10" width="3" height="4" rx="0.5" />
      <rect x="10.5" y="10" width="3" height="4" rx="0.5" />
      <rect x="15" y="10" width="3" height="4" rx="0.5" />
      <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ─── Nav sections ──────────────────────────────────────────────────────────────
export const NAV_SECTIONS: NavSection[] = [
  {
    key: "secOverview",
    items: [
      { href: "/", labelKey: "dashboard", Icon: IconDashboard },
      { href: "/report", labelKey: "report", Icon: IconReport },
      { href: "/analysis", labelKey: "analysis", Icon: IconInsights },
    ],
  },
  {
    key: "secWorkforce",
    items: [
      { href: "/careers", labelKey: "careers", Icon: IconCareers },
      { href: "/sectors", labelKey: "sectors", Icon: IconSectors },
      { href: "/explore", labelKey: "explore", Icon: IconExplore },
      { href: "/skills", labelKey: "skills", Icon: IconSkills },
    ],
  },
  {
    key: "secLaborSignals",
    items: [
      { href: "/labor", labelKey: "labor", Icon: IconLabor },
      { href: "/visa", labelKey: "visa", Icon: IconVisa },
    ],
  },
  {
    key: "secAIEcosystem",
    items: [
      { href: "/global", labelKey: "global", Icon: IconGlobe },
      { href: "/frontier", labelKey: "frontier", Icon: IconFrontier },
    ],
  },
  {
    key: "secDataGovernance",
    items: [
      { href: "/sources", labelKey: "sources", Icon: IconSources },
      { href: "/methodology", labelKey: "methodology", Icon: IconMethodology },
    ],
  },
];

/** Resolve the active nav item + its section for a pathname (longest-prefix match). */
export function findActiveNav(pathname: string): { section: NavSection; item: NavItem } | null {
  let best: { section: NavSection; item: NavItem } | null = null;
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const match = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (match && (!best || item.href.length > best.item.href.length)) best = { section, item };
    }
  }
  return best;
}
