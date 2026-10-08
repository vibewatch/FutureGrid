"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/theme/ThemeToggle";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { SearchButton } from "@/components/dashboard/shell-parts";
import { findActiveNav } from "@/components/dashboard/nav-config";
import { useT } from "@/lib/i18n/useT";

/**
 * Desktop application bar: section › page breadcrumb on the left, global
 * search and display controls on the right. Hidden below lg, where the
 * Sidebar renders its own compact mobile header.
 */
export default function TopBar() {
  const pathname = usePathname();
  const t = useT("nav");
  const active = findActiveNav(pathname);
  const isDetail = active ? pathname !== active.item.href : false;

  return (
    <header
      data-app-chrome
      className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b border-[var(--border)] bg-[var(--bg)]/85 px-8 backdrop-blur lg:flex"
    >
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-2 text-[13px]">
          {active ? (
            <>
              <li className="text-zinc-500 dark:text-zinc-400">{t(active.section.key)}</li>
              <li aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">/</li>
              <li className="truncate">
                {isDetail ? (
                  <Link href={active.item.href} className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white">
                    {t(active.item.labelKey)}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-semibold text-zinc-900 dark:text-white">
                    {t(active.item.labelKey)}
                  </span>
                )}
              </li>
              {isDetail && (
                <>
                  <li aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">/</li>
                  <li aria-current="page" className="font-semibold text-zinc-900 dark:text-white">{t("detail")}</li>
                </>
              )}
            </>
          ) : (
            <li className="font-semibold text-zinc-900 dark:text-white">FutureGrid</li>
          )}
        </ol>
      </nav>
      <SearchButton className="w-64" />
      <div className="flex items-center gap-1 border-l border-[var(--border)] pl-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
