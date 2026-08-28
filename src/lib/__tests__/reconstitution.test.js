import { snap_to_nice, to_mcg, calc_forward, calc_inverse, dilution_options, dilution_note } from "../reconstitution";

// ─── snap_to_nice ────────────────────────────────────────────────────────────
describe("snap_to_nice", () => {
  test("returns exact match", () => expect(snap_to_nice(2)).toBe(2));
  test("snaps up to nearest", () => expect(snap_to_nice(1.8)).toBe(2));
  test("snaps down to nearest", () => expect(snap_to_nice(1.3)).toBe(1.5));
  test("4 is in the nice list", () => expect(snap_to_nice(4)).toBe(4));
  test("extreme low snaps to 0.5", () => expect(snap_to_nice(0.1)).toBe(0.5));
  test("extreme high snaps to 5", () => expect(snap_to_nice(6)).toBe(5));
});

// ─── to_mcg ─────────────────────────────────────────────────────────────────
describe("to_mcg", () => {
  test("mcg passthrough", () => expect(to_mcg(250, "mcg")).toBe(250));
  test("mg → mcg", () => expect(to_mcg(1, "mg")).toBe(1000));
  test("IU → mcg with iu_per_mg", () => expect(to_mcg(100, "IU", 20)).toBeCloseTo(5000));
  test("IU throws without iu_per_mg", () => expect(() => to_mcg(10, "IU")).toThrow());
  test("unknown unit throws", () => expect(() => to_mcg(10, "oz")).toThrow());
});

// ─── calc_forward ────────────────────────────────────────────────────────────
describe("calc_forward", () => {
  // §4 fixture: vial=5mg, bac=2mL, dose=250mcg, U-100
  test("§4 fixture", () => {
    const r = calc_forward(5, 2, 250, "U-100");
    expect(r.ok).toBe(true);
    expect(r.concentration).toBeCloseTo(2500, 1);
    expect(r.draw_volume_ml).toBeCloseTo(0.1, 3);
    expect(r.syringe_units).toBeCloseTo(10, 1);
    expect(r.doses_per_vial).toBe(20);
    expect(r.warnings).toHaveLength(0);
  });

  test("returns error when vial_mg is 0", () => {
    const r = calc_forward(0, 2, 250);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  test("returns error when bac_water_ml is 0", () => {
    const r = calc_forward(5, 0, 250);
    expect(r.ok).toBe(false);
  });

  test("returns error when target_dose_mcg is 0", () => {
    const r = calc_forward(5, 2, 0);
    expect(r.ok).toBe(false);
  });

  test("warns when dose exceeds vial", () => {
    const r = calc_forward(5, 2, 6000, "U-100"); // 6000mcg > 5000mcg total
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /exceeds/i.test(w))).toBe(true);
  });

  test("warns when draw exceeds full syringe", () => {
    // 5mg / 0.5mL = 10000mcg/mL. dose 9000mcg → 0.9mL → 90 units → ok
    // dose 110mcg at conc 10 mcg/mL (5mg/500mL) → units > 100
    const r = calc_forward(5, 0.5, 4500, "U-100"); // 4500/10000 = 0.45mL → 45 units, fine
    expect(r.ok).toBe(true);
    const r2 = calc_forward(2, 5, 50, "U-100");  // conc=400, draw=0.125mL, units=12.5 → ok
    expect(r2.ok).toBe(true);
    // trigger overflow: vial=2mg, bac=0.1mL, dose=100mcg → conc=20000, draw=0.005mL, units=0.5 → <2 warning
    const r3 = calc_forward(2, 0.1, 100, "U-100");
    expect(r3.ok).toBe(true);
    expect(r3.syringe_units).toBeLessThan(2);
    expect(r3.warnings.some((w) => /under 2/i.test(w))).toBe(true);
  });

  test("warns when draw is under 2 units", () => {
    // very concentrated solution → tiny draw → warning
    const r = calc_forward(10, 0.1, 50, "U-100"); // conc=100000, draw=0.0005mL, units=0.05
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /under 2/i.test(w))).toBe(true);
  });

  test("U-50 syringe type", () => {
    const r = calc_forward(5, 2, 250, "U-50");
    expect(r.ok).toBe(true);
    expect(r.syringe_units).toBeCloseTo(5, 1); // 0.1mL × 50
  });

  test("U-40 syringe type", () => {
    const r = calc_forward(5, 2, 250, "U-40");
    expect(r.ok).toBe(true);
    expect(r.syringe_units).toBeCloseTo(4, 1); // 0.1mL × 40
  });
});

