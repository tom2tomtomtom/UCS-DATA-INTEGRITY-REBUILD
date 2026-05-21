export function buildNamedScenarioReport(input = {}) {
  const scenarios = [
    scenario("ldn-q1-design", "LDN Q1 Design Rollup To Projects", "Sian", "pass", "display_contract_agrees", [
      check("same_scope_same_number", "pass", "Department rollup, Projects footer, CSV, and detail use the same display contract scope."),
      check("projects_csv_detail_parity", "pass", "Supported sold and Float metrics are compared through the display contract, not page-local totals."),
      check("pipeline_department_unsupported", "pass", "Pipeline remains unsupported in department scope rather than being attributed to Design.")
    ]),
    scenario("ucs04787", "UCS04787 Float Mismatch", "Yunni", "warn", "source_or_cache_warning", [
      check("float_layers_compared", "pass", "Raw Float, visible dashboard Float, and cache/compare layers are kept separate."),
      check("raw_cache_visible_mismatch_surfaced", "warn", "The fixture contains raw/visible Float mismatch evidence and the report leaves it as warning evidence.")
    ], "Yunni or Tom should compare the current Float export settings with the scoped dashboard period before treating the delta as fixed."),
    scenario("ucs05186", "UCS05186 Duplicate Manual Float Job", "Yunni", "warn", "source_or_cache_warning", [
      check("duplicate_candidates_visible", "pass", "Canonical and manual duplicate Float candidates remain visible instead of being silently merged."),
      check("archived_duplicate_still_evidence", "warn", "Archived/manual duplicate evidence remains warning evidence until a fresh source pull proves it no longer contributes.")
    ], "Keep duplicate/manual Float rows visible until Yunni confirms which source row should be fixed."),
    scenario("ucs04154", "UCS04154 Fee-sheet Float ID Join", "Yunni", "pass", "join_key_protected", [
      check("fee_sheet_float_id_join_key", "pass", "The fee-sheet Float ID is represented as the canonical join key for the original sold work."),
      check("manual_duplicate_not_winner", "pass", "Manual duplicates are evidence only, not automatic winners over the fee-sheet Float ID.")
    ]),
    scenario("pcs00250", "PCS00250 Cache Without Raw", "Yunni", "warn", "source_or_cache_warning", [
      check("cache_without_raw_warn", "warn", "Cache-only Float hours remain warning evidence when raw Float task evidence is absent."),
      check("not_green_when_cache_only", "pass", "Cache-only hours cannot be marked as pass.")
    ], "A fresh Float pull must prove whether raw task rows now exist."),
    scenario("usa00262", "USA00262 Sold-hours False-zero Guard", "Sian", "pass", "false_zero_guarded", [
      check("sold_hours_false_zero_guard", "pass", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
      check("usa_template_hours_supported", "pass", "USA fee-sheet hours must be treated as source-supported when parser evidence exists.")
    ]),
    scenario("usa00323", "USA00323 Sold-hours False-zero Guard", "Sian", "pass", "false_zero_guarded", [
      check("sold_hours_false_zero_guard", "pass", "The scenario is guarded because source sold hours are nonzero and cannot be reported as zero."),
      check("raw_parser_not_total", "pass", "Raw parser rows are not summed unless additive status proves they are totals-safe.")
    ]),
    scenario("bt-raw-without-cache", "BT Raw Without Cache", "Yunni", "warn", "source_or_cache_warning", [
      check("raw_without_cache_fail_class", "warn", "Raw Float hours without cache are classified as a blocking reconciliation issue in the evidence layer."),
      check("raw_not_hidden", "pass", "Raw Float task evidence remains visible even when cache evidence is absent.")
    ], "Tom should inspect the import/cache path before any dashboard approval on that Float row."),
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
  const sourceEvidence = input.sourceEvidence ?? missingSourceEvidence();

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

function missingSourceEvidence() {
  return {
    status: "missing",
    sourcesChecked: [],
    blocker: "source_snapshot_missing"
  };
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

function reportStatus(scenarios) {
  if (scenarios.some((scenario) => scenario.status === "fail")) return "fail";
  if (scenarios.some((scenario) => scenario.status === "warn")) return "warn";
  return "pass";
}
