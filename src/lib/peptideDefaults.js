/**
 * Derive protocol UI defaults from a PeptideDetail response.
 * Spec §5 — reads dose_ranges only, never vial size.
 */
export function protocolDefaultsFromPeptide(peptide) {
  if (!peptide) {
    return { dose_unit: "mcg", suggested_dose_low: null, suggested_dose_high: null,
             suggested_frequency: null, iu_per_mg: null, framing: null };
  }

  const ranges = peptide.dose_ranges ?? [];

  // Prefer the first range whose context mentions non-clinical or anecdotal use
  const preferred = ranges.find((r) => /non-clinical|anecdotal/i.test(r.context ?? ""))
    ?? ranges[0]
    ?? null;

  const dose_unit = preferred?.unit ?? peptide.default_dose_unit ?? "mcg";

  return {
    dose_unit,
    suggested_dose_low: preferred?.low ?? null,
    suggested_dose_high: preferred?.high ?? null,
    suggested_frequency: preferred?.frequency ?? null,
    iu_per_mg: peptide.iu_per_mg ?? null,
    framing: "Studied / reported range — not a recommendation.",
  };
}
