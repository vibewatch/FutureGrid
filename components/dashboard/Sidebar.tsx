"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "⌂" },
  { href: "/sectors", label: "Sectors", icon: "▤" },
  { href: "/careers", label: "Careers", icon: "☷" },
  { href: "/skills", label: "Skills", icon: "↗" },
  { href: "/heatmap", label: "Heatmap", icon: "◫" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col z-40">
      <div className="p-5 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
            FG
          </div>
          <span className="text-lg font-bold text-white tracking-tight">FutureGrid</span>
        </Link>
      </div>
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-zinc-800 text-xs text-zinc-600">
        <p>Data sources: BLS, O*NET</p>
        <p>Frey &amp; Osborne (2013)</p>
      </div>
    </aside>
  );
}