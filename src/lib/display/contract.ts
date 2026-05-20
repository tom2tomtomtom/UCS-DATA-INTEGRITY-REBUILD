import type {
  DashboardScope,
  MetricValue,
  ReconciliationCheck,
  SourceFactSet,
  SourceName,
  SourceTraceRef,
  SourceTraceSummary,
  SourceWarning,
  UnsupportedMetric
} from "../canon/types";

export type DashboardTotals = {
  soldFee: MetricValue;
  soldHours: MetricValue;
  pipelineFee: MetricValue;
  productionRevenue: MetricValue;
  floatHours: MetricValue;
};

export type DashboardProjectRow = {
  id: string;
  scope: DashboardScope;
  jobNumber?: string;
  sourceProjectName?: string;
  canonicalProjectName?: string;
  sourceClient?: string;
  canonicalClient?: string;
  sourceFloatProjectId?: string;
  canonicalFloatProjectId?: string;
  totals: DashboardTotals;
  rowType: "matched" | "source_only" | "float_only" | "pipeline_only" | "production_revenue_only";
  warnings: SourceWarning[];
  sourceTrace: SourceTraceRef[];
};

export type RollupRow = {
  id: string;
  scope: DashboardScope;
  label: string;
  totals: DashboardTotals;
  unsupported: UnsupportedMetric[];
  warnings: SourceWarning[];
  sourceTrace: SourceTraceRef[];
};

export type DashboardCsvRow = {
  id: string;
  scope: DashboardScope;
  cells: Record<string, string | number>;
  unsupported: UnsupportedMetric[];
  warnings: SourceWarning[];
  sourceTrace: SourceTraceRef[];
};

export type DashboardDisplayContract = {
  scope: DashboardScope;
  generatedAt: string;
  visibleRows: DashboardProjectRow[];
  heroTotals: DashboardTotals;
  footerTotals: DashboardTotals;
  rollups: {
    byDepartment: RollupRow[];
    byRole: RollupRow[];
    byMonth: RollupRow[];
    byClient: RollupRow[];
  };
  csvRows: DashboardCsvRow[];
  unsupported: UnsupportedMetric[];
  reconciliation: ReconciliationCheck[];
  sourceTrace: SourceTraceSummary[];
  warnings: SourceWarning[];
  confidence: "high" | "medium" | "low";
};

export type BuildDashboardDisplayContractInput = SourceFactSet & {
  scope: DashboardScope;
  generatedAt: string;
};

const unsupportedTotal = (
  metric: string,
  scope: DashboardScope,
  source: SourceName,
  reason: string
): UnsupportedMetric => ({
  kind: "unsupported",
  metric,
  scope,
  source,
  reason,
  displayLabel: "Unsupported",
  severity: "info"
});

export function buildDashboardDisplayContract(
  input: BuildDashboardDisplayContractInput
): DashboardDisplayContract {
  const emptyReason = "No display aggregation has been implemented in Phase 0.";
  const totals: DashboardTotals = {
    soldFee: unsupportedTotal("soldFee", input.scope, "fee_sheet", emptyReason),
    soldHours: unsupportedTotal("soldHours", input.scope, "fee_sheet", emptyReason),
    pipelineFee: unsupportedTotal("pipelineFee", input.scope, "pipeline", emptyReason),
    productionRevenue: unsupportedTotal(
      "productionRevenue",
      input.scope,
      "production_revenue",
      emptyReason
    ),
    floatHours: unsupportedTotal("floatHours", input.scope, "float", emptyReason)
  };
  const unsupported = Object.values(totals) as UnsupportedMetric[];

  return {
    scope: input.scope,
    generatedAt: input.generatedAt,
    visibleRows: [],
    heroTotals: totals,
    footerTotals: totals,
    rollups: {
      byDepartment: [],
      byRole: [],
      byMonth: [],
      byClient: []
    },
    csvRows: [],
    unsupported,
    reconciliation: [],
    sourceTrace: [],
    warnings: input.sourceIssues,
    confidence: "low"
  };
}
