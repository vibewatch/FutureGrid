import type { WarnData } from "@/lib/warn-types";

// ─── Client-side WARN loader ─────────────────────────────────────────────────
// Fetches the static public/warn-notices.json (emitted by build:warn-public) at
// runtime so the ~2.7MB dataset stays out of client JS chunks. The promise is
// memoized so multiple views share a single request.

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

let _warnPromise: Promise<WarnData> | null = null;

export function fetchWarnData(): Promise<WarnData> {
  if (!_warnPromise) {
    _warnPromise = fetch(`${BASE_PATH}/warn-notices.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<WarnData>;
      })
      .catch((err) => {
        // Reset so a later retry can re-attempt the fetch.
        _warnPromise = null;
        throw err;
      });
  }
  return _warnPromise;
}
