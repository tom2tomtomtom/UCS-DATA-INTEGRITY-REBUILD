import type {
  DashboardScope,
  FloatFact,
  MetricValue,
  PipelineFact,
  ProductionRevenueFact,
  ReconciliationCheck,
  SoldFact,
  SourceFactSet,
  SourceName,
  SourceTraceRef,
  SourceTraceSummary,
  SourceWarning,
  UnsupportedMetric
} from "../canon/types";
import { filterFactsByScope } from "../canon-queries/scope";
import type { ApprovalContractOutput } from "./approval-output";
import { buildCsvRowsFromDisplayContract } from "./csv";
import { createFloatReconciliationChecks } from "./float-reconciliation";
import { buildProjectRows } from "./project-rows";
import { buildDisplayRollups } from "./rollups";
import type { CompactSourceTraceRow } from "./traces";

export type DashboardTotals = {
  soldFee: MetricValue;
  soldHours: MetricValue;
  pipelineFee: MetricValue;
  productionRevenue: MetricValue;
  floatHours: MetricValue;
};

export type ProjectMonthlyDetailRow = {
  readonly month: string;
  readonly soldFee: MetricValue;
  readonly soldHours: MetricValue;
  readonly allocatedHours: MetricValue;
  readonly allocatedValue: MetricValue;
  readonly varianceHours: MetricValue;
  readonly sourceTrace: SourceTraceRef[];
};

export type ProjectRoleDetailRow = {
  readonly role: string;
  readonly soldHours: MetricValue;
  readonly soldFee: MetricValue;
  readonly ratePerHour: MetricValue;
  readonly allocatedHours: MetricValue;
  readonly allocatedValue: MetricValue;
  readonly varianceValue: MetricValue;
  readonly variancePercent: MetricValue;
  readonly sourceTrace: SourceTraceRef[];
};

export type ProjectFloatTraceRow = {
  readonly floatProject: string;
  readonly task: string;
  readonly person: string;
  readonly departmentRole: string;
  readonly dates: string;
  readonly hours: MetricValue;
  readonly flags: readonly string[];
  readonly sourceTrace: SourceTraceRef[];
};

