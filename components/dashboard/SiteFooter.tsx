"use client";

import Link from "next/link";
import { NAV_SECTIONS } from "@/components/dashboard/nav-config";
import { useT } from "@/lib/i18n/useT";

const EXPLORE_HREFS = ["/careers", "/sectors", "/labor", "/global", "/frontier", "/analysis"];
const DATA_HREFS = ["/sources", "/methodology", "/report"];

export default function SiteFooter() {
  const t = useT("nav");
  const items = NAV_SECTIONS.flatMap((s) => s.items);
  const pick = (hrefs: string[]) => hrefs.map((h) => items.find((i) => i.href === h)).filter((i) => i !== undefined);

  return (
    <footer data-app-chrome className="mt-16 border-t border-[var(--border)] pt-8 pb-4 text-[13px] text-zinc-500 dark:text-zinc-400" aria-label="Site footer">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-md space-y-2">
          <p className="font-semibold text-zinc-900 dark:text-white">FutureGrid</p>
          <p className="leading-relaxed">{t("footerAbout")}</p>
          <p className="leading-relaxed text-zinc-400 dark:text-zinc-500">{t("footerDisclaimer")}</p>
        </div>
        {[
          { heading: t("footerExplore"), links: pick(EXPLORE_HREFS) },
          { heading: t("footerData"), links: pick(DATA_HREFS) },
        ].map((col) => (
          <div key={col.heading}>
            <p className="eyebrow mb-2">{col.heading}</p>
            <ul className="space-y-1.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-zinc-900 dark:hover:text-white">
                    {t(l.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-1 border-t border-[var(--border)] pt-4 text-xs sm:flex-row sm:justify-between">
        <p>{t("footerBuiltBy", { name: "Yingting Huang" })}</p>
        <p>{t("footerLicense")}</p>
      </div>
    </footer>
  );
}
