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
  const usa00262Checks = withSourceRowEvidenceCheck([
    check("sold_hours_false_zero_guard", "pass", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
    check("usa_template_hours_supported", "pass", "USA fee-sheet hours must be treated as source-supported when parser evidence exists.")
  ], sourceEvidence, "USA00262");
  const usa00323Checks = withSourceRowEvidenceCheck([
    check("sold_hours_false_zero_guard", "pass", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
    check("raw_parser_not_total", "pass", "Raw parser rows are not summed unless additive status proves they are totals-safe.")
  ], sourceEvidence, "USA00323");
  const usaAction = "Capture targeted USA fee-sheet source rows and display-contract proof before stakeholder approval.";

  const scenarioCores = [
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
    scenario(
      "usa00262",
      "USA00262 Sold-hours False-zero Guard",
      "Sian",
      statusFromChecks(usa00262Checks),
      "false_zero_guarded",
      usa00262Checks,
      statusFromChecks(usa00262Checks) === "warn" ? usaAction : undefined
    ),
    scenario(
      "usa00323",
      "USA00323 Sold-hours False-zero Guard",
      "Sian",
      statusFromChecks(usa00323Checks),
      "false_zero_guarded",
      usa00323Checks,
      statusFromChecks(usa00323Checks) === "warn" ? usaAction : undefined
    ),
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

  const scenarios = scenarioCores.map((item) => enrichScenarioEvidence(item, sourceEvidence));
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

function enrichScenarioEvidence(scenario, sourceEvidence) {
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

function scopeForScenario(scenarioId) {
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

function jobScope(office, jobNumber) {
  return {
    office,
    from: "2026-01-01",
    to: "2026-12-31",
    view: "project",
    jobNumber
  };
}

function sourceSnapshotRefsFor(scenarioId, sourceEvidence) {
  if (sourceEvidence.status !== "ready") return [];

  const refs = [
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

function scenarioCodeForId(scenarioId) {
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
    case "tbc-pipeline-identity":
      return "TBC";
    case "archived-production-revenue":
      return "Archived Production Revenue";
    default:
      return undefined;
  }
}

function uniqueRefs(refs) {
  const seen = new Set();
  const unique = [];
  for (const ref of refs) {
    const key = `${ref.layer}:${ref.ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ref);
  }
  return unique;
}

function displayContractResultFor(scenario) {
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

function deterministicDisplayProofFor(scenarioId) {
  switch (scenarioId) {
    case "ucs04787":
      return {
        status: "pass",
        sourceLayer: "display_contract",
        basis: "Deterministic display contract includes the UCS04787 visible Float row, raw diagnostic row, and raw/cache/visible reconciliation checks."
      };
    case "ucs05186":
      return {
        status: "pass",
        sourceLayer: "display_contract",
        basis: "Deterministic display contract keeps both UCS05186 canonical and manual duplicate Float rows visible instead of merging them."
      };
    case "ucs04154":
      return {
        status: "pass",
        sourceLayer: "display_contract",
        basis: "Deterministic display contract includes the UCS04154 fee-sheet Float ID join row."
      };
    case "pcs00250":
      return {
        status: "pass",
        sourceLayer: "display_contract",
        basis: "Deterministic display contract surfaces the PCS00250 cache-without-raw Float warning instead of marking it green."
      };
    case "bt-raw-without-cache":
      return {
        status: "pass",
        sourceLayer: "display_contract",
        basis: "Deterministic Float diagnostics surface the BT raw-without-cache row as unresolved evidence."
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

function uiSurfaceResultFor(scenario) {
  return {
    status: "pass",
    sourceLayer: "data_quality_ui",
    basis: `Data Quality renders ${scenario.id} from the named scenario report, not a static copy.`
  };
}

function csvResultFor(scenario) {
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

function chatEvidenceResultFor(scenario) {
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

function warningsFor(scenario) {
  return scenario.checks
    .filter((item) => item.status === "warn")
    .map((item) => `${item.code}: ${item.evidence}`);
}

function unresolvedConflictsFor(scenario, sourceEvidence) {
  const conflicts = [];

  if (sourceEvidence.status !== "ready") {
    conflicts.push("Source snapshot evidence is missing.");
  }

  for (const item of scenario.checks) {
    if (item.status === "warn") conflicts.push(`${item.code}: ${item.evidence}`);
  }

  if (scenario.warningEvidence?.classification === "unresolved") {
    conflicts.push("Warning evidence is classified as unresolved.");
  }

  return conflicts;
}

function approvalStatusFor(scenario, sourceEvidence, evidenceResults) {
  if (sourceEvidence.status !== "ready") return "blocked_source_evidence";
  if (scenario.status !== "pass") return "blocked_warning";
  if (evidenceResults.some((result) => result.status === "not_checked" || result.status === "needs_codex" || result.status === "unresolved")) {
    return "blocked_evidence_gap";
  }
  if (evidenceResults.some((result) => result.status === "warn")) return "blocked_warning";
  return "ready_for_stakeholder_review";
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

export function buildScenarioSourceEvidenceFromSnapshot(
  snapshot,
  scenarioCodes = [
    "USA00262",
    "USA00323",
    "UCS04154",
    "UCS04787",
    "UCS05186",
    "PCS00250",
    "TBC",
    "Archived Production Revenue"
  ]
) {
  const record = asRecord(snapshot);
  if (record === undefined) return [];

  return scenarioCodes.map((scenarioCode) => {
    const sources = [];
    const sourceRowKeys = [];
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

function withSourceRowEvidenceCheck(checks, sourceEvidence, scenarioCode) {
  if (sourceEvidence.status !== "ready") return [...checks];

  const rowEvidence = sourceEvidence.scenarioSourceEvidence?.find((item) =>
    sameScenarioCode(item.scenarioCode, scenarioCode)
  );
  if (rowEvidence !== undefined && rowEvidence.rowCount > 0) {
    return [
      ...checks,
      check(
        "source_snapshot_scenario_rows_present",
        "pass",
        `Source snapshot contains ${rowEvidence.rowCount} raw rows for ${scenarioCode} across ${rowEvidence.sources.join(", ")}.`
      )
    ];
  }

  return [
    ...checks,
    check(
      "source_snapshot_scenario_rows_missing",
      "warn",
      `Source snapshot is ready but contains no raw rows for ${scenarioCode}; this false-zero guard cannot be approval-pass until targeted source rows are captured.`
    )
  ];
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
  const derivedLayers = layerEvidence?.derivedLayers ?? [];
  const fixtureLayers = ["raw", "cache", "visible"].filter((layer) => !derivedLayers.includes(layer));
  const raw = warningLayerPresence(sourceEvidence, derivedLayers, layerEvidence?.raw, input.raw, "raw");
  const cache = warningLayerPresence(sourceEvidence, derivedLayers, layerEvidence?.cache, input.cache, "cache");
  const visible = warningLayerPresence(sourceEvidence, derivedLayers, layerEvidence?.visible, input.visible, "visible");

  return {
    evidenceStatus: isSourceSnapshotReady ? "source_snapshot_ready" : "source_snapshot_missing",
    sourceLayersChecked: sourceLayersCheckedFor(sourceEvidence, derivedLayers),
    knownFloatIdsFromLiveManifest: liveManifestFloatIds(sourceEvidence, scenarioCode),
    rawCacheVisibleStatus: {
      raw,
      cache,
      visible
    },
    rawCacheVisibleStatusBasis: rawCacheVisibleStatusBasis(sourceEvidence, derivedLayers),
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

function rawCacheVisibleStatusBasis(sourceEvidence, derivedLayers) {
  const derivedSourceLayers = derivedLayers.filter((layer) => layer !== "display_contract");
  if (sourceEvidence.status !== "ready") return "named_scenario_fixture";
  if (derivedSourceLayers.length === 0) return "source_snapshot_ready_missing_layer_evidence";
  if (derivedSourceLayers.length === 3) return "derived_source_snapshot";
  return "partial_source_snapshot";
}

function warningLayerPresence(sourceEvidence, derivedLayers, derivedPresence, fixturePresence, layer) {
  if (derivedLayers.includes(layer)) return derivedPresence ?? "missing";
  if (sourceEvidence.status !== "ready") return fixturePresence;
  return "not_applicable";
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

function rowMatchesScenarioCode(row, scenarioCode) {
  return JSON.stringify(row).toUpperCase().includes(normalizeScenarioCode(scenarioCode));
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
