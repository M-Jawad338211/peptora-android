import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors } from "../../src/lib/theme";
import { COPY, FEATURES } from "../../src/lib/config";
import { rangeText } from "../../src/lib/format";
import { encyclopediaApi, stacksApi } from "../../src/api/index";

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(str) {
  if (!str) return "";
  return str.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "26 weeks", "8 to 12 weeks", or "26 weeks or more" when there is no upper end. */
function weeksText(range) {
  if (!range || range.min == null) return "";
  if (range.max == null) return `${range.min} weeks or more`;
  if (range.min === range.max) return `${range.min} weeks`;
  return `${range.min} to ${range.max} weeks`;
}

// ─── Sources ───────────────────────────────────────────────────────────────
//
// Every entry lists the papers, labels and databases it was written from.
// Each one opens the source itself: the link stored with the reference, or
// failing that its PubMed record or DOI.

function sourceUrl(ref) {
  if (!ref) return null;
  if (ref.url) return ref.url;
  if (ref.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`;
  if (ref.doi) return `https://doi.org/${ref.doi}`;
  return null;
}

function openSource(ref) {
  const url = sourceUrl(ref);
  if (url) Linking.openURL(url).catch(() => {});
}

/** The numbered markers after a statement: tap one to open that source. */
function Cites({ ids, references }) {
  const found = (ids ?? [])
    .map((id) => (references ?? []).find((r) => r.ref_id === id))
    .filter(Boolean);
  if (found.length === 0) return null;
  return (
    <View style={s.citeRow}>
      <Text style={s.citeLabel}>{found.length === 1 ? "Source" : "Sources"}</Text>
      {found.map((ref) => {
        const linked = !!sourceUrl(ref);
        return (
          <TouchableOpacity
            key={ref.ref_id}
            style={[s.cite, !linked && s.citeDim]}
            onPress={() => openSource(ref)}
            disabled={!linked}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="link"
            accessibilityLabel={`Source ${ref.ref_id}: ${ref.title}`}
          >
            <Text style={s.citeText}>{ref.ref_id}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SourceList({ references }) {
  return references.map((ref) => {
    const url = sourceUrl(ref);
    const where = ref.pmid ? `PubMed ${ref.pmid}` : ref.doi ? `DOI ${ref.doi}` : url ? "Open source" : null;
    return (
      <TouchableOpacity
        key={ref.ref_id}
        style={s.refItem}
        onPress={() => openSource(ref)}
        disabled={!url}
        activeOpacity={0.7}
        accessibilityRole={url ? "link" : "text"}
        accessibilityLabel={`Source ${ref.ref_id}: ${ref.title}`}
      >
        <Text style={s.refNum}>{ref.ref_id}</Text>
        <View style={s.refBody}>
          <Text style={s.refTitle}>{ref.title}</Text>
          <Text style={s.refMeta}>
            {[ref.first_author, ref.year, ref.source].filter(Boolean).join(", ")}
          </Text>
          <View style={s.refFoot}>
            <Badge label={fmt(ref.type)} color={colors.tx3} />
            {where ? (
              <View style={s.refLinkRow}>
                <Text style={s.refLink}>{where}</Text>
                <Ionicons name="open-outline" size={12} color={colors.teal} />
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  });
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

const STACK_TYPE_COLOR = {
  commercial_blend: "#f472b6",
  research_pairing: "#60a5fa",
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
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.tx3}
        />
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

function DetailView({ peptideId, onBack, onAddProtocol }) {
  // Cached per peptide id — revisiting a peptide you already opened shows
  // it instantly instead of a spinner, while it quietly refetches in the
  // background if the cached copy has gone stale.
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["peptide", peptideId],
    queryFn: () => encyclopediaApi.get(peptideId).then((res) => res.data),
    enabled: !!peptideId,
  });

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
        <Text style={s.errorText}>
          {error ? "Failed to load peptide data." : "Not found."}
        </Text>
        <TouchableOpacity style={s.retryBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={14} color={colors.teal} />
          <Text style={s.retryText}>Back</Text>
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
        <Ionicons name="arrow-back" size={14} color={colors.teal} />
        <Text style={s.backText}>Library</Text>
      </TouchableOpacity>

      {/* Header card */}
      <View style={s.headerCard}>
        <Text style={s.detailName}>{p.name}</Text>
        {p.aliases?.length > 0 && (
          <Text style={s.aliases}>{p.aliases.join(", ")}</Text>
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
        {p.references?.length > 0 && (
          <Text style={s.sourceCount}>
            Written from {p.references.length} cited source{p.references.length === 1 ? "" : "s"}, listed
            under Sources below. Reference reading, not medical advice.
          </Text>
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
            <Text style={s.subheading}>Mechanism of action</Text>
            <Text style={s.body}>{p.mechanism_of_action}</Text>
            <Cites ids={p.mechanism_citation_refs} references={p.references} />
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
        {FEATURES.doseFigures && p.routes?.length > 0 && (
          <Row label="Routes" value={p.routes.map(fmt).join(", ")} />
        )}
        {FEATURES.doseFigures && (
          <Row label="Usual unit" value={p.default_dose_unit} />
        )}
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
        <Cites ids={p.regulatory_citation_refs} references={p.references} />
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
      {FEATURES.doseFigures && p.dose_ranges?.length > 0 && (
        <Section title={`Dose ranges reported in the literature (${p.dose_ranges.length})`}>
          <Text style={s.sectionNote}>{COPY.rangesNotCopied}</Text>
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
              <Row label="Reported" value={rangeText(dr.low, dr.high, dr.unit)} />
              <Row label="Route" value={fmt(dr.route)} />
              <Row label="Frequency" value={dr.frequency} />
              {dr.note ? <Text style={s.claimDetail}>{dr.note}</Text> : null}
              <Cites ids={dr.citation_refs} references={p.references} />
            </View>
          ))}
        </Section>
      )}

      {/* Protocols */}
      {FEATURES.doseFigures && p.protocols?.length > 0 && (
        <Section title={`Protocols described in the literature (${p.protocols.length})`}>
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
              <Row label="Duration" value={weeksText(proto.duration_weeks)} />
              {proto.dosing && (
                <Row
                  label="As reported"
                  value={[
                    rangeText(proto.dosing.amountLow, proto.dosing.amountHigh, proto.dosing.unit),
                    proto.dosing.frequency,
                    proto.dosing.route ? fmt(proto.dosing.route) : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
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
              <Cites ids={proto.citation_refs} references={p.references} />
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

      {/* Sources */}
      {p.references?.length > 0 && (
        <Section title={`Sources (${p.references.length})`} defaultOpen>
          <Text style={s.sectionNote}>Tap a source to open it.</Text>
          <SourceList references={p.references} />
        </Section>
      )}

      {/* Disclaimer */}
      {p.disclaimer && (
        <Text style={[s.body, s.disclaimerBlock]}>{p.disclaimer}</Text>
      )}

      {/* Add as Protocol CTA */}
      <TouchableOpacity
        style={s.addProtocolBtn}
        onPress={() => onAddProtocol?.(p.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="flask-outline" size={16} color="#021a0e" />
        <Text style={s.addProtocolBtnText}>Track this in a protocol</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Stack detail view ─────────────────────────────────────────────────────

function StackDetailView({ stackId, onBack, onAddProtocol }) {
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["stack", stackId],
    queryFn: () => stacksApi.get(stackId).then((res) => res.data),
    enabled: !!stackId,
  });

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
        <Text style={s.errorText}>
          {error ? "Failed to load stack data." : "Not found."}
        </Text>
        <TouchableOpacity style={s.retryBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={14} color={colors.teal} />
          <Text style={s.retryText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const st = data;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* Back */}
      <TouchableOpacity style={s.backBtn} onPress={onBack}>
        <Ionicons name="arrow-back" size={14} color={colors.teal} />
        <Text style={s.backText}>Library</Text>
      </TouchableOpacity>

      {/* Header card */}
      <View style={s.headerCard}>
        <Text style={s.detailName}>{st.name}</Text>
        {st.aliases?.length > 0 && (
          <Text style={s.aliases}>{st.aliases.join(", ")}</Text>
        )}
        <View style={s.badgeRow}>
          <Badge
            label={fmt(st.stack_type)}
            color={STACK_TYPE_COLOR[st.stack_type] || colors.tx3}
          />
          {st.category && (
            <Badge
              label={fmt(st.category)}
              color={CATEGORY_COLOR[st.category] || colors.tx3}
            />
          )}
          <Badge
            label={fmt(st.evidence_level)}
            color={EVIDENCE_COLOR[st.evidence_level] || colors.tx3}
          />
        </View>
      </View>

      {/* Overview */}
      <Section title="Overview" defaultOpen>
        {st.positioning ? <Text style={s.body}>{st.positioning}</Text> : null}
        {st.rationale ? (
          <>
            <Divider />
            <Text style={s.subheading}>Rationale</Text>
            <Text style={s.body}>{st.rationale}</Text>
          </>
        ) : null}
      </Section>

      {/* Composition — commercial_blend only, deliberately never framed as a
          "recommended" ratio, just what vendors commonly list */}
      {st.stack_type === "commercial_blend" && (
        <Section title="Commonly Documented Composition" defaultOpen>
          <Text style={s.body}>
            {st.components?.map((c) => c.peptide_name).join(" : ")}
          </Text>
          <Text style={[s.body, { color: colors.tx, fontWeight: "600" }]}>
            {st.components?.map((c) => c.ratio_parts).join(" : ")}
          </Text>
          {st.ratio_source_note ? (
            <Text style={[s.body, { marginTop: 8 }]}>{st.ratio_source_note}</Text>
          ) : null}
          <Divider />
          <Row label="Source" value={fmt(st.ratio_source_type)} />
          {st.common_total_mg_options?.length > 0 && (
            <Row
              label="Commonly Sold As"
              value={st.common_total_mg_options.map((m) => `${m}mg`).join(", ")}
            />
          )}
          {st.ratio_source_urls?.length > 0 && (
            <>
              <Divider />
              <Text style={s.subheading}>Sources</Text>
              {st.ratio_source_urls.map((u, i) => (
                <TouchableOpacity key={i} onPress={() => Linking.openURL(u).catch(() => {})} accessibilityRole="link">
                  <Text style={s.sourceUrl} numberOfLines={1}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </Section>
      )}

      {/* Components — each with its own reference dose ranges, pulled live
          from that peptide's own encyclopedia entry */}
      <Section title={`Components (${st.components?.length || 0})`} defaultOpen>
        {st.components?.map((c, i) => (
          <View
            key={c.peptide_id}
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
            <View style={s.componentTop}>
              <Text style={s.claimLabel}>{c.peptide_name}</Text>
              {c.ratio_parts != null && (
                <Badge label={`${c.ratio_parts} part${c.ratio_parts === 1 ? "" : "s"}`} color={colors.teal} />
              )}
            </View>
            {c.role ? <Text style={s.claimDetail}>{c.role}</Text> : null}
            {FEATURES.doseFigures && c.dose_note ? (
              <Text style={[s.claimDetail, { fontStyle: "italic" }]}>{c.dose_note}</Text>
            ) : null}
            {FEATURES.doseFigures && c.reference_dose_ranges?.map((dr, j) => (
              <View key={j} style={s.componentDoseRange}>
                <Text style={s.claimMeta}>{dr.context}</Text>
                <Row label="Reported" value={rangeText(dr.low, dr.high, dr.unit)} />
                <Row label="Frequency" value={dr.frequency} />
              </View>
            ))}
          </View>
        ))}
      </Section>

      {/* Cautions */}
      {st.caution_notes?.length > 0 && (
        <Section title="Cautions">
          {st.caution_notes.map((c, i) => (
            <Text key={i} style={[s.body, { marginBottom: 8 }]}>
              {c}
            </Text>
          ))}
        </Section>
      )}

      {/* Stack-level sources */}
      {st.stack_references?.length > 0 && (
        <Section title={`Sources (${st.stack_references.length})`} defaultOpen>
          <Text style={s.sectionNote}>Tap a source to open it.</Text>
          <SourceList references={st.stack_references} />
        </Section>
      )}

      {/* Disclaimer */}
      {st.disclaimer && (
        <Text style={[s.body, s.disclaimerBlock]}>{st.disclaimer}</Text>
      )}

      {/* Add as Protocol CTA */}
      <TouchableOpacity
        style={s.addProtocolBtn}
        onPress={() => onAddProtocol?.(st.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="flask-outline" size={16} color="#021a0e" />
        <Text style={s.addProtocolBtnText}>Track this in a protocol</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── List view ─────────────────────────────────────────────────────────────

function ListView({ onSelect }) {
  const [search, setSearch] = useState("");

  // Cached under ["peptides"] — once loaded, switching away from this tab
  // and back shows the list instantly from cache instead of a spinner,
  // with a silent background refetch keeping it fresh.
  const {
    data: peptides = [],
    isLoading: loading,
    isRefetching: refreshing,
    error,
    refetch,
  } = useQuery({
    queryKey: ["peptides"],
    queryFn: () => encyclopediaApi.list().then((res) => res.data),
  });

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
        <Text style={s.loadingText}>Loading the library</Text>
      </View>
    );
  }

  // Only show the full error screen when we have nothing cached to fall
  // back on — a failed background refresh with stale data still on screen
  // shouldn't yank the list away.
  if (error && peptides.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>Could not load peptides. Check your connection.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
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
          placeholder="Search by name, category or tag"
          placeholderTextColor={colors.tx3}
        />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refetch()}
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

// ─── Stack list view ───────────────────────────────────────────────────────

function StackListView({ onSelect }) {
  const [search, setSearch] = useState("");

  const {
    data: stacks = [],
    isLoading: loading,
    isRefetching: refreshing,
    error,
    refetch,
  } = useQuery({
    queryKey: ["stacks"],
    queryFn: () => stacksApi.list().then((res) => res.data),
  });

  const q = search.toLowerCase();
  const filtered = stacks.filter(
    (st) =>
      !q ||
      st.name.toLowerCase().includes(q) ||
      (st.category || "").toLowerCase().includes(q) ||
      st.aliases?.some((a) => a.toLowerCase().includes(q)),
  );

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={s.loadingText}>Loading stacks</Text>
      </View>
    );
  }

  if (error && stacks.length === 0) {
    return (
      <View style={s.centered}>
        <Text style={s.errorText}>Could not load stacks. Check your connection.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
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
          placeholder="Search by name or category"
          placeholderTextColor={colors.tx3}
        />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refetch()}
            tintColor={colors.teal}
          />
        }
      >
        {filtered.length === 0 && (
          <Text style={s.empty}>No stacks match your search.</Text>
        )}
        {filtered.map((st) => (
          <TouchableOpacity
            key={st.id}
            style={s.card}
            onPress={() => onSelect(st.id)}
            activeOpacity={0.75}
          >
            <View style={s.cardTop}>
              <Text style={s.cardName}>{st.name}</Text>
              <Badge
                label={fmt(st.stack_type)}
                color={STACK_TYPE_COLOR[st.stack_type] || colors.tx3}
              />
            </View>
            <View style={s.cardBadgeRow}>
              {st.category && (
                <Badge
                  label={fmt(st.category)}
                  color={CATEGORY_COLOR[st.category] || colors.tx3}
                />
              )}
              <Badge
                label={fmt(st.evidence_level)}
                color={EVIDENCE_COLOR[st.evidence_level] || colors.tx3}
              />
              {st.data_completeness !== "complete" && (
                <Badge label={fmt(st.data_completeness)} color={colors.tx3} />
              )}
            </View>
            <Text style={s.cardDesc} numberOfLines={2}>
              {st.positioning}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────

export default function EncyclopediaTab() {
  const [viewType, setViewType] = useState("peptides"); // "peptides" | "stacks"
  const [selectedId, setSelectedId] = useState(null);
  const router = useRouter();

  if (selectedId) {
    return viewType === "stacks" ? (
      <StackDetailView
        stackId={selectedId}
        onBack={() => setSelectedId(null)}
        onAddProtocol={(id) =>
          router.push({ pathname: "/(tabs)/protocols", params: { newStackId: id } })
        }
      />
    ) : (
      <DetailView
        peptideId={selectedId}
        onBack={() => setSelectedId(null)}
        onAddProtocol={(id) =>
          router.push({ pathname: "/(tabs)/protocols", params: { newPeptideId: id } })
        }
      />
    );
  }

  return (
    <View style={s.container}>
      <View style={s.typeToggleRow}>
        <TouchableOpacity
          style={[s.typeToggleBtn, viewType === "peptides" && s.typeToggleBtnActive]}
          onPress={() => setViewType("peptides")}
        >
          <Text style={[s.typeToggleText, viewType === "peptides" && s.typeToggleTextActive]}>
            Peptides
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.typeToggleBtn, viewType === "stacks" && s.typeToggleBtnActive]}
          onPress={() => setViewType("stacks")}
        >
          <Text style={[s.typeToggleText, viewType === "stacks" && s.typeToggleTextActive]}>
            Stacks
          </Text>
        </TouchableOpacity>
      </View>
      {viewType === "stacks" ? (
        <StackListView onSelect={setSelectedId} />
      ) : (
        <ListView onSelect={setSelectedId} />
      )}
    </View>
  );
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
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

  // sources
  sourceCount: { color: colors.tx3, fontSize: 12, lineHeight: 17, marginTop: 10 },
  sectionNote: { color: colors.tx3, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  citeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 8 },
  citeLabel: { color: colors.tx3, fontSize: 11, fontWeight: "600" },
  cite: {
    minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,214,143,0.12)", borderWidth: 1, borderColor: "rgba(0,214,143,0.4)",
  },
  citeDim: { backgroundColor: "rgba(255,255,255,0.05)", borderColor: colors.border },
  citeText: { color: colors.teal, fontSize: 11, fontWeight: "700" },
  refItem: { flexDirection: "row", marginBottom: 14 },
  refNum: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "700",
    width: 24,
    paddingTop: 1,
  },
  refFoot: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  refLinkRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  refLink: { color: colors.teal, fontSize: 12, fontWeight: "600" },
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

  // add protocol CTA
  addProtocolBtn: {
    marginTop: 20,
    backgroundColor: colors.teal,
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addProtocolBtnText: {
    color: "#021a0e",
    fontSize: 15,
    fontWeight: "700",
  },

  // stack composition sources
  sourceUrl: { color: colors.teal, fontSize: 12, marginBottom: 4 },
  componentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  componentDoseRange: { marginTop: 6, marginLeft: 8 },

  // peptides/stacks toggle
  typeToggleRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  typeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeToggleBtnActive: { backgroundColor: "rgba(0,214,143,0.12)", borderColor: colors.teal },
  typeToggleText: { color: colors.tx2, fontSize: 14, fontWeight: "600" },
  typeToggleTextActive: { color: colors.teal },
});
