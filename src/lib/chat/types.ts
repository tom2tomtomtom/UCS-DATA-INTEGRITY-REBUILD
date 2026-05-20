import type {
  DashboardProjectRow,
  DashboardScope,
  MetricValue,
  SourceLayer,
  SourceTraceRef,
  UnsupportedMetric
} from "../index";

export type ChatConfidence = "high" | "medium" | "low";

export type ChatToolName =
  | "get_display_contract"
  | "inspect_project"
  | "query_projects"
  | "inspect_source_trace"
  | "inspect_fee_sheet"
  | "inspect_float_project"
  | "inspect_float_raw_cache_visible"
  | "inspect_pipeline_rows"
  | "inspect_production_revenue_rows"
  | "inspect_sync_freshness"
  | "inspect_warning_lifecycle"
  | "run_integrity_check"
  | "parse_pasted_float_export"
  | "compare_float_export_to_contract";

export type ChatToolRunStatus = "pass" | "warn" | "fail" | "unresolved" | "error";

export type ChatToolRun = {
  readonly tool: ChatToolName;
  readonly label: string;
  readonly status: ChatToolRunStatus;
  readonly sourceLayers: readonly SourceLayer[];
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly warnings: readonly string[];
  readonly error?: string;
};

export type EvidenceFact = {
  readonly id: string;
  readonly label: string;
  readonly sourceLayer: SourceLayer;
  readonly value?: MetricValue;
  readonly sourceRefs: readonly SourceTraceRef[];
  readonly contractRowId?: string;
  readonly note?: string;
};

export type EvidenceCheckStatus = "pass" | "warn" | "fail" | "unresolved";

export type EvidenceCheck = {
  readonly id: string;
  readonly label: string;
  readonly status: EvidenceCheckStatus;
  readonly sourceLayers: readonly SourceLayer[];
  readonly sourceRefs: readonly SourceTraceRef[];
  readonly expected?: MetricValue;
  readonly actual?: MetricValue;
  readonly contractRowId?: string;
  readonly message?: string;
};

export type UnresolvedCheck = {
  readonly code: string;
  readonly label: string;
  readonly reason: string;
  readonly requiredTool?: ChatToolName;
  readonly sourceLayers: readonly SourceLayer[];
};

export type NeedsCodexTrigger =
  | "code"
  | "browser"
  | "mutation"
  | "sync"
  | "deploy"
  | "stakeholder"
  | "incomplete_evidence";

export type NeedsCodexDecision = {
  readonly needed: boolean;
  readonly reason: string;
  readonly triggers: readonly NeedsCodexTrigger[];
  readonly suggestedCodexTask?: string;
};

export type EvidencePack = {
  readonly question: string;
  readonly scope: DashboardScope;
  readonly playbook: string;
  readonly toolsRun: readonly ChatToolRun[];
  readonly sourceLayers: readonly SourceLayer[];
  readonly contractRows: readonly DashboardProjectRow[];
  readonly facts: readonly EvidenceFact[];
  readonly checks: readonly EvidenceCheck[];
  readonly unsupported: readonly UnsupportedMetric[];
  readonly unresolved: readonly UnresolvedCheck[];
  readonly warnings: readonly string[];
  readonly confidence: ChatConfidence;
  readonly needsCodex: NeedsCodexDecision;
};

export type ChatStreamEvent =
  | { readonly type: "status"; readonly message: string }
  | { readonly type: "investigation"; readonly playbook: string; readonly tasks: readonly string[] }
  | { readonly type: "tool_start"; readonly tool: ChatToolName; readonly label: string }
  | { readonly type: "tool_result"; readonly tool: ChatToolName; readonly status: ChatToolRunStatus }
  | {
      readonly type: "evidence";
      readonly sourcesChecked: readonly SourceLayer[];
      readonly confidence: ChatConfidence;
      readonly warnings: readonly string[];
    }
  | {
      readonly type: "needs_codex";
      readonly needed: boolean;
      readonly reason: string;
      readonly triggers: readonly NeedsCodexTrigger[];
    }
  | { readonly type: "text"; readonly delta: string }
  | { readonly type: "error"; readonly message: string };
