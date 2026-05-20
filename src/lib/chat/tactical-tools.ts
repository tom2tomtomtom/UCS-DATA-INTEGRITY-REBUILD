import type {
  ChatToolName,
  ChatToolRunStatus,
  EvidenceCheck,
  EvidenceFact,
  UnresolvedCheck
} from "./types";
import type { DashboardProjectRow, DashboardScope, SourceLayer, UnsupportedMetric } from "../index";
import { getFixtureDashboardContract, fixtureFactSet } from "../ui/fixture-contract";
import { filterFactsByScope } from "../canon-queries/scope";
import type { ReconciliationCheck, SourceTraceRef } from "../canon/types";

export type ExecuteReadOnlyToolInput = {
  readonly tool: ChatToolName;
  readonly scope: DashboardScope;
  readonly jobNumber?: string;
  readonly floatProjectId?: string;
  readonly pastedFloatExport?: string;
};

export type ReadOnlyToolResult = {
  readonly tool: ChatToolName;
  readonly label: string;
  readonly status: ChatToolRunStatus;
  readonly sourceLayers: readonly SourceLayer[];
  readonly contractRows: readonly DashboardProjectRow[];
  readonly facts: readonly EvidenceFact[];
  readonly checks: readonly EvidenceCheck[];
  readonly unsupported: readonly UnsupportedMetric[];
  readonly unresolved: readonly UnresolvedCheck[];
  readonly warnings: readonly string[];
};

const readOnlyToolNames = [
  "get_display_contract",
  "inspect_project",
  "query_projects",
  "inspect_source_trace",
  "inspect_fee_sheet",
  "inspect_float_project",
  "inspect_float_raw_cache_visible",
  "inspect_pipeline_rows",
  "inspect_production_revenue_rows",
  "inspect_sync_freshness",
  "inspect_warning_lifecycle",
  "run_integrity_check",
  "parse_pasted_float_export",
  "compare_float_export_to_contract"
] as const satisfies readonly ChatToolName[];

export function listReadOnlyToolNames(): readonly ChatToolName[] {
  return readOnlyToolNames;
}

export function executeReadOnlyTool(input: ExecuteReadOnlyToolInput): ReadOnlyToolResult {
  if (input.tool === "get_display_contract") {
    return displayContractResult(input);
  }

  if (input.tool === "inspect_project") {
    return inspectProjectResult(input);
  }

  if (input.tool === "query_projects") {
    return queryProjectsResult(input);
  }

  if (input.tool === "inspect_float_raw_cache_visible") {
    return inspectFloatRawCacheVisibleResult(input);
  }

  if (input.tool === "parse_pasted_float_export") {
    return parsePastedFloatExportResult(input);
  }

  if (input.tool === "compare_float_export_to_contract") {
    return compareFloatExportResult(input);
  }

  if (input.tool === "inspect_fee_sheet") {
    return inspectFeeSheetResult(input);
  }

  return genericToolResult(input);
}

function displayContractResult(input: ExecuteReadOnlyToolInput): ReadOnlyToolResult {
  const contract = getFixtureDashboardContract(input.scope);
  const checks = contract.reconciliation.map(reconciliationToEvidenceCheck);

  return result({
    tool: input.tool,
    label: "Read display contract",
    status: statusFromChecks(checks, contract.warnings.length),
    sourceLayers: sourceLayersFromRows(contract.visibleRows),
    contractRows: contract.visibleRows,
    facts: factsFromRows(contract.visibleRows),
    checks,
    unsupported: contract.unsupported,
    warnings: contract.warnings.map((warning) => warning.message)
  });
}

function inspectProjectResult(input: ExecuteReadOnlyToolInput): ReadOnlyToolResult {
  const scope = {
    ...input.scope,
    ...(input.jobNumber !== undefined ? { jobNumber: input.jobNumber } : {}),
    ...(input.floatProjectId !== undefined ? { floatProjectId: input.floatProjectId } : {})
  };
  const contract = getFixtureDashboardContract(scope);

  return result({
    tool: input.tool,
    label: "Inspect visible project row",
    status: contract.visibleRows.length === 0 ? "unresolved" : "pass",
    sourceLayers: sourceLayersFromRows(contract.visibleRows),
    contractRows: contract.visibleRows,
    facts: factsFromRows(contract.visibleRows),
    checks: [],
    unsupported: contract.unsupported,
    unresolved:
      contract.visibleRows.length === 0
        ? [
            {
              code: "PROJECT_ROW_NOT_FOUND",
              label: "Project row not found",
              reason: "No visible display contract row matched the requested identity.",
              requiredTool: "inspect_project",
              sourceLayers: []
            }
          ]
        : [],
    warnings: []
  });
}