export type ProjectDetailEvidence = {
  readonly monthlyRows: readonly ProjectMonthlyDetailRow[];
  readonly roleRows: readonly ProjectRoleDetailRow[];
  readonly floatTraceRows: readonly ProjectFloatTraceRow[];
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
  detail?: ProjectDetailEvidence;
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

export type DashboardApprovalOutput = ApprovalContractOutput;
export type CompactDashboardTraceRow = CompactSourceTraceRow;

export type BuildDashboardDisplayContractInput = SourceFactSet & {
  scope: DashboardScope;
  generatedAt: string;
  unsupportedMetrics?: UnsupportedMetric[];
};

const dashboardMetricKeys = [
  "soldFee",
  "soldHours",
  "pipelineFee",
  "productionRevenue",
  "floatHours"
] as const satisfies readonly (keyof DashboardTotals)[];

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
  const soldFacts = filterFactsByScope(input.soldFacts, input.scope);
  const pipelineFacts = filterFactsByScope(input.pipelineFacts, input.scope);
  const productionRevenueFacts = filterFactsByScope(input.productionRevenueFacts, input.scope);
  const floatFacts = filterFactsByScope(input.floatFacts, input.scope);
  const soldTotals = additiveSoldTotals(soldFacts);
  const emptyReason = "No supported facts for this metric in the current display contract scope.";
  const totals: DashboardTotals = {
    soldFee: soldTotals.soldFee,
    soldHours: soldTotals.soldHours,
    pipelineFee:
      unsupportedByMetric.get("pipelineFee") ??
      additivePipelineTotal(pipelineFacts, input.scope, emptyReason),
    productionRevenue:
      unsupportedByMetric.get("productionRevenue") ??
      additiveProductionRevenueTotal(productionRevenueFacts, input.scope, emptyReason),
    floatHours:
      unsupportedByMetric.get("floatHours") ??
      additiveVisibleFloatHours(floatFacts, input.scope, emptyReason)
  };
  const visibleRows = buildProjectRows({
    ...input,
    unsupportedMetrics: unsupportedFromTotals(totals)
  });
  const rollups = buildDisplayRollups({
    scope: input.scope,
    soldFacts,
    floatFacts,
    pipelineFacts,
    productionRevenueFacts
  });
  const reconciliation = createFloatReconciliationChecks({
    scope: input.scope,
    facts: floatFacts
  });
  const sourceTrace = sourceTraceForSoldTotals(input.scope, soldTotals);
  const contractWithoutCsv: DashboardDisplayContract = {
    scope: { ...input.scope },
    generatedAt: input.generatedAt,
    visibleRows,
    heroTotals: totals,
    footerTotals: totals,
    rollups,
    csvRows: [],
    unsupported: unsupportedFromTotals(totals),
    reconciliation,
    sourceTrace,
    warnings: input.sourceIssues,
    confidence: confidenceFor(totals)
  };

  return {
    ...contractWithoutCsv,
    csvRows: buildCsvRowsFromDisplayContract(contractWithoutCsv)
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

function additivePipelineTotal(
  pipelineFacts: readonly PipelineFact[],
  scope: DashboardScope,
  emptyReason: string
): MetricValue {
  return additiveMoneyTotal(
    pipelineFacts,
    () => unsupportedTotal("pipelineFee", scope, "pipeline", emptyReason),
    "display_contract_pipeline_additive_facts"
  );
}

function additiveProductionRevenueTotal(
  productionRevenueFacts: readonly ProductionRevenueFact[],
  scope: DashboardScope,
  emptyReason: string
): MetricValue {
  return additiveMoneyTotal(
    productionRevenueFacts,
    () => unsupportedTotal("productionRevenue", scope, "production_revenue", emptyReason),
    "display_contract_production_revenue_additive_facts"
  );
}

function additiveVisibleFloatHours(
  floatFacts: readonly FloatFact[],
  scope: DashboardScope,
  emptyReason: string
): MetricValue {
  const visibleFacts = floatFacts.filter((fact) => fact.sourceLayer === "float_visible" && fact.isAdditive);
  if (visibleFacts.length === 0) {
    return unsupportedTotal("floatHours", scope, "float", emptyReason);
  }

  return {
    kind: "hours",
    value: visibleFacts.reduce((total, fact) => {
      if (fact.hours?.kind !== "hours") {
        return total;
      }

      return total + fact.hours.value;
    }, 0),
    unit: "decimal_hours"
  };
}

function additiveMoneyTotal(
  facts: readonly { amount?: MetricValue; isAdditive: boolean }[],
  emptyValue: () => MetricValue,
  fxSource: string
): MetricValue {
  const additiveFacts = facts.filter((fact) => fact.isAdditive && fact.amount?.kind === "money");
  if (additiveFacts.length === 0) {
    return emptyValue();
  }

  let amountOriginal = 0;
  let amountGbp = 0;
  let currencyOriginal: "GBP" | "USD" | "EUR" | "SEK" | "UNKNOWN" = "GBP";

  for (const fact of additiveFacts) {
    if (fact.amount?.kind !== "money") {
      continue;
    }

    amountOriginal += fact.amount.value.amountOriginal;
    amountGbp += fact.amount.value.amountGbp;
    currencyOriginal = fact.amount.value.currencyOriginal;
  }

  return {
    kind: "money",
    value: {
      amountOriginal,
      currencyOriginal,
      amountGbp,
      fxRateToGbp: amountOriginal === 0 ? 1 : amountGbp / amountOriginal,
      fxSource,
      fxCapturedAt: ""
    }
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

function unsupportedFromTotals(totals: DashboardTotals): UnsupportedMetric[] {
  return dashboardMetricKeys
    .map((metric) => totals[metric])
    .filter((metric): metric is UnsupportedMetric => metric.kind === "unsupported");
}
