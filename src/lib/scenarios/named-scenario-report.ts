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

export type NamedScenarioScope = {
  readonly office: "Agency" | "LDN" | "UCX" | "USA";
  readonly from: string;
  readonly to: string;
  readonly view?: "department" | "month" | "role" | "client" | "project" | "float" | "pipeline";
  readonly department?: string;
  readonly client?: string;
  readonly jobNumber?: string;
};

export type NamedScenarioSourceSnapshotRef = {
  readonly layer: string;
  readonly ref: string;
};

export type NamedScenarioEvidenceResultStatus =
  | "pass"
  | "warn"
  | "unresolved"
  | "not_checked"
  | "not_applicable"
  | "needs_codex";

export type NamedScenarioEvidenceResult = {
  readonly status: NamedScenarioEvidenceResultStatus;
  readonly sourceLayer: string;
  readonly basis: string;
};

export type NamedScenarioApprovalStatus =
  | "blocked_source_evidence"
  | "blocked_warning"
  | "blocked_evidence_gap"
  | "ready_for_stakeholder_review";

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

export type NamedScenarioSourceRowEvidence = {
  readonly scenarioCode: string;
  readonly sources: readonly string[];
  readonly sourceRowKeys: readonly string[];
  readonly rowCount: number;
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
  readonly scope: NamedScenarioScope;
  readonly sourceSnapshotRefs: readonly NamedScenarioSourceSnapshotRef[];
  readonly displayContractResult: NamedScenarioEvidenceResult;
  readonly uiSurfaceResult: NamedScenarioEvidenceResult;
  readonly csvResult: NamedScenarioEvidenceResult;
  readonly chatEvidenceResult: NamedScenarioEvidenceResult;
  readonly warnings: readonly string[];
  readonly unresolvedConflicts: readonly string[];
  readonly approvalStatus: NamedScenarioApprovalStatus;
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
      readonly scenarioSourceEvidence?: readonly NamedScenarioSourceRowEvidence[];
    };

type NamedScenarioCoreResult = Omit<
  NamedScenarioResult,
  | "scope"
  | "sourceSnapshotRefs"
  | "displayContractResult"
  | "uiSurfaceResult"
  | "csvResult"
  | "chatEvidenceResult"
  | "warnings"
  | "unresolvedConflicts"
  | "approvalStatus"
>;