function queryProjectsResult(input: ExecuteReadOnlyToolInput): ReadOnlyToolResult {
  const contract = getFixtureDashboardContract(input.scope);

  return result({
    tool: input.tool,
    label: "Query visible project rows",
    status: "pass",
    sourceLayers: sourceLayersFromRows(contract.visibleRows),
    contractRows: contract.visibleRows,
    facts: factsFromRows(contract.visibleRows),
    checks: [],
    unsupported: contract.unsupported,
    warnings: []
  });
}

function inspectFloatRawCacheVisibleResult(input: ExecuteReadOnlyToolInput): ReadOnlyToolResult {
  const facts = filterFactsByScope(fixtureFactSet().floatFacts, {
    ...input.scope,
    ...(input.jobNumber !== undefined ? { jobNumber: input.jobNumber } : {}),
    ...(input.floatProjectId !== undefined ? { floatProjectId: input.floatProjectId } : {})
  });
  const contract = getFixtureDashboardContract(input.scope);
  const checks = contract.reconciliation.map(reconciliationToEvidenceCheck);

  return result({
    tool: input.tool,
    label: "Inspect Float raw, cache, and visible evidence",
    status: statusFromChecks(checks, 0),
    sourceLayers: uniqueSourceLayers(facts.map((fact) => fact.sourceLayer)),
    contractRows: matchingRows(contract.visibleRows, input),
    facts: facts.flatMap((fact) =>
      fact.trace.map((sourceRef) => {
        const value = fact.hours;

        return {
          id: `fact:${fact.id}:${sourceRef.rawRowId ?? sourceRef.sourceLayer}`,
          label: fact.jobNumber ?? fact.floatProjectId ?? fact.id,
          sourceLayer: fact.sourceLayer,
          ...(value !== undefined ? { value } : {}),
          sourceRefs: [sourceRef]
        };
      })
    ),
    checks,
    unsupported: [],
    warnings: facts.flatMap((fact) => fact.warnings.map((warning) => warning.message))
  });
}

function parsePastedFloatExportResult(input: ExecuteReadOnlyToolInput): ReadOnlyToolResult {
  if (input.pastedFloatExport === undefined || input.pastedFloatExport.trim() === "") {
    return result({
      tool: input.tool,
      label: "Parse pasted Float export",
      status: "unresolved",
      sourceLayers: ["float_export"],
      contractRows: [],
      facts: [],
      checks: [],
      unsupported: [],
      unresolved: [
        {
          code: "MISSING_FLOAT_EXPORT",
          label: "Pasted Float export missing",
          reason: "No pasted Float export was supplied for this investigation.",
          requiredTool: "parse_pasted_float_export",
          sourceLayers: ["float_export"]
        }
      ],
      warnings: ["Pasted Float export missing, so export comparison remains unresolved."]
    });
  }

  return result({
    tool: input.tool,
    label: "Parse pasted Float export",
    status: "pass",
    sourceLayers: ["float_export"],
    contractRows: [],
    facts: [
      {
        id: "fact:float-export:pasted",
        label: "Pasted Float export supplied",
        sourceLayer: "float_export",
        sourceRefs: [{ source: "float", sourceLayer: "float_export" }],
        note: "Pasted export parsing is deterministic fixture evidence in Phase 7."
      }
    ],
    checks: [],
    unsupported: [],
    warnings: []
  });
}

function compareFloatExportResult(input: ExecuteReadOnlyToolInput): ReadOnlyToolResult {
  if (input.pastedFloatExport === undefined || input.pastedFloatExport.trim() === "") {
    return result({
      tool: input.tool,
      label: "Compare Float export to contract",
      status: "unresolved",
      sourceLayers: ["float_export", "float_visible"],
      contractRows: matchingRows(getFixtureDashboardContract(input.scope).visibleRows, input),
      facts: [],
      checks: [],
      unsupported: [],
      unresolved: [
        {
          code: "FLOAT_EXPORT_COMPARISON_UNRESOLVED",
          label: "Float export comparison unresolved",
          reason: "Cannot compare a missing pasted Float export with the display contract.",
          requiredTool: "compare_float_export_to_contract",
          sourceLayers: ["float_export", "float_visible"]
        }
      ],
      warnings: ["Float export comparison unresolved because the export was not supplied."]
    });
  }

  return result({
    tool: input.tool,
    label: "Compare Float export to contract",
    status: "pass",
    sourceLayers: ["float_export", "float_visible"],
    contractRows: matchingRows(getFixtureDashboardContract(input.scope).visibleRows, input),
    facts: [],
    checks: [],
    unsupported: [],
    warnings: []
  });
}

