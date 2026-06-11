import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { colors } from "../../src/lib/theme";
import { encyclopediaApi } from "../../src/api/index";

// ─── Original hardcoded list kept but not displayed ────────────────────────
const PEPTIDES = [
  {
    name: "BPC-157",
    category: "Healing",
    status: "Research",
    desc: "Body Protection Compound. Accelerates healing of tendons, muscles, and gut lining.",
    dose: "250–500 mcg/day",
    half_life: "4–6 hours",
  },
  {
    name: "TB-500",
    category: "Healing",
    status: "Research",
    desc: "Thymosin Beta-4 fragment. Promotes healing, reduces inflammation, and improves flexibility.",
    dose: "2.0–2.5 mg twice weekly",
    half_life: "Long-acting",
  },
  {
    name: "GHK-Cu",
    category: "Anti-aging",
    status: "Research",
    desc: "Copper peptide with wound healing and collagen synthesis properties.",
    dose: "1–2 mg/day",
    half_life: "Short",
  },
  {
    name: "Ipamorelin",
    category: "GH Secretagogue",
    status: "Research",
    desc: "Selective GHRP with minimal side effects. Clean GH pulse stimulation.",
    dose: "200–300 mcg 2–3x/day",
    half_life: "2 hours",
  },
  {
    name: "CJC-1295 (no DAC)",
    category: "GH Secretagogue",
    status: "Research",
    desc: "GHRH analogue. Short-acting, best combined with Ipamorelin.",
    dose: "100–200 mcg 2–3x/day",
    half_life: "30 min",
  },
  {
    name: "Semaglutide",
    category: "GLP-1",
    status: "FDA Approved",
    desc: "GLP-1 receptor agonist approved for T2D and obesity (Ozempic/Wegovy).",
    dose: "0.25–2.4 mg/week",
    half_life: "7 days",
  },
  {
    name: "Tirzepatide",
    category: "GIP/GLP-1",
    status: "FDA Approved",
    desc: "Dual GIP/GLP-1 agonist (Mounjaro/Zepbound). Superior weight loss vs semaglutide.",
    dose: "2.5–15 mg/week",
    half_life: "5 days",
  },
  {
    name: "Semax",
    category: "Nootropic",
    status: "Research",
    desc: "ACTH analogue with neuroprotective and cognitive-enhancing properties.",
    dose: "300–600 mcg/day",
    half_life: "Short",
  },
  {
    name: "Selank",
    category: "Nootropic",
    status: "Research",
    desc: "Anxiolytic peptide derived from tuftsin. Reduces anxiety without sedation.",
    dose: "250–500 mcg/day",
    half_life: "Short",
  },
  {
    name: "Thymosin Alpha-1",
    category: "Immune",
    status: "Research",
    desc: "Immune modulator. Used in chronic infections and immune dysregulation.",
    dose: "1.6 mg 1–2x/week",
    half_life: "2 hours",
  },
  {
    name: "Epitalon",
    category: "Anti-aging",
    status: "Research",
    desc: "Tetrapeptide that activates telomerase, potential anti-aging effects.",
    dose: "5–10 mg/day",
    half_life: "Unknown",
  },
  {
    name: "MOTS-C",
    category: "Mitochondrial",
    status: "Research",
    desc: "Mitochondria-derived peptide. Improves insulin sensitivity and metabolic function.",
    dose: "5–10 mg/week",
    half_life: "Unknown",
  },
  {
    name: "KPV",
    category: "Anti-inflammatory",
    status: "Research",
    desc: "MSH fragment with anti-inflammatory effects. Used for IBD and skin conditions.",
    dose: "0.5–1 mg/day",
    half_life: "Short",
  },
  {
    name: "PT-141",
    category: "Sexual Health",
    status: "FDA Approved",
    desc: "Melanocortin receptor agonist approved for hypoactive sexual desire (Vyleesi).",
    dose: "1.75 mg as needed",
    half_life: "~8 hours",
  },
  {
    name: "AOD-9604",
    category: "Metabolic",
    status: "Research",
    desc: "GH fragment 177-191. Targets fat metabolism without IGF-1 effects.",
    dose: "300 mcg/day",
    half_life: "Short",
  },
  {
    name: "SS-31",
    category: "Mitochondrial",
    status: "Research",
    desc: "Mitochondria-targeted antioxidant peptide with cardioprotective properties.",
    dose: "2–4 mg/day",
    half_life: "Short",
  },
];
void PEPTIDES; // suppress unused warning

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(str) {
  if (!str) return "—";
  return str.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const EVIDENCE_COLOR = {
  established: colors.teal,
  "early-human": colors.blue,
  preclinical: colors.yellow,
  anecdotal: "#a78bfa",
  unknown: colors.tx3,
};

const FDA_COLOR = {
  approved: colors.teal,
  investigational: colors.yellow,
  "not-approved": colors.red,
  withdrawn: colors.red,
  unknown: colors.tx3,
};

const CATEGORY_COLOR = {
  healing: "#34d399",
  "growth-hormone": "#60a5fa",
  metabolic: "#f59e0b",
  cognitive: "#a78bfa",
  cosmetic: "#f472b6",
  longevity: "#2dd4bf",
  immune: "#fb923c",
  "sexual-health": "#e879f9",
  other: colors.tx3,
};

function Badge({ label, color }) {
  return (
    <View
      style={[
        s.badge,
        { backgroundColor: color + "22", borderColor: color + "55" },
      ]}
    >
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Collapsible section ───────────────────────────────────────────────────

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!children) return null;
  return (
    <View style={s.section}>
      <TouchableOpacity
        style={s.sectionHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={s.sectionTitle}>{title}</Text>
        <Text style={s.chevron}>{open ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {open && <View style={s.sectionBody}>{children}</View>}
    </View>
  );
}

function Row({ label, value }) {
  if (!value && value !== false && value !== 0) return null;
  const display =
    value === true ? "Yes" : value === false ? "No" : String(value);
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{display}</Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

function ClaimList({ items }) {
  if (!items?.length) return <Text style={s.empty}>None documented.</Text>;
  return items.map((item, i) => (
    <View key={i} style={s.claimItem}>
      <Text style={s.claimLabel}>{item.label}</Text>
      {item.detail ? <Text style={s.claimDetail}>{item.detail}</Text> : null}
      {item.evidenceLevel ? (
        <Text
          style={[
            s.claimMeta,
            { color: EVIDENCE_COLOR[item.evidenceLevel] || colors.tx3 },
          ]}
        >
          {fmt(item.evidenceLevel)}
        </Text>
      ) : null}
      {item.severity ? (
        <Text style={s.claimMeta}>Severity: {fmt(item.severity)}</Text>
      ) : null}
      {item.frequency ? (
        <Text style={s.claimMeta}>Frequency: {fmt(item.frequency)}</Text>
      ) : null}
    </View>
  ));
}

// ─── Detail view ───────────────────────────────────────────────────────────

function DetailView({ peptideId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    encyclopediaApi
      .get(peptideId)
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load peptide data."))
      .finally(() => setLoading(false));
  }, [peptideId]);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>{error || "Not found."}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={onBack}>
          <Text style={s.retryText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = data;
  const hl = p.half_life;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* Back */}
      <TouchableOpacity style={s.backBtn} onPress={onBack}>
        <Text style={s.backText}>← Encyclopedia</Text>
      </TouchableOpacity>

      {/* Header card */}
      <View style={s.headerCard}>
        <Text style={s.detailName}>{p.name}</Text>
        {p.aliases?.length > 0 && (
          <Text style={s.aliases}>{p.aliases.join(" · ")}</Text>
        )}
        <View style={s.badgeRow}>
          <Badge
            label={fmt(p.category)}
            color={CATEGORY_COLOR[p.category] || colors.tx3}
          />
          <Badge
            label={fmt(p.evidence_level)}
            color={EVIDENCE_COLOR[p.evidence_level] || colors.tx3}
          />
          <Badge
            label={fmt(p.fda_status)}
            color={FDA_COLOR[p.fda_status] || colors.tx3}
          />
          {p.research_only && (
            <Badge label="Research Only" color={colors.yellow} />
          )}
        </View>
        {p.tags?.length > 0 && (
          <View style={s.tagRow}>
            {p.tags.map((t) => (
              <View key={t} style={s.tag}>
                <Text style={s.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Overview */}
      <Section title="Overview" defaultOpen>
        <Text style={s.body}>{p.summary}</Text>
        {p.description ? (
          <>
            <Divider />
            <Text style={s.body}>{p.description}</Text>
          </>
        ) : null}
        {p.mechanism_of_action ? (
          <>
            <Divider />
            <Text style={s.subheading}>Mechanism of Action</Text>
            <Text style={s.body}>{p.mechanism_of_action}</Text>
          </>
        ) : null}
      </Section>

      {/* Chemistry */}
      {(p.molecular_weight ||
        p.molecular_formula ||
        p.cas_number ||
        p.sequence) && (
        <Section title="Chemistry">
          <Row
            label="Molecular Weight"
            value={p.molecular_weight ? `${p.molecular_weight} Da` : null}
          />
          <Row label="Molecular Formula" value={p.molecular_formula} />
          <Row label="CAS Number" value={p.cas_number} />
          <Row label="PubChem CID" value={p.pubchem_cid} />
          {p.sequence ? (
            <>
              <Text style={s.rowLabel}>Sequence</Text>
              <Text style={s.sequenceText}>{p.sequence}</Text>
              <Row label="Sequence Type" value={fmt(p.sequence_type)} />
            </>
          ) : null}
        </Section>
      )}

      {/* Pharmacology */}
      <Section title="Pharmacology">
        {hl && (
          <>
            <Text style={s.subheading}>Half-Life</Text>
            <Row
              label="Value"
              value={
                hl.value != null
                  ? `${hl.value} ${hl.unit || ""}`.trim()
                  : hl.unit
                    ? `Unknown (${hl.unit})`
                    : null
              }
            />
            <Row label="Estimated" value={hl.isEstimated} />
            {hl.note ? (
              <Text style={[s.body, { marginTop: 6 }]}>{hl.note}</Text>
            ) : null}
            <Divider />
          </>
        )}
        {p.routes?.length > 0 && (
          <Row label="Routes" value={p.routes.map(fmt).join(", ")} />
        )}
        <Row
          label="Default Dose Unit"
          value={p.default_dose_unit?.toUpperCase()}
        />
      </Section>

      {/* Evidence */}
      <Section title="Evidence">
        <Row label="Evidence Level" value={fmt(p.evidence_level)} />
        <Row label="Human Trials" value={p.human_trials} />
        <Row label="Clinical Trials" value={p.clinical_trials_count || null} />
        {p.evidence_note ? (
          <>
            <Divider />
            <Text style={s.body}>{p.evidence_note}</Text>
          </>
        ) : null}
      </Section>

      {/* Regulatory */}
      <Section title="Regulatory">
        <Row label="FDA Status" value={fmt(p.fda_status)} />
        {p.fda_status_note ? (
          <Text style={[s.body, { marginBottom: 10 }]}>
            {p.fda_status_note}
          </Text>
        ) : null}
        {p.compounding_status ? (
          <>
            <Divider />
            <Row label="Compounding Status" value={fmt(p.compounding_status)} />
            {p.compounding_note ? (
              <Text style={[s.body, { marginBottom: 10 }]}>
                {p.compounding_note}
              </Text>
            ) : null}
          </>
        ) : null}
        {p.wada_status ? (
          <>
            <Divider />
            <Row label="WADA Status" value={fmt(p.wada_status)} />
          </>
        ) : null}
        <Divider />
        <Row label="Scheduled/Controlled" value={p.scheduled_controlled} />
        <Row label="Research Only" value={p.research_only} />
      </Section>

      {/* Benefits */}
      {p.benefits?.length > 0 && (
        <Section title={`Benefits (${p.benefits.length})`}>
          <ClaimList items={p.benefits} />
        </Section>
      )}

      {/* Risks */}
      {p.risks?.length > 0 && (
        <Section title={`Risks (${p.risks.length})`}>
          <ClaimList items={p.risks} />
        </Section>
      )}

      {/* Side Effects */}
      {p.side_effects?.length > 0 && (
        <Section title={`Side Effects (${p.side_effects.length})`}>
          <ClaimList items={p.side_effects} />
        </Section>
      )}

      {/* Contraindications */}
      {p.contraindications?.length > 0 && (
        <Section title={`Contraindications (${p.contraindications.length})`}>
          <ClaimList items={p.contraindications} />
        </Section>
      )}

      {/* Interactions */}
      {p.interactions?.length > 0 && (
        <Section title={`Interactions (${p.interactions.length})`}>
          <ClaimList items={p.interactions} />
        </Section>
      )}

      {/* Dose Ranges */}
      {p.dose_ranges?.length > 0 && (
        <Section title={`Studied Dose Ranges (${p.dose_ranges.length})`}>
          {p.dose_ranges.map((dr, i) => (
            <View
              key={dr.id}
              style={[
                s.claimItem,
                i > 0 && {
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  marginTop: 10,
                  paddingTop: 10,
                },
              ]}
            >
              <Text style={s.claimLabel}>{dr.context}</Text>
              {(dr.low != null || dr.high != null) && (
                <Row
                  label="Dose"
                  value={
                    dr.low != null && dr.high != null && dr.low !== dr.high
                      ? `${dr.low}–${dr.high} ${dr.unit}`
                      : `${dr.low ?? dr.high} ${dr.unit}`
                  }
                />
              )}
              <Row label="Route" value={fmt(dr.route)} />
              <Row label="Frequency" value={dr.frequency} />
              {dr.note ? <Text style={s.claimDetail}>{dr.note}</Text> : null}
            </View>
          ))}
        </Section>
      )}

      {/* Protocols */}
      {p.protocols?.length > 0 && (
        <Section title={`Protocols (${p.protocols.length})`}>
          {p.protocols.map((proto, i) => (
            <View
              key={proto.id}
              style={[
                s.claimItem,
                i > 0 && {
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  marginTop: 10,
                  paddingTop: 10,
                },
              ]}
            >
              <Text style={s.claimLabel}>{proto.name}</Text>
              {proto.phase ? (
                <Text style={s.claimMeta}>Phase: {fmt(proto.phase)}</Text>
              ) : null}
              {proto.description ? (
                <Text style={s.claimDetail}>{proto.description}</Text>
              ) : null}
              {proto.duration_weeks && (
                <Row
                  label="Duration"
                  value={
                    proto.duration_weeks.min === proto.duration_weeks.max
                      ? `${proto.duration_weeks.min} weeks`
                      : `${proto.duration_weeks.min}–${proto.duration_weeks.max} weeks`
                  }
                />
              )}
              {proto.dosing && (
                <Row
                  label="Dosing"
                  value={[
                    proto.dosing.frequency,
                    proto.dosing.route ? fmt(proto.dosing.route) : null,
                    proto.dosing.unit ? `(${proto.dosing.unit})` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              )}
              {proto.cycling_notes ? (
                <Text style={s.claimDetail}>{proto.cycling_notes}</Text>
              ) : null}
              {proto.disclaimer ? (
                <Text style={[s.claimDetail, s.disclaimer]}>
                  {proto.disclaimer}
                </Text>
              ) : null}
            </View>
          ))}
        </Section>
      )}

      {/* Reconstitution & Storage */}
      {(p.reconstitution || p.storage) && (
        <Section title="Reconstitution & Storage">
          {p.reconstitution?.note ? (
            <>
              <Text style={s.subheading}>Reconstitution</Text>
              <Text style={s.body}>{p.reconstitution.note}</Text>
              <Row
                label="Light Sensitive"
                value={p.reconstitution.lightSensitive}
              />
              <Divider />
            </>
          ) : null}
          {p.storage && (
            <>
              <Text style={s.subheading}>Storage</Text>
              {p.storage.lyophilized && (
                <View style={s.claimItem}>
                  <Text style={s.claimLabel}>Lyophilized</Text>
                  <Text style={s.claimDetail}>
                    {p.storage.lyophilized.stability}
                  </Text>
                </View>
              )}
              {p.storage.reconstituted && (
                <View style={s.claimItem}>
                  <Text style={s.claimLabel}>Reconstituted</Text>
                  <Row
                    label="Temp"
                    value={
                      p.storage.reconstituted.tempC
                        ? `${p.storage.reconstituted.tempC}°C`
                        : null
                    }
                  />
                  <Text style={s.claimDetail}>
                    {p.storage.reconstituted.stability}
                  </Text>
                </View>
              )}
              <Row label="Light Sensitive" value={p.storage.lightSensitive} />
            </>
          )}
        </Section>
      )}

      {/* References */}
      {p.references?.length > 0 && (
        <Section title={`References (${p.references.length})`}>
          {p.references.map((ref) => (
            <View key={ref.ref_id} style={s.refItem}>
              <Text style={s.refNum}>[{ref.ref_id}]</Text>
              <View style={s.refBody}>
                <Text style={s.refTitle}>{ref.title}</Text>
                <Text style={s.refMeta}>
                  {[ref.first_author, ref.year, ref.source]
                    .filter(Boolean)
                    .join(" · ")}
                  {ref.pmid ? `  PMID: ${ref.pmid}` : ""}
                </Text>
                <Badge label={fmt(ref.type)} color={colors.tx3} />
              </View>
            </View>
          ))}
        </Section>
      )}

      {/* Disclaimer */}
      {p.disclaimer && (
        <Text style={[s.body, s.disclaimerBlock]}>{p.disclaimer}</Text>
      )}
    </ScrollView>
  );
}

// ─── List view ─────────────────────────────────────────────────────────────

function ListView({ onSelect }) {
  const [peptides, setPeptides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await encyclopediaApi.list();
      setPeptides(res.data);
    } catch {
      setError("Could not load peptides. Check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.toLowerCase();
  const filtered = peptides.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.aliases?.some((a) => a.toLowerCase().includes(q)) ||
      p.tags?.some((t) => t.toLowerCase().includes(q)),
  );

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={s.loadingText}>Loading peptides…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>{error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, category, tags…"
          placeholderTextColor={colors.tx3}
        />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.teal}
          />
        }
      >
        {filtered.length === 0 && (
          <Text style={s.empty}>No peptides match your search.</Text>
        )}
        {filtered.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={s.card}
            onPress={() => onSelect(p.id)}
            activeOpacity={0.75}
          >
            <View style={s.cardTop}>
              <Text style={s.cardName}>{p.name}</Text>
              <Badge
                label={fmt(p.fda_status)}
                color={FDA_COLOR[p.fda_status] || colors.tx3}
              />
            </View>
            <View style={s.cardBadgeRow}>
              <Badge
                label={fmt(p.category)}
                color={CATEGORY_COLOR[p.category] || colors.tx3}
              />
              <Badge
                label={fmt(p.evidence_level)}
                color={EVIDENCE_COLOR[p.evidence_level] || colors.tx3}
              />
              {p.data_completeness !== "complete" && (
                <Badge label={fmt(p.data_completeness)} color={colors.tx3} />
              )}
            </View>
            <Text style={s.cardDesc} numberOfLines={2}>
              {p.summary}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────

export default function EncyclopediaTab() {
  const [selectedId, setSelectedId] = useState(null);

  if (selectedId) {
    return (
      <DetailView peptideId={selectedId} onBack={() => setSelectedId(null)} />
    );
  }
  return <ListView onSelect={setSelectedId} />;
}

// ─── Styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  centered: {
    flex: 1,
    backgroundColor: colors.navy,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: { color: colors.tx2, marginTop: 12, fontSize: 14 },
  errorText: {
    color: colors.red,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { color: colors.teal, fontWeight: "600" },

  // search
  searchWrap: { padding: 16, paddingBottom: 8 },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    color: colors.tx,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // list cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardName: {
    color: colors.tx,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  cardBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  cardDesc: { color: colors.tx2, fontSize: 13, lineHeight: 19 },

  // badge
  badge: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    marginRight: 4,
    marginBottom: 2,
  },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },

  // detail header
  backBtn: { marginBottom: 14 },
  backText: { color: colors.teal, fontSize: 14, fontWeight: "600" },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailName: {
    color: colors.tx,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  aliases: { color: colors.tx3, fontSize: 12, marginBottom: 10 },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tag: {
    backgroundColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { color: colors.tx2, fontSize: 11 },

  // sections
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  sectionTitle: {
    color: colors.tx,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    flex: 1,
  },
  chevron: { color: colors.tx3, fontSize: 10 },
  sectionBody: { paddingHorizontal: 14, paddingBottom: 14 },

  // rows
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  rowLabel: { color: colors.tx2, fontSize: 13, flex: 1 },
  rowValue: {
    color: colors.tx,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  subheading: {
    color: colors.tx2,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  body: { color: colors.tx2, fontSize: 14, lineHeight: 21 },
  sequenceText: {
    color: colors.teal,
    fontFamily: "Courier",
    fontSize: 13,
    letterSpacing: 1,
    marginVertical: 6,
  },
  empty: {
    color: colors.tx3,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },

  // claim items
  claimItem: { marginBottom: 8 },
  claimLabel: {
    color: colors.tx,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  claimDetail: {
    color: colors.tx2,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  claimMeta: { color: colors.tx3, fontSize: 12, marginTop: 2 },
  disclaimer: { fontStyle: "italic", color: colors.tx3 },

  // references
  refItem: { flexDirection: "row", marginBottom: 12 },
  refNum: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "700",
    width: 28,
    paddingTop: 1,
  },
  refBody: { flex: 1 },
  refTitle: {
    color: colors.tx,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 3,
    lineHeight: 18,
  },
  refMeta: { color: colors.tx3, fontSize: 11, marginBottom: 4, lineHeight: 16 },

  // disclaimer block
  disclaimerBlock: {
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontStyle: "italic",
    color: colors.tx3,
    fontSize: 12,
    lineHeight: 18,
  },
});
