/**
 * Pure reconstitution calc engine — no I/O, no framework imports.
 * Implements spec §3 (unit normalization) and §4 (forward/inverse algorithms).
 */

const SYRINGE_UNITS_PER_ML = { "U-100": 100, "U-50": 50, "U-40": 40 };
const NICE_VOLUMES_ML = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

/**
 * Return the value in NICE_VOLUMES_ML closest to `ml`.
 */
export function snap_to_nice(ml) {
  return NICE_VOLUMES_ML.reduce((best, v) =>
    Math.abs(v - ml) < Math.abs(best - ml) ? v : best
  );
}

/**
 * Normalize any dose value to mcg.
 * @param {number} value
 * @param {"mcg"|"mg"|"IU"} unit
 * @param {number|null} iu_per_mg  — required when unit === "IU"
 * @returns {number} dose in mcg
 */
export function to_mcg(value, unit, iu_per_mg = null) {
  if (unit === "mcg") return value;
  if (unit === "mg") return value * 1000;
  if (unit === "IU") {
    if (!iu_per_mg) throw new Error("iu_per_mg required for IU conversion");
    return (value / iu_per_mg) * 1000;
  }
  throw new Error(`Unknown unit: ${unit}`);
}

/**
 * Mode A — forward calculation (water already added).
 *
 * @param {number} vial_mg
 * @param {number} bac_water_ml
 * @param {number} target_dose_mcg   — must already be normalized to mcg
 * @param {"U-100"|"U-50"|"U-40"} syringe_type
 * @returns {{ ok: boolean, errors?: string[], concentration: number,
 *             draw_volume_ml: number, syringe_units: number,
 *             doses_per_vial: number, total_mcg: number, warnings: string[] }}
 */
export function calc_forward(vial_mg, bac_water_ml, target_dose_mcg, syringe_type = "U-100") {
  const errors = [];
  if (!vial_mg || vial_mg <= 0) errors.push("Vial strength must be greater than 0.");
  if (!bac_water_ml || bac_water_ml <= 0) errors.push("BAC water volume must be greater than 0.");
  if (!target_dose_mcg || target_dose_mcg <= 0) errors.push("Target dose must be greater than 0.");
  const units_per_ml = SYRINGE_UNITS_PER_ML[syringe_type];
  if (!units_per_ml) errors.push(`Unknown syringe type: ${syringe_type}`);
  if (errors.length) return { ok: false, errors };

  const total_mcg = vial_mg * 1000;
  const concentration = total_mcg / bac_water_ml;           // mcg/mL
  const draw_volume_ml = target_dose_mcg / concentration;   // mL
  const syringe_units = draw_volume_ml * units_per_ml;      // units on syringe
  const doses_per_vial = Math.floor(total_mcg / target_dose_mcg);

  const warnings = [];
  if (target_dose_mcg > total_mcg) {
    warnings.push("Target dose exceeds the vial's total peptide content.");
  }
  if (syringe_units > units_per_ml) {
    warnings.push("Draw exceeds one full syringe — add less water or reduce the dose.");
  }
  if (syringe_units < 2 && syringe_units > 0) {
    warnings.push("Draw under 2 units — difficult to measure accurately. Consider adding more BAC water.");
  }

  return {
    ok: true,
    concentration,
    draw_volume_ml,
    syringe_units,
    doses_per_vial,
    total_mcg,
    warnings,
  };
}

/**
 * Mode B — inverse calculation (recommend water volume).
 *
 * @param {number} vial_mg
 * @param {number} target_dose_mcg   — must already be normalized to mcg
 * @param {"U-100"|"U-50"|"U-40"} syringe_type
 * @param {number} desired_units_per_dose   — default 20
 * @returns {{ ok: boolean, errors?: string[],
 *             recommended_water_ml: number, resulting_units_per_dose: number,
 *             concentration: number, draw_volume_ml: number,
 *             doses_per_vial: number, total_mcg: number,
 *             alternatives: Array, warnings: string[] }}
 */
