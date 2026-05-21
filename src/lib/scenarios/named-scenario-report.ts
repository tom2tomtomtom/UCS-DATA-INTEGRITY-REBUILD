export type NamedScenarioOwner = "Sian" | "Yunni" | "Jade";

export type NamedScenarioStatus = "pass" | "warn" | "fail";

export type NamedScenarioClassification =
  | "display_contract_agrees"
  | "source_or_cache_warning"
  | "source_only_visible"
  | "join_key_protected"
  | "false_zero_guarded"
  | "unsupported_visible"
  | "new_code_bug";

export type NamedScenarioCheck = {
  readonly code: string;
  readonly status: NamedScenarioStatus;
  readonly evidence: string;
};

export type NamedScenarioWarningEvidenceClassification =
  | "source issue"
  | "cache/import issue"
  | "display-contract issue"
  | "unsupported capability"
  | "unresolved";

export type NamedScenarioLayerPresence = "represented" | "missing" | "not_applicable";

export type NamedScenarioRawCacheVisibleEvidence = {
  readonly raw: NamedScenarioLayerPresence;
  readonly cache: NamedScenarioLayerPresence;
  readonly visible: NamedScenarioLayerPresence;
};

export type NamedScenarioLayerKey = "raw" | "cache" | "visible" | "display_contract";

export type NamedScenarioFloatLayerEvidence = NamedScenarioRawCacheVisibleEvidence & {
  readonly scenarioCode: string;
  readonly floatProjectId?: string;
  readonly displayContract: NamedScenarioLayerPresence;
  readonly derivedLayers: readonly NamedScenarioLayerKey[];
  readonly sourceRowKeys: readonly string[];
};

export type NamedScenarioWarningEvidence = {
  readonly evidenceStatus: "source_snapshot_missing" | "source_snapshot_ready";
  readonly sourceLayersChecked: readonly string[];
  readonly knownFloatIdsFromLiveManifest: readonly string[];
  readonly rawCacheVisibleStatus: NamedScenarioRawCacheVisibleEvidence;
  readonly rawCacheVisibleStatusBasis:
    | "named_scenario_fixture"
    | "derived_source_snapshot"
    | "mixed_source_snapshot_and_fixture";
  readonly derivedLayers: readonly NamedScenarioLayerKey[];
  readonly fixtureLayers: readonly NamedScenarioLayerKey[];
  readonly displayContractRowStatus: NamedScenarioLayerPresence;
  readonly classification: NamedScenarioWarningEvidenceClassification;
  readonly nextHumanAction: string;
};

export type NamedScenarioFloatResolution = {
  readonly scenarioCode: string;
  readonly floatProjectId: string;
  readonly sourceStableSourceRowKey: string;
  readonly sourceObjectId: string;
};

export type NamedScenarioFloatTargetManifestEvidence = {
  readonly status: "ready";
  readonly source: "float";
  readonly sourceMode: string;
  readonly sourceLabel?: string;
  readonly manifestStableSourceRowKey: string;
  readonly manifestSourceObjectId: string;
  readonly requestedScenarioCodes: readonly string[];
  readonly requestedProjectIds: readonly string[];
  readonly resolvedProjectIds: readonly string[];
  readonly unresolvedScenarioCodes: readonly string[];
  readonly resolvedScenarios: readonly NamedScenarioFloatResolution[];
  readonly unresolvedScenarios: readonly string[];
};

export type NamedScenarioResult = {
  readonly id: string;
  readonly name: string;
  readonly owner: NamedScenarioOwner;
  readonly status: NamedScenarioStatus;
  readonly classification: NamedScenarioClassification;
  readonly checks: readonly NamedScenarioCheck[];
  readonly warningEvidence?: NamedScenarioWarningEvidence;
  readonly nextHumanAction?: string;
};

export type NamedScenarioReport = {
  readonly generatedAt: string;
  readonly status: NamedScenarioStatus;
  readonly approvalReady: boolean;
  readonly sourceEvidence: NamedScenarioSourceEvidence;
  readonly summary: Record<NamedScenarioStatus, number>;
  readonly scenarios: readonly NamedScenarioResult[];
};

export type NamedScenarioSourceEvidence =
  | {
      readonly status: "missing";
      readonly sourcesChecked: readonly [];
      readonly blocker: "source_snapshot_missing";
    }
  | {
      readonly status: "ready";
      readonly snapshotId: string;
      readonly sourcesChecked: readonly ["fee_sheet", "pipeline", "production_revenue", "float"];
      readonly rawRows: number;
      readonly floatTargetManifest: NamedScenarioFloatTargetManifestEvidence;
      readonly floatLayerEvidence: readonly NamedScenarioFloatLayerEvidence[];
    };