function inspectFeeSheetResult(input: ExecuteReadOnlyToolInput): ReadOnlyToolResult {
  const facts = filterFactsByScope(fixtureFactSet().soldFacts, input.scope);

  return result({
    tool: input.tool,
    label: "Inspect fee sheet evidence",
    status: facts.length === 0 ? "unresolved" : "pass",
    sourceLayers: ["sold", "fee_sheet_parser_summary"],
    contractRows: matchingRows(getFixtureDashboardContract(input.scope).visibleRows, input),
    facts: facts.flatMap((fact) =>
      fact.trace.map((sourceRef) => {
        const value = fact.hours ?? fact.amount;

        return {
          id: `fact:${fact.id}:${sourceRef.rawRowId ?? sourceRef.sourceLayer}`,
          label: fact.jobNumber ?? fact.id,
          sourceLayer: fact.sourceLayer,
          ...(value !== undefined ? { value } : {}),
          sourceRefs: [sourceRef]
        };
      })
    ),
    checks: [],
    unsupported: [],
    warnings: []
  });
}

function genericToolResult(input: ExecuteReadOnlyToolInput): ReadOnlyToolResult {
  return result({
    tool: input.tool,
    label: `Run ${input.tool}`,
    status: "unresolved",
    sourceLayers: [],
    contractRows: [],
    facts: [],
    checks: [],
    unsupported: [],
    unresolved: [
      {
        code: "TOOL_NOT_FIXTURE_BACKED",
        label: `Run ${input.tool}`,
        reason: "This required tool has no fixture-backed read-only implementation in Phase 7 yet.",
        requiredTool: input.tool,
        sourceLayers: []
      }
    ],
    warnings: [`${input.tool} has no fixture-backed read-only implementation yet.`]
  });
}

function result(input: Omit<ReadOnlyToolResult, "unresolved"> & { readonly unresolved?: readonly UnresolvedCheck[] }): ReadOnlyToolResult {
  return {
    ...input,
    unresolved: [...(input.unresolved ?? [])]
  };
}

function reconciliationToEvidenceCheck(check: ReconciliationCheck): EvidenceCheck {
  return {
    id: check.id,
    label: check.label,
    status: check.status === "PASS" ? "pass" : check.status === "FAIL" ? "fail" : "warn",
    sourceLayers: uniqueSourceLayers(check.sourceRefs.map((sourceRef) => sourceRef.sourceLayer)),
    sourceRefs: check.sourceRefs,
    ...(check.expected !== undefined ? { expected: check.expected } : {}),
    ...(check.actual !== undefined ? { actual: check.actual } : {}),
    ...(check.message !== undefined ? { message: check.message } : {})
  };
}

function statusFromChecks(checks: readonly EvidenceCheck[], warningCount: number): ChatToolRunStatus {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "warn") || warningCount > 0) return "warn";
  return "pass";
}

function factsFromRows(rows: readonly DashboardProjectRow[]): EvidenceFact[] {
  return rows.flatMap((row) =>
    row.sourceTrace.map((sourceRef) => ({
      id: `fact:${row.id}:${sourceRef.rawRowId ?? sourceRef.sourceLayer}`,
      label: row.jobNumber ?? row.canonicalProjectName ?? row.id,
      sourceLayer: sourceRef.sourceLayer,
      sourceRefs: [sourceRef],
      contractRowId: row.id
    }))
  );
}

function sourceLayersFromRows(rows: readonly DashboardProjectRow[]): SourceLayer[] {
  return uniqueSourceLayers(rows.flatMap((row) => row.sourceTrace.map((sourceRef) => sourceRef.sourceLayer)));
}

function matchingRows(
  rows: readonly DashboardProjectRow[],
  input: Pick<ExecuteReadOnlyToolInput, "jobNumber" | "floatProjectId">
): DashboardProjectRow[] {
  return rows.filter((row) => {
    if (input.jobNumber !== undefined && row.jobNumber === input.jobNumber) return true;
    if (input.floatProjectId !== undefined && row.canonicalFloatProjectId === input.floatProjectId) return true;
    if (input.jobNumber === undefined && input.floatProjectId === undefined) return true;
    return false;
  });
}

function uniqueSourceLayers(sourceLayers: readonly SourceLayer[]): SourceLayer[] {
  return [...new Set(sourceLayers)];
}