export function calc_inverse(vial_mg, target_dose_mcg, syringe_type = "U-100", desired_units_per_dose = 20) {
  const errors = [];
  if (!vial_mg || vial_mg <= 0) errors.push("Vial strength must be greater than 0.");
  if (!target_dose_mcg || target_dose_mcg <= 0) errors.push("Target dose must be greater than 0.");
  const units_per_ml = SYRINGE_UNITS_PER_ML[syringe_type];
  if (!units_per_ml) errors.push(`Unknown syringe type: ${syringe_type}`);
  if (errors.length) return { ok: false, errors };

  const total_mcg = vial_mg * 1000;

  // Water volume that makes one dose read as desired_units_per_dose on this syringe
  const ideal_water = (desired_units_per_dose * total_mcg) / (units_per_ml * target_dose_mcg);
  const water_ml = snap_to_nice(ideal_water);

  // Recompute honest numbers from the rounded water volume
  const f = calc_forward(vial_mg, water_ml, target_dose_mcg, syringe_type);
  if (!f.ok) return f;

  // Warn when the snap was large
  if (Math.abs(ideal_water - water_ml) > 0.75) {
    f.warnings.push(
      `Ideal water (${ideal_water.toFixed(2)} mL) was rounded to the nearest standard volume (${water_ml} mL).`
    );
  }

  const alternatives = [1, 2, 3, 5].map((w) => {
    const conc = total_mcg / w;
    const units = (target_dose_mcg / conc) * units_per_ml;
    return {
      water_ml: w,
      units_per_dose: units,
      concentration: conc,
      doses_per_vial: Math.floor(total_mcg / target_dose_mcg),
    };
  });

  return {
    ok: true,
    recommended_water_ml: water_ml,
    resulting_units_per_dose: f.syringe_units,
    concentration: f.concentration,
    draw_volume_ml: f.draw_volume_ml,
    doses_per_vial: f.doses_per_vial,
    total_mcg,
    alternatives,
    warnings: f.warnings,
  };
}

/**
 * Build the normalized result object consumed by ResultsPanel / SyringeVisual.
 * Call after calc_forward or calc_inverse succeeds.
 *
 * @param {"forward"|"inverse"} mode
 * @param {object} engineResult  — output of calc_forward or calc_inverse
 * @param {object} opts
 * @param {string} opts.peptide_name
 * @param {string} opts.unit          — display unit ("mg"|"mcg"|"IU")
 * @param {number} opts.target_dose   — in display unit (before normalization)
 * @param {"U-100"|"U-50"|"U-40"} opts.syringe_type
 * @param {string|null} opts.suggested_frequency
 * @param {number} opts.doses_per_day
 */
export function build_result(mode, engineResult, opts) {
  const { peptide_name, unit, target_dose, syringe_type, suggested_frequency, doses_per_day = 1 } = opts;
  const capacity_units = SYRINGE_UNITS_PER_ML[syringe_type];
  const doses_per_vial = engineResult.doses_per_vial;
  const days = doses_per_day > 0 ? Math.round(doses_per_vial / doses_per_day) : null;
  const vial_duration_note = days != null
    ? `~${doses_per_vial.toLocaleString()} doses; about ${days} day${days !== 1 ? "s" : ""} at ${doses_per_day}/day`
    : `~${doses_per_vial.toLocaleString()} doses`;

  return {
    mode,
    unit,
    peptide_name,
    concentration_label: `${engineResult.concentration.toFixed(1)} mcg/mL`,
    target_dose_label: `${target_dose} ${unit}`,
    doses_per_vial,
    recommended_water_ml: mode === "inverse" ? engineResult.recommended_water_ml : undefined,
    alternatives: mode === "inverse" ? engineResult.alternatives : undefined,
    syringe: {
      type: syringe_type,
      capacity_units,
      draw_volume_ml: engineResult.draw_volume_ml,
      draw_units: engineResult.syringe_units ?? engineResult.resulting_units_per_dose,
    },
    suggested_frequency,
    vial_duration_note,
    warnings: engineResult.warnings,
  };
}
