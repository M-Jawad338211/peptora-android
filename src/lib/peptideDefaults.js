/**
 * What a protocol form may take from a library entry: the unit the compound
 * is usually measured in, and the IU conversion factor when it has one.
 *
 * Deliberately nothing else. The library lists dose ranges reported in the
 * literature, with their sources, as reference reading. They are never copied
 * into a calculator or a protocol: the amount in a protocol is whatever the
 * user types, and Peptora does not suggest one.
 */
const UNITS = ["mcg", "mg", "IU"];

export function protocolDefaultsFromPeptide(peptide) {
  const iu_per_mg = peptide?.iu_per_mg ?? null;
  let dose_unit = peptide?.default_dose_unit;
  if (!UNITS.includes(dose_unit)) dose_unit = "mcg";
  if (dose_unit === "IU" && !iu_per_mg) dose_unit = "mcg";
  return { dose_unit, iu_per_mg };
}