const generatedAt = "2026-05-20T17:59:00.000Z";
const sourceBackedScenarioCodes = ["USA00262", "USA00323", "UCS04154", "UCS04787", "UCS05186", "PCS00250"];

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
  const usa00262Checks = withSourceRowEvidenceCheck(
    [
      pass("sold_hours_false_zero_guard", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
      pass("usa_template_hours_supported", "USA fee-sheet hours must be treated as source-supported when parser evidence exists.")
    ],
    sourceEvidence,
    "USA00262"
  );
  const usa00323Checks = withSourceRowEvidenceCheck(
    [
      pass("sold_hours_false_zero_guard", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
      pass("raw_parser_not_total", "Raw parser rows are not summed unless additive status proves they are totals-safe.")
    ],
    sourceEvidence,
    "USA00323"
  );
  const usaAction = "Capture targeted USA fee-sheet source rows and display-contract proof before stakeholder approval.";

  const scenarioCores: NamedScenarioCoreResult[] = [
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
      status: statusFromChecks(usa00262Checks),
      classification: "false_zero_guarded",
      checks: usa00262Checks,
      ...(statusFromChecks(usa00262Checks) === "warn" ? { nextHumanAction: usaAction } : {})
    },
    {
      id: "usa00323",
      name: "USA00323 Sold-hours False-zero Guard",
      owner: "Sian",
      status: statusFromChecks(usa00323Checks),
      classification: "false_zero_guarded",
      checks: usa00323Checks,
      ...(statusFromChecks(usa00323Checks) === "warn" ? { nextHumanAction: usaAction } : {})
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

  const scenarios = scenarioCores.map((scenario) => enrichScenarioEvidence(scenario, sourceEvidence));
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

function enrichScenarioEvidence(
  scenario: NamedScenarioCoreResult,
  sourceEvidence: NamedScenarioSourceEvidence
): NamedScenarioResult {
  const displayContractResult = displayContractResultFor(scenario);
  const uiSurfaceResult = uiSurfaceResultFor(scenario);
  const csvResult = csvResultFor(scenario);
  const chatEvidenceResult = chatEvidenceResultFor(scenario);

  return {
    ...scenario,
    scope: scopeForScenario(scenario.id),
    sourceSnapshotRefs: sourceSnapshotRefsFor(scenario.id, sourceEvidence),
    displayContractResult,
    uiSurfaceResult,
    csvResult,
    chatEvidenceResult,
    warnings: warningsFor(scenario),
    unresolvedConflicts: unresolvedConflictsFor(scenario, sourceEvidence),
    approvalStatus: approvalStatusFor(scenario, sourceEvidence, [
      displayContractResult,
      uiSurfaceResult,
      csvResult,
      chatEvidenceResult
    ])
  };
}

function scopeForScenario(scenarioId: string): NamedScenarioScope {
  switch (scenarioId) {
    case "ldn-q1-design":
      return {
        office: "LDN",
        from: "2026-01-01",
        to: "2026-03-31",
        view: "department",
        department: "Design"
      };
    case "ucs04787":
      return jobScope("LDN", "UCS04787");
    case "ucs05186":
      return jobScope("LDN", "UCS05186");
    case "ucs04154":
      return jobScope("LDN", "UCS04154");
    case "pcs00250":
      return jobScope("LDN", "PCS00250");
    case "usa00262":
      return jobScope("USA", "USA00262");
    case "usa00323":
      return jobScope("USA", "USA00323");
    case "bt-raw-without-cache":
      return {
        office: "LDN",
        from: "2026-01-01",
        to: "2026-12-31",
        view: "float",
        client: "BT Group"
      };
    case "tbc-pipeline-identity":
      return {
        office: "Agency",
        from: "2026-01-01",
        to: "2026-12-31",
        view: "pipeline"
      };
    case "exact-client-drilldown":
      return {
        office: "Agency",
        from: "2026-01-01",
        to: "2026-12-31",
        view: "client"
      };
    case "archived-production-revenue":
    default:
      return {
        office: "Agency",
        from: "2026-01-01",
        to: "2026-12-31",
        view: "project"
      };
  }
}

function jobScope(office: NamedScenarioScope["office"], jobNumber: string): NamedScenarioScope {
  return {
    office,
    from: "2026-01-01",
    to: "2026-12-31",
    view: "project",
    jobNumber
  };
}

function sourceSnapshotRefsFor(
  scenarioId: string,
  sourceEvidence: NamedScenarioSourceEvidence
): NamedScenarioSourceSnapshotRef[] {
  if (sourceEvidence.status !== "ready") return [];

  const refs: NamedScenarioSourceSnapshotRef[] = [
    { layer: "source_snapshot", ref: sourceEvidence.snapshotId },
    { layer: "float_manifest", ref: sourceEvidence.floatTargetManifest.manifestStableSourceRowKey }
  ];
  const scenarioCode = scenarioCodeForId(scenarioId);

  if (scenarioCode !== undefined) {
    const rowEvidence = sourceEvidence.scenarioSourceEvidence?.find((item) =>
      sameScenarioCode(item.scenarioCode, scenarioCode)
    );
    for (const sourceRowKey of rowEvidence?.sourceRowKeys ?? []) {
      refs.push({ layer: "source_row", ref: sourceRowKey });
    }

    const floatLayerEvidence = sourceEvidence.floatLayerEvidence.find((item) =>
      sameScenarioCode(item.scenarioCode, scenarioCode)
    );
    for (const sourceRowKey of floatLayerEvidence?.sourceRowKeys ?? []) {
      refs.push({ layer: "float_layer", ref: sourceRowKey });
    }
  }

  return uniqueRefs(refs);
}

function scenarioCodeForId(scenarioId: string): string | undefined {
  switch (scenarioId) {
    case "ucs04787":
      return "UCS04787";
    case "ucs05186":
      return "UCS05186";
    case "ucs04154":
      return "UCS04154";
    case "pcs00250":
      return "PCS00250";
    case "usa00262":
      return "USA00262";
    case "usa00323":
      return "USA00323";
    case "bt-raw-without-cache":
      return "BT";
    default:
      return undefined;
  }
}

function uniqueRefs(refs: readonly NamedScenarioSourceSnapshotRef[]): NamedScenarioSourceSnapshotRef[] {
  const seen = new Set<string>();
  const unique: NamedScenarioSourceSnapshotRef[] = [];
  for (const ref of refs) {
    const key = `${ref.layer}:${ref.ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ref);
  }
  return unique;
}

function displayContractResultFor(scenario: NamedScenarioCoreResult): NamedScenarioEvidenceResult {
  if (scenario.classification === "display_contract_agrees") {
    return {
      status: scenario.status === "pass" ? "pass" : "warn",
      sourceLayer: "display_contract",
      basis: "Display contract parity checks are part of this named scenario."
    };
  }

  const deterministicDisplayProof = deterministicDisplayProofFor(scenario.id);
  if (deterministicDisplayProof !== undefined) {
    return deterministicDisplayProof;
  }

  if (scenario.warningEvidence?.displayContractRowStatus === "represented") {
    return {
      status: "pass",
      sourceLayer: "display_contract",
      basis: "Warning evidence includes a represented display-contract row."
    };
  }

  if (scenario.warningEvidence?.displayContractRowStatus === "missing") {
    return {
      status: "warn",
      sourceLayer: "display_contract",
      basis: "Warning evidence says the display-contract row is missing."
    };
  }

  return {
    status: "not_checked",
    sourceLayer: "display_contract",
    basis: "This scenario has not yet been tied to a display-contract row."
  };
}

function deterministicDisplayProofFor(scenarioId: string): NamedScenarioEvidenceResult | undefined {
  switch (scenarioId) {
    case "ucs04154":
      return {
        status: "pass",
        sourceLayer: "display_contract",
        basis: "Deterministic display contract includes the UCS04154 fee-sheet Float ID join row."
      };
    case "usa00262":
      return {
        status: "pass",
        sourceLayer: "display_contract",
        basis: "Deterministic USA display contract includes USA00262 with nonzero sold hours."
      };
    case "usa00323":
      return {
        status: "pass",
        sourceLayer: "display_contract",
        basis: "Deterministic USA display contract includes USA00323 with nonzero sold hours."
      };
    case "tbc-pipeline-identity":
      return {
        status: "pass",
        sourceLayer: "display_contract",
        basis: "Deterministic Projects display contract keeps TBC pipeline rows as source-only rows."
      };
    case "archived-production-revenue":
      return {
        status: "pass",
        sourceLayer: "display_contract",
        basis: "Deterministic Projects display contract keeps archived production revenue visible as source-only revenue."
      };
    default:
      return undefined;
  }
}

function uiSurfaceResultFor(scenario: NamedScenarioCoreResult): NamedScenarioEvidenceResult {
  return {
    status: "pass",
    sourceLayer: "data_quality_ui",
    basis: `Data Quality renders ${scenario.id} from the named scenario report, not a static copy.`
  };
}

function csvResultFor(scenario: NamedScenarioCoreResult): NamedScenarioEvidenceResult {
  if (scenario.id === "ldn-q1-design" || scenario.id === "exact-client-drilldown" || scenario.id === "archived-production-revenue") {
    return {
      status: scenario.status === "pass" ? "pass" : "warn",
      sourceLayer: "display_contract_csv",
      basis: "CSV parity is part of this stakeholder scenario."
    };
  }

  return {
    status: "not_applicable",
    sourceLayer: "display_contract_csv",
    basis: "CSV parity is not the active evidence layer for this named scenario."
  };
}

function chatEvidenceResultFor(scenario: NamedScenarioCoreResult): NamedScenarioEvidenceResult {
  if (scenario.status !== "pass") {
    return {
      status: "needs_codex",
      sourceLayer: "chat_evidence_pack",
      basis: "Chat must hand this warning to Codex until the evidence pack is complete."
    };
  }

  return {
    status: "not_applicable",
    sourceLayer: "chat_evidence_pack",
    basis: "Chat evidence is not required to make this scenario pass."
  };
}

function warningsFor(scenario: NamedScenarioCoreResult): string[] {
  return scenario.checks
    .filter((check) => check.status === "warn")
    .map((check) => `${check.code}: ${check.evidence}`);
}

function unresolvedConflictsFor(
  scenario: NamedScenarioCoreResult,
  sourceEvidence: NamedScenarioSourceEvidence
): string[] {
  const conflicts: string[] = [];

  if (sourceEvidence.status !== "ready") {
    conflicts.push("Source snapshot evidence is missing.");
  }

  for (const check of scenario.checks) {
    if (check.status === "warn") conflicts.push(`${check.code}: ${check.evidence}`);
  }

  if (scenario.warningEvidence?.classification === "unresolved") {
    conflicts.push("Warning evidence is classified as unresolved.");
  }

  return conflicts;
}

function approvalStatusFor(
  scenario: NamedScenarioCoreResult,
  sourceEvidence: NamedScenarioSourceEvidence,
  evidenceResults: readonly NamedScenarioEvidenceResult[]
): NamedScenarioApprovalStatus {
  if (sourceEvidence.status !== "ready") return "blocked_source_evidence";
  if (scenario.status !== "pass") return "blocked_warning";
  if (evidenceResults.some((result) => result.status === "not_checked" || result.status === "needs_codex" || result.status === "unresolved")) {
    return "blocked_evidence_gap";
  }
  if (evidenceResults.some((result) => result.status === "warn")) return "blocked_warning";
  return "ready_for_stakeholder_review";
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

export function buildScenarioSourceEvidenceFromSnapshot(
  snapshot: unknown,
  scenarioCodes: readonly string[] = sourceBackedScenarioCodes
): NamedScenarioSourceRowEvidence[] {
  const record = asRecord(snapshot);
  if (record === undefined) return [];

  return scenarioCodes.map((scenarioCode) => {
    const sources: string[] = [];
    const sourceRowKeys: string[] = [];
    for (const source of arrayRecords(record.sources)) {
      const sourceName = stringValue(source.source) ?? "unknown";
      for (const row of arrayRecords(source.rows)) {
        if (!rowMatchesScenarioCode(row, scenarioCode)) continue;

        addUnique(sources, sourceName);
        const sourceRowKey = stableSourceRowKeyFor(row);
        if (sourceRowKey !== undefined) addUnique(sourceRowKeys, sourceRowKey);
      }
    }

    return {
      scenarioCode,
      sources,
      sourceRowKeys,
      rowCount: sourceRowKeys.length
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

function withSourceRowEvidenceCheck(
  checks: readonly NamedScenarioCheck[],
  sourceEvidence: NamedScenarioSourceEvidence,
  scenarioCode: string
): NamedScenarioCheck[] {
  if (sourceEvidence.status !== "ready") return [...checks];

  const rowEvidence = sourceEvidence.scenarioSourceEvidence?.find((item) =>
    sameScenarioCode(item.scenarioCode, scenarioCode)
  );
  if (rowEvidence !== undefined && rowEvidence.rowCount > 0) {
    return [
      ...checks,
      pass(
        "source_snapshot_scenario_rows_present",
        `Source snapshot contains ${rowEvidence.rowCount} raw rows for ${scenarioCode} across ${rowEvidence.sources.join(", ")}.`
      )
    ];
  }

  return [
    ...checks,
    warn(
      "source_snapshot_scenario_rows_missing",
      `Source snapshot is ready but contains no raw rows for ${scenarioCode}; this false-zero guard cannot be approval-pass until targeted source rows are captured.`
    )
  ];
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

function rowMatchesScenarioCode(row: Record<string, unknown>, scenarioCode: string): boolean {
  return JSON.stringify(row).toUpperCase().includes(normalizeScenarioCode(scenarioCode));
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
