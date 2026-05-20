import type {
  DashboardScope,
  MetricValue,
  ReconciliationCheck,
  SoldFact,
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
  unsupportedMetrics?: UnsupportedMetric[];
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

const zeroMoney = (currencyOriginal: "GBP" | "USD" | "EUR" | "SEK" | "UNKNOWN" = "GBP"): MetricValue => ({
  kind: "money",
  value: {
    amountOriginal: 0,
    currencyOriginal,
    amountGbp: 0,
    fxRateToGbp: 1,
    fxSource: "display_contract_zero",
    fxCapturedAt: ""
  }
});

const zeroHours = (): MetricValue => ({
  kind: "hours",
  value: 0,
  unit: "decimal_hours"
});

export function buildDashboardDisplayContract(
  input: BuildDashboardDisplayContractInput
): DashboardDisplayContract {
  const unsupportedByMetric = new Map(
    (input.unsupportedMetrics ?? []).map((metric) => [metric.metric, metric])
  );
  const soldTotals = additiveSoldTotals(input.soldFacts);
  const emptyReason = "No supported facts for this metric in the current display contract scope.";
  const totals: DashboardTotals = {
    soldFee: soldTotals.soldFee,
    soldHours: soldTotals.soldHours,
    pipelineFee:
      unsupportedByMetric.get("pipelineFee") ??
      unsupportedTotal("pipelineFee", input.scope, "pipeline", emptyReason),
    productionRevenue:
      unsupportedByMetric.get("productionRevenue") ??
      unsupportedTotal("productionRevenue", input.scope, "production_revenue", emptyReason),
    floatHours:
      unsupportedByMetric.get("floatHours") ??
      unsupportedTotal("floatHours", input.scope, "float", emptyReason)
  };
  const unsupported = Object.values(totals).filter(
    (metric): metric is UnsupportedMetric => metric.kind === "unsupported"
  );
  const sourceTrace = sourceTraceForSoldTotals(input.scope, soldTotals);

  return {
    scope: { ...input.scope },
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
    sourceTrace,
    warnings: input.sourceIssues,
    confidence: confidenceFor(totals)
  };
}

function additiveSoldTotals(soldFacts: readonly SoldFact[]): {
  readonly soldFee: MetricValue;
  readonly soldHours: MetricValue;
  readonly soldFeeRefs: SourceTraceRef[];
  readonly soldHoursRefs: SourceTraceRef[];
} {
  const additiveFacts = soldFacts.filter((fact) => fact.isAdditive);
  let amountOriginal = 0;
  let amountGbp = 0;
  let hours = 0;
  let currencyOriginal: "GBP" | "USD" | "EUR" | "SEK" | "UNKNOWN" = "GBP";
  const soldFeeRefs: SourceTraceRef[] = [];
  const soldHoursRefs: SourceTraceRef[] = [];

  for (const fact of additiveFacts) {
    if (fact.amount?.kind === "money") {
      amountOriginal += fact.amount.value.amountOriginal;
      amountGbp += fact.amount.value.amountGbp;
      currencyOriginal = fact.amount.value.currencyOriginal;
      soldFeeRefs.push(...fact.trace.map((sourceRef) => ({ ...sourceRef })));
    }

    if (fact.hours?.kind === "hours") {
      hours += fact.hours.value;
      soldHoursRefs.push(...fact.trace.map((sourceRef) => ({ ...sourceRef })));
    }
  }

  const soldFee = additiveFacts.length === 0 ? zeroMoney() : {
    kind: "money" as const,
    value: {
      amountOriginal,
      currencyOriginal,
      amountGbp,
      fxRateToGbp: amountOriginal === 0 ? 1 : amountGbp / amountOriginal,
      fxSource: "display_contract_additive_facts",
      fxCapturedAt: ""
    }
  };

  const soldHours = additiveFacts.length === 0 ? zeroHours() : {
    kind: "hours" as const,
    value: hours,
    unit: "decimal_hours" as const
  };

  return {
    soldFee,
    soldHours,
    soldFeeRefs,
    soldHoursRefs
  };
}

function sourceTraceForSoldTotals(
  scope: DashboardScope,
  soldTotals: ReturnType<typeof additiveSoldTotals>
): SourceTraceSummary[] {
  const traces: SourceTraceSummary[] = [];

  if (soldTotals.soldFeeRefs.length > 0) {
    traces.push({
      id: "display:soldFee",
      scope: { ...scope },
      metric: "soldFee",
      value: soldTotals.soldFee,
      refs: soldTotals.soldFeeRefs,
      warnings: []
    });
  }

  if (soldTotals.soldHoursRefs.length > 0) {
    traces.push({
      id: "display:soldHours",
      scope: { ...scope },
      metric: "soldHours",
      value: soldTotals.soldHours,
      refs: soldTotals.soldHoursRefs,
      warnings: []
    });
  }

  return traces;
}

function confidenceFor(totals: DashboardTotals): DashboardDisplayContract["confidence"] {
  return Object.values(totals).some((metric) => metric.kind === "unsupported") ? "medium" : "high";
}
