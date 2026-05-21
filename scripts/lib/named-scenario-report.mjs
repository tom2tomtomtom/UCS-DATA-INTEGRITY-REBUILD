export function buildNamedScenarioReport(input = {}) {
  const sourceEvidence = input.sourceEvidence ?? missingSourceEvidence();
  const ucs04787Checks = withLiveFloatTargetCheck([
    check("float_layers_compared", "pass", "Raw Float, visible dashboard Float, and cache/compare layers are kept separate."),
    check("raw_cache_visible_mismatch_surfaced", "warn", "The fixture contains raw/visible Float mismatch evidence and the report leaves it as warning evidence.")
  ], sourceEvidence, "UCS04787");
  const ucs04787Action = "Yunni or Tom should compare the current Float export settings with the scoped dashboard period before treating the delta as fixed.";
  const ucs05186Checks = withLiveFloatTargetCheck([
    check("duplicate_candidates_visible", "pass", "Canonical and manual duplicate Float candidates remain visible instead of being silently merged."),
    check("archived_duplicate_still_evidence", "warn", "Archived/manual duplicate evidence remains warning evidence until a fresh source pull proves it no longer contributes.")
  ], sourceEvidence, "UCS05186");
  const ucs05186Action = "Keep duplicate/manual Float rows visible until Yunni confirms which source row should be fixed.";
  const ucs04154Checks = withLiveFloatTargetCheck([
    check("fee_sheet_float_id_join_key", "pass", "The fee-sheet Float ID is represented as the canonical join key for the original sold work."),
    check("manual_duplicate_not_winner", "pass", "Manual duplicates are evidence only, not automatic winners over the fee-sheet Float ID.")
  ], sourceEvidence, "UCS04154");
  const pcs00250Checks = withLiveFloatTargetCheck([
    check("cache_without_raw_warn", "warn", "Cache-only Float hours remain warning evidence when raw Float task evidence is absent."),
    check("not_green_when_cache_only", "pass", "Cache-only hours cannot be marked as pass.")
  ], sourceEvidence, "PCS00250");
  const pcs00250Action = "A fresh Float pull must prove whether raw task rows now exist.";
  const btChecks = withLiveFloatTargetCheck([
    check("raw_without_cache_fail_class", "warn", "Raw Float hours without cache are classified as a blocking reconciliation issue in the evidence layer."),
    check("raw_not_hidden", "pass", "Raw Float task evidence remains visible even when cache evidence is absent.")
  ], sourceEvidence, "BT");
  const btAction = "Tom should inspect the import/cache path before any dashboard approval on that Float row.";

  const scenarios = [
    scenario("ldn-q1-design", "LDN Q1 Design Rollup To Projects", "Sian", "pass", "display_contract_agrees", [
      check("same_scope_same_number", "pass", "Department rollup, Projects footer, CSV, and detail use the same display contract scope."),
      check("projects_csv_detail_parity", "pass", "Supported sold and Float metrics are compared through the display contract, not page-local totals."),
      check("pipeline_department_unsupported", "pass", "Pipeline remains unsupported in department scope rather than being attributed to Design.")
    ]),
    scenario("ucs04787", "UCS04787 Float Mismatch", "Yunni", "warn", "source_or_cache_warning", ucs04787Checks, ucs04787Action, warningEvidence(sourceEvidence, "UCS04787", {
      raw: "represented",
      cache: "missing",
      visible: "represented",
      classification: "cache/import issue",
      nextHumanAction: ucs04787Action
    })),
    scenario("ucs05186", "UCS05186 Duplicate Manual Float Job", "Yunni", "warn", "source_or_cache_warning", ucs05186Checks, ucs05186Action, warningEvidence(sourceEvidence, "UCS05186", {
      raw: "missing",
      cache: "missing",
      visible: "represented",
      classification: "source issue",
      nextHumanAction: ucs05186Action
    })),
    scenario("ucs04154", "UCS04154 Fee-sheet Float ID Join", "Yunni", statusFromChecks(ucs04154Checks), "join_key_protected", ucs04154Checks),
    scenario("pcs00250", "PCS00250 Cache Without Raw", "Yunni", "warn", "source_or_cache_warning", pcs00250Checks, pcs00250Action, warningEvidence(sourceEvidence, "PCS00250", {
      raw: "missing",
      cache: "represented",
      visible: "missing",
      classification: "cache/import issue",
      nextHumanAction: pcs00250Action
    })),
    scenario("usa00262", "USA00262 Sold-hours False-zero Guard", "Sian", "pass", "false_zero_guarded", [
      check("sold_hours_false_zero_guard", "pass", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
      check("usa_template_hours_supported", "pass", "USA fee-sheet hours must be treated as source-supported when parser evidence exists.")
    ]),
    scenario("usa00323", "USA00323 Sold-hours False-zero Guard", "Sian", "pass", "false_zero_guarded", [
      check("sold_hours_false_zero_guard", "pass", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
      check("raw_parser_not_total", "pass", "Raw parser rows are not summed unless additive status proves they are totals-safe.")
    ]),
    scenario("bt-raw-without-cache", "BT Raw Without Cache", "Yunni", "warn", "source_or_cache_warning", btChecks, btAction, warningEvidence(sourceEvidence, "BT", {
      raw: "represented",
      cache: "missing",
      visible: "missing",
      classification: "unresolved",
      nextHumanAction: btAction
    })),
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

export function buildFloatLayerEvidenceFromSnapshot(snapshot, floatTargetManifest) {
  const floatSource = findLiveFloatSource(snapshot);
  if (floatSource === undefined) return [];

  const rows = arrayRecords(floatSource.rows);
  const hasTaskCoverage = rows.some(isFloatTaskRow);

  return floatTargetManifest.requestedScenarioCodes.map((scenarioCode) => {
    const resolution = floatTargetManifest.resolvedScenarios.find((item) =>
      sameScenarioCode(item.scenarioCode, scenarioCode)
    );
    const explicitLayerEvidence = explicitFloatLayerEvidence(rows, scenarioCode, resolution?.floatProjectId);
    const sourceRowKeys = [];
    const derivedLayers = [];
    let raw = "not_applicable";

    if (resolution !== undefined && hasTaskCoverage) {
      const taskRows = rows.filter((row) => isFloatTaskForProject(row, resolution.floatProjectId));
      raw = taskRows.length > 0 ? "represented" : "missing";
      derivedLayers.push("raw");
      for (const taskRow of taskRows) {
        const sourceRowKey = stableSourceRowKeyFor(taskRow);
        if (sourceRowKey !== undefined) addUnique(sourceRowKeys, sourceRowKey);
      }
    }

    const cache = explicitLayerEvidence.cache;
    const visible = explicitLayerEvidence.visible;
    const displayContract = explicitLayerEvidence.displayContract;
    sourceRowKeys.push(...explicitLayerEvidence.sourceRowKeys.filter((key) => !sourceRowKeys.includes(key)));
    derivedLayers.push(...explicitLayerEvidence.derivedLayers.filter((layer) => !derivedLayers.includes(layer)));

    return {
      scenarioCode,
      ...(resolution === undefined ? {} : { floatProjectId: resolution.floatProjectId }),
      raw,
      cache,
      visible,
      displayContract,
      derivedLayers,
      sourceRowKeys
    };
  });
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

function scenario(id, name, owner, status, classification, checks, nextHumanAction, warningEvidence) {
  return {
    id,
    name,
    owner,
    status,
    classification,
    checks,
    ...(warningEvidence === undefined ? {} : { warningEvidence }),
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

function warningEvidence(sourceEvidence, scenarioCode, input) {
  const isSourceSnapshotReady = sourceEvidence.status === "ready";
  const layerEvidence = floatLayerEvidenceFor(sourceEvidence, scenarioCode);
  const raw = layerEvidence?.derivedLayers.includes("raw") === true ? layerEvidence.raw : input.raw;
  const cache = layerEvidence?.derivedLayers.includes("cache") === true ? layerEvidence.cache : input.cache;
  const visible = layerEvidence?.derivedLayers.includes("visible") === true ? layerEvidence.visible : input.visible;
  const derivedLayers = layerEvidence?.derivedLayers ?? [];
  const fixtureLayers = ["raw", "cache", "visible"].filter((layer) => !derivedLayers.includes(layer));

  return {
    evidenceStatus: isSourceSnapshotReady ? "source_snapshot_ready" : "source_snapshot_missing",
    sourceLayersChecked: sourceLayersCheckedFor(sourceEvidence, derivedLayers),
    knownFloatIdsFromLiveManifest: liveManifestFloatIds(sourceEvidence, scenarioCode),
    rawCacheVisibleStatus: {
      raw,
      cache,
      visible
    },
    rawCacheVisibleStatusBasis: rawCacheVisibleStatusBasis(derivedLayers),
    derivedLayers,
    fixtureLayers,
    displayContractRowStatus:
      layerEvidence?.derivedLayers.includes("display_contract") === true
        ? layerEvidence.displayContract
        : "not_applicable",
    classification: input.classification,
    nextHumanAction: input.nextHumanAction
  };
}

function sourceLayersCheckedFor(sourceEvidence, derivedLayers) {
  if (sourceEvidence.status !== "ready") return [];

  const layers = [...sourceEvidence.sourcesChecked, "live_float_manifest"];
  if (derivedLayers.includes("raw")) layers.push("float_raw");
  if (derivedLayers.includes("cache")) layers.push("float_cache");
  if (derivedLayers.includes("visible")) layers.push("float_visible");
  if (derivedLayers.includes("display_contract")) layers.push("display_contract");
  return layers;
}

function rawCacheVisibleStatusBasis(derivedLayers) {
  const derivedSourceLayers = derivedLayers.filter((layer) => layer !== "display_contract");
  if (derivedSourceLayers.length === 0) return "named_scenario_fixture";
  if (derivedSourceLayers.length === 3) return "derived_source_snapshot";
  return "mixed_source_snapshot_and_fixture";
}

function floatLayerEvidenceFor(sourceEvidence, scenarioCode) {
  if (sourceEvidence.status !== "ready") return undefined;

  return sourceEvidence.floatLayerEvidence?.find((item) => sameScenarioCode(item.scenarioCode, scenarioCode));
}

function liveManifestFloatIds(sourceEvidence, scenarioCode) {
  if (sourceEvidence.status !== "ready") return [];

  return sourceEvidence.floatTargetManifest.resolvedScenarios
    .filter((resolution) => sameScenarioCode(resolution.scenarioCode, scenarioCode))
    .map((resolution) => resolution.floatProjectId);
}

function explicitFloatLayerEvidence(rows, scenarioCode, floatProjectId) {
  const derivedLayers = [];
  const sourceRowKeys = [];
  let cache = "not_applicable";
  let visible = "not_applicable";
  let displayContract = "not_applicable";

  for (const row of rows) {
    const raw = asRecord(row.raw);
    if (raw === undefined || stringValue(raw.objectType) !== "float_layer_evidence") continue;

    const rowScenarioCode = stringValue(raw.scenarioCode);
    const rowFloatProjectId = stringValue(raw.floatProjectId);
    const matchesScenario = rowScenarioCode !== undefined && sameScenarioCode(rowScenarioCode, scenarioCode);
    const matchesFloatProject = floatProjectId !== undefined && rowFloatProjectId === floatProjectId;
    if (!matchesScenario && !matchesFloatProject) continue;

    const sourceRowKey = stableSourceRowKeyFor(row);
    if (sourceRowKey !== undefined) addUnique(sourceRowKeys, sourceRowKey);

    const cachePresence = layerPresence(raw.cache);
    if (cachePresence !== undefined) {
      cache = cachePresence;
      addUnique(derivedLayers, "cache");
    }
    const visiblePresence = layerPresence(raw.visible);
    if (visiblePresence !== undefined) {
      visible = visiblePresence;
      addUnique(derivedLayers, "visible");
    }
    const displayContractPresence = layerPresence(raw.displayContract ?? raw.display_contract);
    if (displayContractPresence !== undefined) {
      displayContract = displayContractPresence;
      addUnique(derivedLayers, "display_contract");
    }
  }

  return {
    cache,
    visible,
    displayContract,
    derivedLayers,
    sourceRowKeys
  };
}

function isFloatTaskForProject(row, floatProjectId) {
  if (!isFloatTaskRow(row)) return false;
  const raw = asRecord(row.raw);
  return stringValue(raw.project_id ?? raw.projectId) === floatProjectId;
}

function isFloatTaskRow(row) {
  const raw = asRecord(row.raw);
  return raw !== undefined && stringValue(raw.objectType) === "task";
}

function stableSourceRowKeyFor(row) {
  const identity = asRecord(row.identity);
  return stringValue(identity?.stableSourceRowKey);
}

function layerPresence(value) {
  if (value === "represented" || value === "missing" || value === "not_applicable") {
    return value;
  }
  if (value === true) return "represented";
  if (value === false) return "missing";
  return undefined;
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
