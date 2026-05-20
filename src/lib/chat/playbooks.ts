import type { ChatToolName, NeedsCodexTrigger } from "./types";
import type { SourceLayer } from "../index";

export type ChatPlaybookId =
  | "float_hours_mismatch"
  | "wrong_float_join_key"
  | "fee_sheet_sold_hours_mismatch"
  | "project_visibility_archive_search"
  | "department_rollup_missing_hours"
  | "sheet_health_false_positive"
  | "scope_drilldown_mismatch"
  | "csv_projects_mismatch"
  | "source_only_identification"
  | "sync_freshness"
  | "dashboard_scan"
  | "needs_codex_handoff";

export type ChatPlaybook = {
  readonly id: ChatPlaybookId;
  readonly label: string;
  readonly tasks: readonly string[];
  readonly requiredTools: readonly ChatToolName[];
  readonly optionalTools: readonly ChatToolName[];
  readonly requiredSourceLayers: readonly SourceLayer[];
  readonly forbiddenClaims: readonly string[];
  readonly confidenceRules: readonly string[];
  readonly needsCodexTriggers: readonly NeedsCodexTrigger[];
};

const sharedConfidenceRules = [
  "missing required tool output becomes unresolved",
  "tool errors lower confidence",
  "unresolved required checks lower confidence"
] as const;