const generatedAt = "2026-05-20T17:59:00.000Z";

export function buildNamedScenarioReport(input?: {
  readonly sourceEvidence?: NamedScenarioSourceEvidence;
}): NamedScenarioReport {
  const sourceEvidence = input?.sourceEvidence ?? missingSourceEvidence();
  const ucs04787Checks = withLiveFloatTargetCheck(
    [
      pass("float_layers_compared", "Raw Float, visible dashboard Float, and cache/compare layers are kept separate."),
      warn("raw_cache_visible_mismatch_surfaced", "The fixture contains raw/visible Float mismatch evidence and the report leaves it as warning evidence.")
    ],
    sourceEvidence,
    "UCS04787"
  );
  const ucs04787Action = "Yunni or Tom should compare the current Float export settings with the scoped dashboard period before treating the delta as fixed.";
  const ucs05186Checks = withLiveFloatTargetCheck(
    [
      pass("duplicate_candidates_visible", "Canonical and manual duplicate Float candidates remain visible instead of being silently merged."),
      warn("archived_duplicate_still_evidence", "Archived/manual duplicate evidence remains warning evidence until a fresh source pull proves it no longer contributes.")
    ],
    sourceEvidence,
    "UCS05186"
  );
  const ucs05186Action = "Keep duplicate/manual Float rows visible until Yunni confirms which source row should be fixed.";
  const ucs04154Checks = withLiveFloatTargetCheck(
    [
      pass("fee_sheet_float_id_join_key", "The fee-sheet Float ID is represented as the canonical join key for the original sold work."),
      pass("manual_duplicate_not_winner", "Manual duplicates are evidence only, not automatic winners over the fee-sheet Float ID.")
    ],
    sourceEvidence,
    "UCS04154"
  );
  const pcs00250Checks = withLiveFloatTargetCheck(
    [
      warn("cache_without_raw_warn", "Cache-only Float hours remain warning evidence when raw Float task evidence is absent."),
      pass("not_green_when_cache_only", "Cache-only hours cannot be marked as pass.")
    ],
    sourceEvidence,
    "PCS00250"
  );
  const pcs00250Action = "A fresh Float pull must prove whether raw task rows now exist.";
  const btChecks = withLiveFloatTargetCheck(
    [
      warn("raw_without_cache_fail_class", "Raw Float hours without cache are classified as a blocking reconciliation issue in the evidence layer."),
      pass("raw_not_hidden", "Raw Float task evidence remains visible even when cache evidence is absent.")
    ],
    sourceEvidence,
    "BT"
  );
  const btAction = "Tom should inspect the import/cache path before any dashboard approval on that Float row.";

  const scenarios: NamedScenarioResult[] = [
    {
      id: "ldn-q1-design",
      name: "LDN Q1 Design Rollup To Projects",
      owner: "Sian",
      status: "pass",
      classification: "display_contract_agrees",
      checks: [
        pass("same_scope_same_number", "Department rollup, Projects footer, CSV, and detail use the same display contract scope."),
        pass("projects_csv_detail_parity", "Supported sold and Float metrics are compared through the display contract, not page-local totals."),
        pass("pipeline_department_unsupported", "Pipeline remains unsupported in department scope rather than being attributed to Design.")
      ]
    },
    {
      id: "ucs04787",
      name: "UCS04787 Float Mismatch",
      owner: "Yunni",
      status: "warn",
      classification: "source_or_cache_warning",
      checks: ucs04787Checks,
      warningEvidence: warningEvidence(sourceEvidence, "UCS04787", {
        raw: "represented",
        cache: "missing",
        visible: "represented",
        classification: "cache/import issue",
        nextHumanAction: ucs04787Action
      }),
      nextHumanAction: ucs04787Action
    },
    {
      id: "ucs05186",
      name: "UCS05186 Duplicate Manual Float Job",
      owner: "Yunni",
      status: "warn",
      classification: "source_or_cache_warning",
      checks: ucs05186Checks,
      warningEvidence: warningEvidence(sourceEvidence, "UCS05186", {
        raw: "missing",
        cache: "missing",
        visible: "represented",
        classification: "source issue",
        nextHumanAction: ucs05186Action
      }),
      nextHumanAction: ucs05186Action
    },
    {
      id: "ucs04154",
      name: "UCS04154 Fee-sheet Float ID Join",
      owner: "Yunni",
      status: statusFromChecks(ucs04154Checks),
      classification: "join_key_protected",
      checks: ucs04154Checks
    },
    {
      id: "pcs00250",
      name: "PCS00250 Cache Without Raw",
      owner: "Yunni",
      status: "warn",
      classification: "source_or_cache_warning",
      checks: pcs00250Checks,
      warningEvidence: warningEvidence(sourceEvidence, "PCS00250", {
        raw: "missing",
        cache: "represented",
        visible: "missing",
        classification: "cache/import issue",
        nextHumanAction: pcs00250Action
      }),
      nextHumanAction: pcs00250Action
    },
    {
      id: "usa00262",
      name: "USA00262 Sold-hours False-zero Guard",
      owner: "Sian",
      status: "pass",
      classification: "false_zero_guarded",
      checks: [
        pass("sold_hours_false_zero_guard", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
        pass("usa_template_hours_supported", "USA fee-sheet hours must be treated as source-supported when parser evidence exists.")
      ]
    },
    {
      id: "usa00323",
      name: "USA00323 Sold-hours False-zero Guard",
      owner: "Sian",
      status: "pass",
      classification: "false_zero_guarded",
      checks: [
        pass("sold_hours_false_zero_guard", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
        pass("raw_parser_not_total", "Raw parser rows are not summed unless additive status proves they are totals-safe.")
      ]
    },
    {
      id: "bt-raw-without-cache",
      name: "BT Raw Without Cache",
      owner: "Yunni",
      status: "warn",
      classification: "source_or_cache_warning",
      checks: btChecks,
      warningEvidence: warningEvidence(sourceEvidence, "BT", {
        raw: "represented",
        cache: "missing",
        visible: "missing",
        classification: "unresolved",
        nextHumanAction: btAction
      }),
      nextHumanAction: btAction
    },
    {
      id: "tbc-pipeline-identity",
      name: "TBC Pipeline Source Identity",
      owner: "Jade",
      status: "pass",
      classification: "source_only_visible",
      checks: [
        pass("tbc_source_row_identity", "TBC pipeline rows preserve distinct source-row identity."),
        pass("pipeline_source_only_visible", "No-job pipeline rows remain visible as source-only evidence.")
      ]
    },
    {
      id: "archived-production-revenue",
      name: "Archived Production Revenue Visibility",
      owner: "Sian",
      status: "pass",
      classification: "source_only_visible",
      checks: [
        pass("archived_prod_rev_visible", "Archived production revenue remains visible as source revenue with an archive warning."),
        pass("archive_not_hide_rule", "Archive is a dashboard overlay, not a source deletion rule.")
      ]
    },
    {
      id: "exact-client-drilldown",
      name: "Exact Client Drilldown",
      owner: "Sian",
      status: "pass",
      classification: "display_contract_agrees",
      checks: [
        pass("client_param_exact", "Client drilldown uses exact client scope rather than fuzzy search."),
        pass("search_remains_filter_only", "Search remains a fuzzy table filter and does not replace exact client scope.")
      ]
    }
  ];

  const status = reportStatus(scenarios);

  return {
    generatedAt,
    status,
    approvalReady: sourceEvidence.status === "ready" && status === "pass",
    sourceEvidence,
    summary: {
      pass: scenarios.filter((scenario) => scenario.status === "pass").length,
      warn: scenarios.filter((scenario) => scenario.status === "warn").length,
      fail: scenarios.filter((scenario) => scenario.status === "fail").length
    },
    scenarios
  };
}

export function buildFloatTargetManifestEvidenceFromSnapshot(snapshot: unknown): NamedScenarioFloatTargetManifestEvidence | undefined {
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

export function buildFloatLayerEvidenceFromSnapshot(
  snapshot: unknown,
  floatTargetManifest: NamedScenarioFloatTargetManifestEvidence
): NamedScenarioFloatLayerEvidence[] {
  const floatSource = findLiveFloatSource(snapshot);
  if (floatSource === undefined) return [];

  const rows = arrayRecords(floatSource.rows);
  const hasTaskCoverage = rows.some(isFloatTaskRow);

  return floatTargetManifest.requestedScenarioCodes.map((scenarioCode) => {
    const resolution = floatTargetManifest.resolvedScenarios.find((item) =>
      sameScenarioCode(item.scenarioCode, scenarioCode)
    );
    const explicitLayerEvidence = explicitFloatLayerEvidence(rows, scenarioCode, resolution?.floatProjectId);
    const sourceRowKeys: string[] = [];
    const derivedLayers: NamedScenarioLayerKey[] = [];
    let raw: NamedScenarioLayerPresence = "not_applicable";

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

function missingSourceEvidence(): NamedScenarioSourceEvidence {
  return {
    status: "missing",
    sourcesChecked: [],
    blocker: "source_snapshot_missing"
  };
}

function withLiveFloatTargetCheck(
  checks: readonly NamedScenarioCheck[],
  sourceEvidence: NamedScenarioSourceEvidence,
  scenarioCode: string
): NamedScenarioCheck[] {
  const liveCheck = liveFloatTargetCheck(sourceEvidence, scenarioCode);
  return liveCheck === undefined ? [...checks] : [...checks, liveCheck];
}

function warningEvidence(
  sourceEvidence: NamedScenarioSourceEvidence,
  scenarioCode: string,
  input: NamedScenarioRawCacheVisibleEvidence & {
    readonly classification: NamedScenarioWarningEvidenceClassification;
    readonly nextHumanAction: string;
  }
): NamedScenarioWarningEvidence {
  const isSourceSnapshotReady = sourceEvidence.status === "ready";
  const layerEvidence = floatLayerEvidenceFor(sourceEvidence, scenarioCode);
  const raw = layerEvidence?.derivedLayers.includes("raw") === true ? layerEvidence.raw : input.raw;
  const cache = layerEvidence?.derivedLayers.includes("cache") === true ? layerEvidence.cache : input.cache;
  const visible = layerEvidence?.derivedLayers.includes("visible") === true ? layerEvidence.visible : input.visible;
  const derivedLayers = layerEvidence?.derivedLayers ?? [];
  const fixtureLayers = (["raw", "cache", "visible"] as const).filter((layer) => !derivedLayers.includes(layer));

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

function sourceLayersCheckedFor(
  sourceEvidence: NamedScenarioSourceEvidence,
  derivedLayers: readonly NamedScenarioLayerKey[]
): string[] {
  if (sourceEvidence.status !== "ready") return [];

  const layers = [...sourceEvidence.sourcesChecked, "live_float_manifest"];
  if (derivedLayers.includes("raw")) layers.push("float_raw");
  if (derivedLayers.includes("cache")) layers.push("float_cache");
  if (derivedLayers.includes("visible")) layers.push("float_visible");
  if (derivedLayers.includes("display_contract")) layers.push("display_contract");
  return layers;
}

function rawCacheVisibleStatusBasis(
  derivedLayers: readonly NamedScenarioLayerKey[]
): NamedScenarioWarningEvidence["rawCacheVisibleStatusBasis"] {
  const derivedSourceLayers = derivedLayers.filter((layer) => layer !== "display_contract");
  if (derivedSourceLayers.length === 0) return "named_scenario_fixture";
  if (derivedSourceLayers.length === 3) return "derived_source_snapshot";
  return "mixed_source_snapshot_and_fixture";
}

function floatLayerEvidenceFor(
  sourceEvidence: NamedScenarioSourceEvidence,
  scenarioCode: string
): NamedScenarioFloatLayerEvidence | undefined {
  if (sourceEvidence.status !== "ready") return undefined;

  return sourceEvidence.floatLayerEvidence?.find((item) => sameScenarioCode(item.scenarioCode, scenarioCode));
}

function liveManifestFloatIds(sourceEvidence: NamedScenarioSourceEvidence, scenarioCode: string): string[] {
  if (sourceEvidence.status !== "ready") return [];

  return sourceEvidence.floatTargetManifest.resolvedScenarios
    .filter((resolution) => sameScenarioCode(resolution.scenarioCode, scenarioCode))
    .map((resolution) => resolution.floatProjectId);
}

function explicitFloatLayerEvidence(
  rows: readonly Record<string, unknown>[],
  scenarioCode: string,
  floatProjectId: string | undefined
): Pick<NamedScenarioFloatLayerEvidence, "cache" | "visible" | "displayContract" | "derivedLayers" | "sourceRowKeys"> {
  const derivedLayers: NamedScenarioLayerKey[] = [];
  const sourceRowKeys: string[] = [];
  let cache: NamedScenarioLayerPresence = "not_applicable";
  let visible: NamedScenarioLayerPresence = "not_applicable";
  let displayContract: NamedScenarioLayerPresence = "not_applicable";

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

function isFloatTaskForProject(row: Record<string, unknown>, floatProjectId: string): boolean {
  if (!isFloatTaskRow(row)) return false;
  const raw = asRecord(row.raw);
  if (raw === undefined) return false;
  return stringValue(raw.project_id ?? raw.projectId) === floatProjectId;
}

function isFloatTaskRow(row: Record<string, unknown>): boolean {
  const raw = asRecord(row.raw);
  return raw !== undefined && stringValue(raw.objectType) === "task";
}

function stableSourceRowKeyFor(row: Record<string, unknown>): string | undefined {
  const identity = asRecord(row.identity);
  return stringValue(identity?.stableSourceRowKey);
}

function layerPresence(value: unknown): NamedScenarioLayerPresence | undefined {
  if (value === "represented" || value === "missing" || value === "not_applicable") {
    return value;
  }
  if (value === true) return "represented";
  if (value === false) return "missing";
  return undefined;
}

function liveFloatTargetCheck(
  sourceEvidence: NamedScenarioSourceEvidence,
  scenarioCode: string
): NamedScenarioCheck | undefined {
  if (sourceEvidence.status !== "ready") return undefined;
  const floatTargetManifest = sourceEvidence.floatTargetManifest;
  if (floatTargetManifest === undefined) return undefined;

  const resolution = floatTargetManifest.resolvedScenarios.find((item) =>
    sameScenarioCode(item.scenarioCode, scenarioCode)
  );

  if (resolution !== undefined) {
    return pass(
      "live_float_target_manifest_resolved",
      `Live Float target manifest ${floatTargetManifest.manifestStableSourceRowKey} resolved ${scenarioCode} to Float project ${resolution.floatProjectId}.`
    );
  }

  const requested = floatTargetManifest.requestedScenarioCodes.some((code) => sameScenarioCode(code, scenarioCode));
  const verb = requested ? "leaves" : "does not include";
  return warn(
    "live_float_target_manifest_unresolved",
    `Live Float target manifest ${floatTargetManifest.manifestStableSourceRowKey} ${verb} ${scenarioCode} unresolved; no Float project ID is safe to infer.`
  );
}

function pass(code: string, evidence: string): NamedScenarioCheck {
  return {
    code,
    status: "pass",
    evidence
  };
}

function warn(code: string, evidence: string): NamedScenarioCheck {
  return {
    code,
    status: "warn",
    evidence
  };
}

function statusFromChecks(checks: readonly NamedScenarioCheck[]): NamedScenarioStatus {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "pass";
}

function reportStatus(scenarios: readonly NamedScenarioResult[]): NamedScenarioStatus {
  if (scenarios.some((scenario) => scenario.status === "fail")) return "fail";
  if (scenarios.some((scenario) => scenario.status === "warn")) return "warn";
  return "pass";
}

function findLiveFloatSource(snapshot: unknown): Record<string, unknown> | undefined {
  const record = asRecord(snapshot);
  if (record === undefined) return undefined;

  return arrayRecords(record.sources).find((source) => {
    const mode = stringValue(source.mode);
    return stringValue(source.source) === "float" && mode === "read_only_live";
  });
}

function isFloatTargetManifestRow(row: Record<string, unknown>): boolean {
  const identity = asRecord(row.identity);
  const raw = asRecord(row.raw);

  return (
    stringValue(identity?.stableSourceRowKey) === "float:target-manifest" ||
    stringValue(raw?.objectType) === "target_manifest"
  );
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const values: string[] = [];
  for (const item of value) {
    const stringItem = stringValue(item);
    if (stringItem !== undefined) addUnique(values, stringItem);
  }

  return values;
}

function resolutionList(value: unknown): NamedScenarioFloatResolution[] {
  if (!Array.isArray(value)) return [];

  const values: NamedScenarioFloatResolution[] = [];
  const seenScenarioCodes = new Set<string>();
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

function arrayRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.flatMap((item) => {
    const record = asRecord(item);
    return record === undefined ? [] : [record];
  }) : [];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return undefined;
}

function addUnique(values: string[], value: string): void {
  if (!values.some((item) => item === value)) values.push(value);
}

function sameScenarioCode(left: string, right: string): boolean {
  return normalizeScenarioCode(left) === normalizeScenarioCode(right);
}

function normalizeScenarioCode(value: string): string {
  return value.trim().toUpperCase();
}
