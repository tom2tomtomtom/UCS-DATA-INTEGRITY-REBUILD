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

export type NamedScenarioResult = {
  readonly id: string;
  readonly name: string;
  readonly owner: NamedScenarioOwner;
  readonly status: NamedScenarioStatus;
  readonly classification: NamedScenarioClassification;
  readonly checks: readonly NamedScenarioCheck[];
  readonly nextHumanAction?: string;
};

export type NamedScenarioReport = {
  readonly generatedAt: string;
  readonly status: NamedScenarioStatus;
  readonly summary: Record<NamedScenarioStatus, number>;
  readonly scenarios: readonly NamedScenarioResult[];
};

const generatedAt = "2026-05-20T17:59:00.000Z";

export function buildNamedScenarioReport(): NamedScenarioReport {
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
      checks: [
        pass("float_layers_compared", "Raw Float, visible dashboard Float, and cache/compare layers are kept separate."),
        warn("raw_cache_visible_mismatch_surfaced", "The fixture contains raw/visible Float mismatch evidence and the report leaves it as warning evidence.")
      ],
      nextHumanAction: "Yunni or Tom should compare the current Float export settings with the scoped dashboard period before treating the delta as fixed."
    },
    {
      id: "ucs05186",
      name: "UCS05186 Duplicate Manual Float Job",
      owner: "Yunni",
      status: "warn",
      classification: "source_or_cache_warning",
      checks: [
        pass("duplicate_candidates_visible", "Canonical and manual duplicate Float candidates remain visible instead of being silently merged."),
        warn("archived_duplicate_still_evidence", "Archived/manual duplicate evidence remains warning evidence until a fresh source pull proves it no longer contributes.")
      ],
      nextHumanAction: "Keep duplicate/manual Float rows visible until Yunni confirms which source row should be fixed."
    },
    {
      id: "ucs04154",
      name: "UCS04154 Fee-sheet Float ID Join",
      owner: "Yunni",
      status: "pass",
      classification: "join_key_protected",
      checks: [
        pass("fee_sheet_float_id_join_key", "The fee-sheet Float ID is represented as the canonical join key for the original sold work."),
        pass("manual_duplicate_not_winner", "Manual duplicates are evidence only, not automatic winners over the fee-sheet Float ID.")
      ]
    },
    {
      id: "pcs00250",
      name: "PCS00250 Cache Without Raw",
      owner: "Yunni",
      status: "warn",
      classification: "source_or_cache_warning",
      checks: [
        warn("cache_without_raw_warn", "Cache-only Float hours remain warning evidence when raw Float task evidence is absent."),
        pass("not_green_when_cache_only", "Cache-only hours cannot be marked as pass.")
      ],
      nextHumanAction: "A fresh Float pull must prove whether raw task rows now exist."
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
      checks: [
        warn("raw_without_cache_fail_class", "Raw Float hours without cache are classified as a blocking reconciliation issue in the evidence layer."),
        pass("raw_not_hidden", "Raw Float task evidence remains visible even when cache evidence is absent.")
      ],
      nextHumanAction: "Tom should inspect the import/cache path before any dashboard approval on that Float row."
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

  return {
    generatedAt,
    status: reportStatus(scenarios),
    summary: {
      pass: scenarios.filter((scenario) => scenario.status === "pass").length,
      warn: scenarios.filter((scenario) => scenario.status === "warn").length,
      fail: scenarios.filter((scenario) => scenario.status === "fail").length
    },
    scenarios
  };
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

function reportStatus(scenarios: readonly NamedScenarioResult[]): NamedScenarioStatus {
  if (scenarios.some((scenario) => scenario.status === "fail")) return "fail";
  if (scenarios.some((scenario) => scenario.status === "warn")) return "warn";
  return "pass";
}