const playbooks: Record<ChatPlaybookId, ChatPlaybook> = {
  float_hours_mismatch: {
    id: "float_hours_mismatch",
    label: "Float hours mismatch",
    tasks: [
      "read the visible display contract",
      "inspect the project row",
      "compare raw, cache, visible, and pasted export Float evidence",
      "report conflicts as unresolved unless every required layer is present"
    ],
    requiredTools: [
      "get_display_contract",
      "inspect_project",
      "inspect_float_raw_cache_visible",
      "parse_pasted_float_export",
      "compare_float_export_to_contract"
    ],
    optionalTools: ["inspect_float_project", "inspect_source_trace"],
    requiredSourceLayers: ["float_raw", "float_cache", "float_visible", "float_export"],
    forbiddenClaims: [
      "float_mismatch_without_all_layers",
      "dashboard_bug_without_failed_check",
      "high_confidence_with_missing_export"
    ],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  wrong_float_join_key: {
    id: "wrong_float_join_key",
    label: "Missing or duplicated Float join key",
    tasks: [
      "read fee-sheet Float ID from the display evidence",
      "inspect matching Float rows",
      "surface duplicates as source conflicts"
    ],
    requiredTools: ["get_display_contract", "inspect_project", "inspect_float_raw_cache_visible"],
    optionalTools: ["inspect_source_trace", "inspect_float_project"],
    requiredSourceLayers: ["sold", "float_visible", "float_raw", "float_cache"],
    forbiddenClaims: ["silent_float_id_autocorrection", "archive_as_deletion"],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  fee_sheet_sold_hours_mismatch: {
    id: "fee_sheet_sold_hours_mismatch",
    label: "Fee-sheet sold hours mismatch",
    tasks: [
      "read display contract sold row",
      "inspect fee-sheet parser summary",
      "compare additive sold facts with visible sold hours",
      "block false zero-hours claims"
    ],
    requiredTools: ["get_display_contract", "inspect_project", "inspect_fee_sheet"],
    optionalTools: ["inspect_source_trace"],
    requiredSourceLayers: ["sold", "fee_sheet_parser_summary"],
    forbiddenClaims: [
      "zero_hours_when_source_or_contract_nonzero",
      "raw_parser_total_without_additive_proof",
      "dashboard_bug_without_failed_check"
    ],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  project_visibility_archive_search: {
    id: "project_visibility_archive_search",
    label: "Project visibility, archive, and search",
    tasks: [
      "read contract rows for current scope",
      "query visible projects",
      "inspect warning lifecycle for archived or source-only evidence"
    ],
    requiredTools: ["get_display_contract", "query_projects", "inspect_warning_lifecycle"],
    optionalTools: ["inspect_source_trace"],
    requiredSourceLayers: ["sold", "pipeline", "production_revenue", "float_visible"],
    forbiddenClaims: ["archive_as_deletion", "source_only_hidden_as_irrelevant"],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  department_rollup_missing_hours: {
    id: "department_rollup_missing_hours",
    label: "Department Roll Up loses hours",
    tasks: [
      "read scoped display contract",
      "compare rollup rows with project rows",
      "mark unsupported role or department attribution as unsupported"
    ],
    requiredTools: ["get_display_contract", "query_projects", "run_integrity_check"],
    optionalTools: ["inspect_source_trace"],
    requiredSourceLayers: ["sold", "float_visible"],
    forbiddenClaims: ["unsupported_as_zero", "dashboard_bug_without_failed_check"],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  sheet_health_false_positive: {
    id: "sheet_health_false_positive",
    label: "Sheet Health false positive",
    tasks: [
      "inspect fee-sheet warnings",
      "compare parser summary with visible display warnings",
      "avoid formula-error claims without parser evidence"
    ],
    requiredTools: ["get_display_contract", "inspect_fee_sheet", "inspect_warning_lifecycle"],
    optionalTools: ["inspect_source_trace"],
    requiredSourceLayers: ["sold", "fee_sheet_parser_summary"],
    forbiddenClaims: ["formula_error_without_parser_warning", "dashboard_bug_without_failed_check"],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  scope_drilldown_mismatch: {
    id: "scope_drilldown_mismatch",
    label: "Scoped rollup and drilldown mismatch",
    tasks: [
      "read scoped display contract",
      "compare rollup row, Projects rows, footer, and CSV scope",
      "show unsupported pipeline or production slices instead of zero"
    ],
    requiredTools: ["get_display_contract", "query_projects", "run_integrity_check"],
    optionalTools: ["inspect_source_trace"],
    requiredSourceLayers: ["sold", "pipeline", "production_revenue", "float_visible"],
    forbiddenClaims: ["unsupported_as_zero", "dashboard_bug_without_failed_check"],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  csv_projects_mismatch: {
    id: "csv_projects_mismatch",
    label: "CSV and Projects mismatch",
    tasks: ["read display contract rows", "compare visible rows with CSV rows", "report source trace for mismatches"],
    requiredTools: ["get_display_contract", "query_projects", "run_integrity_check"],
    optionalTools: ["inspect_source_trace"],
    requiredSourceLayers: ["sold", "pipeline", "production_revenue", "float_visible"],
    forbiddenClaims: ["csv_specific_total", "dashboard_bug_without_failed_check"],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  source_only_identification: {
    id: "source_only_identification",
    label: "Source-only row identification",
    tasks: ["read contract rows", "list source-only rows", "explain source refs and unsupported fields"],
    requiredTools: ["get_display_contract", "query_projects", "inspect_source_trace"],
    optionalTools: ["inspect_warning_lifecycle"],
    requiredSourceLayers: ["pipeline", "production_revenue", "float_visible"],
    forbiddenClaims: ["source_only_hidden_as_irrelevant", "unsupported_as_zero"],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  sync_freshness: {
    id: "sync_freshness",
    label: "Sync freshness",
    tasks: ["inspect sync evidence", "read display contract timestamp", "report stale or failed checks as unresolved"],
    requiredTools: ["get_display_contract", "inspect_sync_freshness"],
    optionalTools: ["inspect_warning_lifecycle"],
    requiredSourceLayers: ["sync_log"],
    forbiddenClaims: ["guarantee_without_sync_evidence"],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  dashboard_scan: {
    id: "dashboard_scan",
    label: "Dashboard scan",
    tasks: [
      "read visible display contract",
      "query current projects",
      "inspect warning lifecycle",
      "run deterministic integrity checks"
    ],
    requiredTools: ["get_display_contract", "query_projects", "inspect_warning_lifecycle", "run_integrity_check"],
    optionalTools: ["inspect_source_trace"],
    requiredSourceLayers: ["sold", "pipeline", "production_revenue", "float_visible"],
    forbiddenClaims: [
      "dashboard_bug_without_failed_check",
      "zero_hours_when_source_or_contract_nonzero",
      "unsupported_as_zero"
    ],
    confidenceRules: sharedConfidenceRules,
    needsCodexTriggers: ["incomplete_evidence"]
  },
  needs_codex_handoff: {
    id: "needs_codex_handoff",
    label: "Needs Codex handoff",
    tasks: ["explain why chat cannot complete this request", "name the Codex handoff task"],
    requiredTools: [],
    optionalTools: [],
    requiredSourceLayers: [],
    forbiddenClaims: ["mutation_from_chat", "deploy_from_chat", "browser_test_from_chat"],
    confidenceRules: ["handoff requests do not need dashboard confidence"],
    needsCodexTriggers: ["code"]
  }
};

export function getPlaybook(id: ChatPlaybookId): ChatPlaybook {
  return playbooks[id];
}

export function routePlaybook(question: string): ChatPlaybook {
  const normalised = question.toLowerCase();
  const handoff = handoffTriggers(normalised);

  if (handoff.length > 0) {
    return {
      ...playbooks.needs_codex_handoff,
      needsCodexTriggers: handoff
    };
  }

  if (matchesAny(normalised, ["check against google", "google sheets", "fee sheet", "sold hours", "zero sold hours", "usa00262", "usa00323"])) {
    return playbooks.fee_sheet_sold_hours_mismatch;
  }

  if (matchesAny(normalised, ["float id", "join key", "duplicate float", "wrong float"])) {
    return playbooks.wrong_float_join_key;
  }

  if (matchesAny(normalised, ["float", "pcs00250", "ucs04787", "cache", "raw"])) {
    return playbooks.float_hours_mismatch;
  }

  if (matchesAny(normalised, ["ldn q1", "different numbers", "drilldown", "pipeline should only", "scope"])) {
    return playbooks.scope_drilldown_mismatch;
  }

  if (matchesAny(normalised, ["search", "archive", "visibility", "project view"])) {
    return playbooks.project_visibility_archive_search;
  }

  if (matchesAny(normalised, ["department roll", "roll up", "filter switch", "loses hours"])) {
    return playbooks.department_rollup_missing_hours;
  }

  if (matchesAny(normalised, ["sheet health", "formula error", "formula errors"])) {
    return playbooks.sheet_health_false_positive;
  }

  if (matchesAny(normalised, ["csv", "export"])) {
    return playbooks.csv_projects_mismatch;
  }

  if (matchesAny(normalised, ["source-only", "float-only", "orphan"])) {
    return playbooks.source_only_identification;
  }

  if (matchesAny(normalised, ["sync", "freshness", "last sync"])) {
    return playbooks.sync_freshness;
  }

  return playbooks.dashboard_scan;
}

function handoffTriggers(question: string): NeedsCodexTrigger[] {
  const triggers: NeedsCodexTrigger[] = [];

  if (matchesAny(question, ["code", "fix", "build", "implement"])) triggers.push("code");
  if (matchesAny(question, ["browser", "ui test", "open the browser"])) triggers.push("browser");
  if (matchesAny(question, ["archive", "delete", "write", "change source"])) triggers.push("mutation");
  if (question.includes("sync") && matchesAny(question, ["now", "run"])) triggers.push("sync");
  if (matchesAny(question, ["deploy", "railway"])) triggers.push("deploy");
  if (matchesAny(question, ["email", "stakeholder", "tell sian", "tell yunni", "tell jade"])) triggers.push("stakeholder");

  return [...new Set(triggers)];
}

function matchesAny(value: string, needles: readonly string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}
