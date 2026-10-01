// Number parsing and display shared by the calculator and the protocol screens.

/**
 * Read a number the way people type one. The decimal keypad produces a comma
 * in many regions, and parseFloat("2,5") quietly returns 2.
 */
export function parseNum(text) {
  if (text == null) return NaN;
  const cleaned = String(text).trim().replace(",", ".");
  if (cleaned === "") return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** A number with at most `digits` decimals and no trailing zeros. */
export function trimNum(n, digits = 2) {
  if (n == null || !Number.isFinite(n)) return "";
  const fixed = n.toFixed(digits);
  // Only zeros after a decimal point are padding. Without this check a whole
  // number asked for with no decimals ("100") would lose its own zeros.
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
}

/** Thousands separators for the bigger figures (concentrations). */
export function groupNum(n, digits = 1) {
  if (n == null || !Number.isFinite(n)) return "";
  const [whole, frac] = trimNum(n, digits).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

/** An amount stored in mcg, shown in the unit the user chose. */
export function amountFromMcg(mcg, unit = "mcg", iuPerMg = null) {
  if (mcg == null || !Number.isFinite(mcg)) return "";
  if (unit === "mg") return trimNum(mcg / 1000, 3);
  if (unit === "IU" && iuPerMg) return trimNum((mcg / 1000) * iuPerMg, 2);
  return trimNum(mcg, mcg < 10 ? 2 : 1);
}

/** "5 to 10 mg", or "5 mg" when both ends are the same or one is missing. */
export function rangeText(low, high, unit) {
  const hasLow = low != null;
  const hasHigh = high != null;
  if (!hasLow && !hasHigh) return "";
  const suffix = unit ? ` ${unit}` : "";
  if (hasLow && hasHigh && low !== high) return `${trimNum(low, 4)} to ${trimNum(high, 4)}${suffix}`;
  return `${trimNum(hasLow ? low : high, 4)}${suffix}`;
}

export function dateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function dateOnly(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
