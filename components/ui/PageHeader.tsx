import type { ReactNode } from "react";

/**
 * Standard page header: small eyebrow, a restrained title, a one-paragraph
 * description, optional metadata chips (e.g. data freshness) and actions.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
          {title}
        </h1>
        {description && (
          <div className="mt-2 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</div>
        )}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Section header used between content blocks on a page. */
export function SectionHeader({
  id,
  eyebrow,
  title,
  description,
  actions,
}: {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 id={id} className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Consistent button-styled links for page/section actions. */
export const buttonPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)] dark:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]";

export const buttonSecondary =
  "inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-[var(--border-strong)] hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]";
