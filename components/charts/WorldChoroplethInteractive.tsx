"use client";

import WorldChoropleth from "./WorldChoropleth";

/**
 * Thin client island that forwards map-country-select events to CountryDetailPanel
 * via a window custom event, crossing the server/client component boundary cleanly.
 */
export default function WorldChoroplethInteractive() {
  return (
    <WorldChoropleth
      onCountrySelect={(iso3) => {
        window.dispatchEvent(new CustomEvent("fg:openCountry", { detail: iso3 }));
      }}
    />
  );
}
