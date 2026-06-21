export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

export function parseBLSValue(v: string): number {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

export function socCodeToOnet(soc: string): string {
  return soc.includes(".") ? soc : `${soc}.00`;
}

export function colorForRisk(risk: string): string {
  switch (risk) {
    case "Low": return "#22c55e";
    case "Medium": return "#eab308";
    case "High": return "#f97316";
    case "Very High": return "#ef4444";
    default: return "#6b7280";
  }
}