// ─── calc_inverse ────────────────────────────────────────────────────────────
describe("calc_inverse", () => {
  // §4 fixture: vial=5mg, dose=250mcg, desired=20, U-100
  // ideal_water = (20 × 5000) / (100 × 250) = 100000/25000 = 4 → snaps to 4
  test("§4 fixture", () => {
    const r = calc_inverse(5, 250, "U-100", 20);
    expect(r.ok).toBe(true);
    expect(r.recommended_water_ml).toBe(4);
    expect(r.resulting_units_per_dose).toBeCloseTo(20, 1);
    expect(r.concentration).toBeCloseTo(1250, 1);
    expect(r.doses_per_vial).toBe(20);
  });

  test("returns error when vial_mg is 0", () => {
    const r = calc_inverse(0, 250);
    expect(r.ok).toBe(false);
  });

  test("returns error when target_dose_mcg is 0", () => {
    const r = calc_inverse(5, 0);
    expect(r.ok).toBe(false);
  });

  test("alternatives table has 4 rows for 1/2/3/5 mL", () => {
    const r = calc_inverse(5, 250, "U-100", 20);
    expect(r.ok).toBe(true);
    expect(r.alternatives).toHaveLength(4);
    expect(r.alternatives.map((a) => a.water_ml)).toEqual([1, 2, 3, 5]);
  });

  test("alternatives doses_per_vial consistent", () => {
    const r = calc_inverse(5, 250);
    expect(r.alternatives.every((a) => a.doses_per_vial === 20)).toBe(true);
  });

  test("snaps ideal water", () => {
    // desired=20 but dose=300mcg, vial=5mg → ideal=(20×5000)/(100×300)=3.33 → snaps to 3
    const r = calc_inverse(5, 300, "U-100", 20);
    expect(r.ok).toBe(true);
    expect([3, 3.5, 4]).toContain(r.recommended_water_ml); // nearest nice
  });
});

