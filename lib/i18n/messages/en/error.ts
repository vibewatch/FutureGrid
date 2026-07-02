export const errorEn: Record<string, string> = {
  // ── app/error.tsx ─────────────────────────────────────────────────────────
  errorTitle: "Something went wrong",
  errorBody:
    "An unexpected error disrupted this page. You can try again or go back to the dashboard.",
  errorId:    "Error ID",
  tryAgain:   "↺ Try again",
  dashboard:  "← Dashboard",

  // ── app/not-found.tsx ─────────────────────────────────────────────────────
  notFoundTitle: "This page drifted off the grid",
  notFoundBody:
    "The URL you followed doesn\u2019t match any route in FutureGrid. Head back to a known destination below.",
  navReturnTo: "Return to a section",
  navDashboard: "Dashboard",
  navCareers:   "Careers",
  navGlobal:    "Global",
  navSources:   "Sources",

  // ── app/global-error.tsx ──────────────────────────────────────────────────
  globalErrorTitle: "Something went wrong",
  globalErrorBody:  "An unexpected error disrupted the grid.",
  globalPageTitle:  "Something went wrong · FutureGrid",
  goHome:           "← Go home",
};
