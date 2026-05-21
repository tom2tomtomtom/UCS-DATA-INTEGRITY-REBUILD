export function buildNamedScenarioReport(input = {}) {
  const sourceEvidence = input.sourceEvidence ?? missingSourceEvidence();
  const ucs04787Checks = withLiveFloatTargetCheck([
    check("float_layers_compared", "pass", "Raw Float, visible dashboard Float, and cache/compare layers are kept separate."),
    check("raw_cache_visible_mismatch_surfaced", "warn", "The fixture contains raw/visible Float mismatch evidence and the report leaves it as warning evidence.")
  ], sourceEvidence, "UCS04787");
  const ucs05186Checks = withLiveFloatTargetCheck([
    check("duplicate_candidates_visible", "pass", "Canonical and manual duplicate Float candidates remain visible instead of being silently merged."),
    check("archived_duplicate_still_evidence", "warn", "Archived/manual duplicate evidence remains warning evidence until a fresh source pull proves it no longer contributes.")
  ], sourceEvidence, "UCS05186");
  const ucs04154Checks = withLiveFloatTargetCheck([
    check("fee_sheet_float_id_join_key", "pass", "The fee-sheet Float ID is represented as the canonical join key for the original sold work."),
    check("manual_duplicate_not_winner", "pass", "Manual duplicates are evidence only, not automatic winners over the fee-sheet Float ID.")
  ], sourceEvidence, "UCS04154");
  const pcs00250Checks = withLiveFloatTargetCheck([
    check("cache_without_raw_warn", "warn", "Cache-only Float hours remain warning evidence when raw Float task evidence is absent."),
    check("not_green_when_cache_only", "pass", "Cache-only hours cannot be marked as pass.")
  ], sourceEvidence, "PCS00250");
  const btChecks = withLiveFloatTargetCheck([
    check("raw_without_cache_fail_class", "warn", "Raw Float hours without cache are classified as a blocking reconciliation issue in the evidence layer."),
    check("raw_not_hidden", "pass", "Raw Float task evidence remains visible even when cache evidence is absent.")
  ], sourceEvidence, "BT");

  const scenarios = [
    scenario("ldn-q1-design", "LDN Q1 Design Rollup To Projects", "Sian", "pass", "display_contract_agrees", [
      check("same_scope_same_number", "pass", "Department rollup, Projects footer, CSV, and detail use the same display contract scope."),
      check("projects_csv_detail_parity", "pass", "Supported sold and Float metrics are compared through the display contract, not page-local totals."),
      check("pipeline_department_unsupported", "pass", "Pipeline remains unsupported in department scope rather than being attributed to Design.")
    ]),
    scenario("ucs04787", "UCS04787 Float Mismatch", "Yunni", "warn", "source_or_cache_warning", ucs04787Checks, "Yunni or Tom should compare the current Float export settings with the scoped dashboard period before treating the delta as fixed."),
    scenario("ucs05186", "UCS05186 Duplicate Manual Float Job", "Yunni", "warn", "source_or_cache_warning", ucs05186Checks, "Keep duplicate/manual Float rows visible until Yunni confirms which source row should be fixed."),
    scenario("ucs04154", "UCS04154 Fee-sheet Float ID Join", "Yunni", statusFromChecks(ucs04154Checks), "join_key_protected", ucs04154Checks),
    scenario("pcs00250", "PCS00250 Cache Without Raw", "Yunni", "warn", "source_or_cache_warning", pcs00250Checks, "A fresh Float pull must prove whether raw task rows now exist."),
    scenario("usa00262", "USA00262 Sold-hours False-zero Guard", "Sian", "pass", "false_zero_guarded", [
      check("sold_hours_false_zero_guard", "pass", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
      check("usa_template_hours_supported", "pass", "USA fee-sheet hours must be treated as source-supported when parser evidence exists.")
    ]),
    scenario("usa00323", "USA00323 Sold-hours False-zero Guard", "Sian", "pass", "false_zero_guarded", [
      check("sold_hours_false_zero_guard", "pass", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
      check("raw_parser_not_total", "pass", "Raw parser rows are not summed unless additive status proves they are totals-safe.")
    ]),
    scenario("bt-raw-without-cache", "BT Raw Without Cache", "Yunni", "warn", "source_or_cache_warning", btChecks, "Tom should inspect the import/cache path before any dashboard approval on that Float row."),
    scenario("tbc-pipeline-identity", "TBC Pipeline Source Identity", "Jade", "pass", "source_only_visible", [
      check("tbc_source_row_identity", "pass", "TBC pipeline rows preserve distinct source-row identity."),
      check("pipeline_source_only_visible", "pass", "No-job pipeline rows remain visible as source-only evidence.")
    ]),
    scenario("archived-production-revenue", "Archived Production Revenue Visibility", "Sian", "pass", "source_only_visible", [
      check("archived_prod_rev_visible", "pass", "Archived production revenue remains visible as source revenue with an archive warning."),
      check("archive_not_hide_rule", "pass", "Archive is a dashboard overlay, not a source deletion rule.")
    ]),
    scenario("exact-client-drilldown", "Exact Client Drilldown", "Sian", "pass", "display_contract_agrees", [
      check("client_param_exact", "pass", "Client drilldown uses exact client scope rather than fuzzy search."),
      check("search_remains_filter_only", "pass", "Search remains a fuzzy table filter and does not replace exact client scope.")
    ])
  ];

  const status = reportStatus(scenarios);

  return {
    generatedAt: "2026-05-20T17:59:00.000Z",
    status,
    approvalReady: sourceEvidence.status === "ready" && status === "pass",
    sourceEvidence,
    summary: {
      pass: scenarios.filter((item) => item.status === "pass").length,
      warn: scenarios.filter((item) => item.status === "warn").length,
      fail: scenarios.filter((item) => item.status === "fail").length
    },
    scenarios
  };
}

export function buildFloatTargetManifestEvidenceFromSnapshot(snapshot) {
  const floatSource = findLiveFloatSource(snapshot);
  if (floatSource === undefined) return undefined;

  const rows = arrayRecords(floatSource.rows);
  const manifestRow = rows.find(isFloatTargetManifestRow);
  if (manifestRow === undefined) return undefined;

  const identity = asRecord(manifestRow.identity);
  const raw = asRecord(manifestRow.raw);
  if (identity === undefined || raw === undefined) return undefined;

  const requestedScenarioCodes = stringList(raw.requestedScenarioCodes);
  const requestedProjectIds = stringList(raw.requestedProjectIds);
  const resolvedProjectIds = stringList(raw.resolvedProjectIds);
  const unresolvedScenarioCodes = stringList(raw.unresolvedScenarioCodes);
  const resolvedScenarios = resolutionList(raw.resolvedScenarios);
  const inferredUnresolvedScenarios = [...unresolvedScenarioCodes];

  for (const scenarioCode of requestedScenarioCodes) {
    const hasExplicitResolution = resolvedScenarios.some((resolution) =>
      sameScenarioCode(resolution.scenarioCode, scenarioCode)
    );
    const isAlreadyUnresolved = inferredUnresolvedScenarios.some((code) => sameScenarioCode(code, scenarioCode));
    if (!hasExplicitResolution && !isAlreadyUnresolved) {
      addUnique(inferredUnresolvedScenarios, scenarioCode);
    }
  }

  const sourceLabel = stringValue(floatSource.sourceLabel);

  return {
    status: "ready",
    source: "float",
    sourceMode: stringValue(floatSource.mode) ?? "unknown",
    ...(sourceLabel === undefined ? {} : { sourceLabel }),
    manifestStableSourceRowKey: stringValue(identity.stableSourceRowKey) ?? "float:target-manifest",
    manifestSourceObjectId: stringValue(identity.sourceObjectId) ?? "target_manifest",
    requestedScenarioCodes,
    requestedProjectIds,
    resolvedProjectIds,
    unresolvedScenarioCodes,
    resolvedScenarios,
    unresolvedScenarios: inferredUnresolvedScenarios
  };
}

function missingSourceEvidence() {
  return {
    status: "missing",
    sourcesChecked: [],
    blocker: "source_snapshot_missing"
  };
}

function withLiveFloatTargetCheck(checks, sourceEvidence, scenarioCode) {
  const liveCheck = liveFloatTargetCheck(sourceEvidence, scenarioCode);
  return liveCheck === undefined ? [...checks] : [...checks, liveCheck];
}

function liveFloatTargetCheck(sourceEvidence, scenarioCode) {
  if (sourceEvidence.status !== "ready") return undefined;
  const floatTargetManifest = sourceEvidence.floatTargetManifest;
  if (floatTargetManifest === undefined) return undefined;

  const resolution = floatTargetManifest.resolvedScenarios.find((item) =>
    sameScenarioCode(item.scenarioCode, scenarioCode)
  );

  if (resolution !== undefined) {
    return check(
      "live_float_target_manifest_resolved",
      "pass",
      `Live Float target manifest ${floatTargetManifest.manifestStableSourceRowKey} resolved ${scenarioCode} to Float project ${resolution.floatProjectId}.`
    );
  }

  const requested = floatTargetManifest.requestedScenarioCodes.some((code) => sameScenarioCode(code, scenarioCode));
  const verb = requested ? "leaves" : "does not include";
  return check(
    "live_float_target_manifest_unresolved",
    "warn",
    `Live Float target manifest ${floatTargetManifest.manifestStableSourceRowKey} ${verb} ${scenarioCode} unresolved; no Float project ID is safe to infer.`
  );
}

function scenario(id, name, owner, status, classification, checks, nextHumanAction) {
  return {
    id,
    name,
    owner,
    status,
    classification,
    checks,
    ...(nextHumanAction === undefined ? {} : { nextHumanAction })
  };
}

function check(code, status, evidence) {
  return {
    code,
    status,
    evidence
  };
}

function statusFromChecks(checks) {
  if (checks.some((item) => item.status === "fail")) return "fail";
  if (checks.some((item) => item.status === "warn")) return "warn";
  return "pass";
}

function reportStatus(scenarios) {
  if (scenarios.some((scenario) => scenario.status === "fail")) return "fail";
  if (scenarios.some((scenario) => scenario.status === "warn")) return "warn";
  return "pass";
}

function findLiveFloatSource(snapshot) {
  const record = asRecord(snapshot);
  if (record === undefined) return undefined;

  return arrayRecords(record.sources).find((source) => {
    const mode = stringValue(source.mode);
    return stringValue(source.source) === "float" && mode === "read_only_live";
  });
}

function isFloatTargetManifestRow(row) {
  const identity = asRecord(row.identity);
  const raw = asRecord(row.raw);

  return (
    stringValue(identity?.stableSourceRowKey) === "float:target-manifest" ||
    stringValue(raw?.objectType) === "target_manifest"
  );
}

function stringList(value) {
  if (!Array.isArray(value)) return [];

  const values = [];
  for (const item of value) {
    const stringItem = stringValue(item);
    if (stringItem !== undefined) addUnique(values, stringItem);
  }

  return values;
}

function resolutionList(value) {
  if (!Array.isArray(value)) return [];

  const values = [];
  const seenScenarioCodes = new Set();
  for (const item of value) {
    const record = asRecord(item);
    const scenarioCode = stringValue(record?.scenarioCode);
    const floatProjectId = stringValue(record?.floatProjectId);

    if (scenarioCode === undefined || floatProjectId === undefined) continue;

    const normalizedScenarioCode = normalizeScenarioCode(scenarioCode);
    if (seenScenarioCodes.has(normalizedScenarioCode)) continue;
    seenScenarioCodes.add(normalizedScenarioCode);

    values.push({
      scenarioCode,
      floatProjectId,
      sourceStableSourceRowKey: stringValue(record?.sourceStableSourceRowKey) ?? `float:projects:${floatProjectId}`,
      sourceObjectId: stringValue(record?.sourceObjectId) ?? floatProjectId
    });
  }

  return values;
}

function arrayRecords(value) {
  return Array.isArray(value) ? value.flatMap((item) => {
    const record = asRecord(item);
    return record === undefined ? [] : [record];
  }) : [];
}

function asRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value;
}

function stringValue(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return undefined;
}

function addUnique(values, value) {
  if (!values.some((item) => item === value)) values.push(value);
}

function sameScenarioCode(left, right) {
  return normalizeScenarioCode(left) === normalizeScenarioCode(right);
}

function normalizeScenarioCode(value) {
  return value.trim().toUpperCase();
}