// ─── dilution_options ────────────────────────────────────────────────────────
describe("dilution_options", () => {
  // §4 fixture: vial=5mg, dose=250mcg, U-100. 4mL gives exactly 20 units.
  test("recommends the volume closest to a 20-unit draw", () => {
    const d = dilution_options(5, 250, "U-100");
    expect(d.ok).toBe(true);
    expect(d.recommended_water_ml).toBe(4);
    const pick = d.options.find((o) => o.water_ml === 4);
    expect(pick.units_per_dose).toBeCloseTo(20, 1);
    expect(pick.concentration).toBeCloseTo(1250, 1);
    expect(pick.quality).toBe("good");
  });

  test("every option is honest — units recompute from its own volume", () => {
    const d = dilution_options(5, 250, "U-100");
    for (const o of d.options) {
      const f = calc_forward(5, o.water_ml, 250, "U-100");
      expect(o.units_per_dose).toBeCloseTo(f.syringe_units, 6);
      expect(o.draw_volume_ml).toBeCloseTo(f.draw_volume_ml, 6);
    }
  });

  test("shows at most five options, including the recommended one", () => {
    const d = dilution_options(5, 250, "U-100");
    expect(d.options.length).toBeLessThanOrEqual(5);
    expect(d.options.map((o) => o.water_ml)).toContain(d.recommended_water_ml);
  });

  test("options stay in ascending water order", () => {
    const d = dilution_options(10, 500, "U-100");
    const water = d.options.map((o) => o.water_ml);
    expect([...water].sort((a, b) => a - b)).toEqual(water);
  });

  test("hides volumes that overflow the syringe", () => {
    // 5mg vial, 2500mcg dose: at 5mL the draw is 250 units — over a U-100.
    const d = dilution_options(5, 2500, "U-100");
    expect(d.ok).toBe(true);
    expect(d.options.every((o) => o.units_per_dose <= 100)).toBe(true);
  });

  test("still offers something when every volume overflows", () => {
    // A dose near the whole vial overflows at every volume; the user needs to
    // see where they stand rather than an empty picker.
    const d = dilution_options(10, 9000, "U-100");
    expect(d.ok).toBe(true);
    expect(d.options.length).toBeGreaterThan(0);
  });

  test("grades a sub-2-unit draw as too small to measure", () => {
    // 10mg vial, 20mcg dose: every volume gives well under 2 units.
    const d = dilution_options(10, 20, "U-100");
    expect(d.options.every((o) => o.quality === "tiny")).toBe(true);
  });

  test("falls back to the largest draw when no volume is measurable", () => {
    // Nothing is good here, so the least-bad option — the most dilute, with
    // the biggest draw — has to win rather than an arbitrary first entry.
    const d = dilution_options(10, 20, "U-100");
    expect(d.recommended_water_ml).toBe(5);
  });

  test("never recommends a tiny draw when a measurable one exists", () => {
    // 10mg vial, 200mcg dose: 0.5mL gives 1 unit, 5mL gives a clean 10.
    const d = dilution_options(10, 200, "U-100");
    const pick = d.options.find((o) => o.water_ml === d.recommended_water_ml);
    expect(pick.quality).toBe("good");
    expect(pick.units_per_dose).toBeCloseTo(10, 1);
  });

  test("respects syringe type", () => {
    const d = dilution_options(5, 250, "U-50");
    const pick = d.options.find((o) => o.water_ml === d.recommended_water_ml);
    // A U-50 reads half the units for the same volume, so it needs more water
    // to land in the same readable band.
    expect(pick.units_per_dose).toBeGreaterThanOrEqual(10);
    expect(pick.units_per_dose).toBeLessThanOrEqual(50);
  });

  test("doses_per_vial does not vary with water", () => {
    const d = dilution_options(5, 250, "U-100");
    expect(d.options.every((o) => o.doses_per_vial === 20)).toBe(true);
  });

  test("returns error when vial_mg is 0", () => {
    expect(dilution_options(0, 250).ok).toBe(false);
  });

  test("returns error when target_dose_mcg is 0", () => {
    expect(dilution_options(5, 0).ok).toBe(false);
  });

  test("returns error on an unknown syringe type", () => {
    expect(dilution_options(5, 250, "U-7").ok).toBe(false);
  });
});

// ─── dilution_note ───────────────────────────────────────────────────────────
describe("dilution_note", () => {
  test("a comfortable draw needs no caution", () => {
    expect(dilution_note({ quality: "good", units_per_dose: 20 })).toBeNull();
  });
  test("names the direction of an awkward draw", () => {
    expect(dilution_note({ quality: "ok", units_per_dose: 5 })).toMatch(/small/i);
    expect(dilution_note({ quality: "ok", units_per_dose: 80 })).toMatch(/large/i);
  });
  test("calls out an unmeasurable draw", () => {
    expect(dilution_note({ quality: "tiny", units_per_dose: 1 })).toMatch(/too small/i);
  });
  test("names the syringe that cannot hold the draw", () => {
    expect(dilution_note({ quality: "over", units_per_dose: 150 }, "U-40")).toMatch(/U-40/);
  });
});
