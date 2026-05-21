import type {
  DashboardDisplayContract,
  DashboardProjectRow,
  DashboardTotals,
  ProjectDetailEvidence,
  ProjectFloatTraceRow,
  ProjectMonthlyDetailRow,
  ProjectRoleDetailRow
} from "./contract";
import type { MetricValue, ReconciliationCheck } from "../canon/types";

export type ProjectDetailFloatTraceSummary = {
  readonly dashboardVisibleHours: MetricValue;
  readonly visibleTraceHours: MetricValue;
  readonly rawTraceHours: MetricValue;
};

export type ProjectDetailViewModel = {
  readonly matchingRows: readonly DashboardProjectRow[];
  readonly row: DashboardProjectRow;
  readonly detail: ProjectDetailEvidence;
  readonly allocatedHours: MetricValue;
  readonly unallocatedHours: MetricValue;
  readonly checks: readonly ReconciliationCheck[];
  readonly floatTraceSummary: ProjectDetailFloatTraceSummary;
};

export function buildProjectDetailViewModel(
  contract: DashboardDisplayContract,
  jobNumber: string
): ProjectDetailViewModel | undefined {
  const matchingRows = contract.visibleRows.filter((candidate) => candidate.jobNumber === jobNumber);
  if (matchingRows.length === 0) return undefined;

  const row = combineProjectRows(matchingRows);
  const detail = row.detail ?? emptyDetail();
  const allocatedHours = sumDetailHours(detail.roleRows.map((roleRow) => roleRow.allocatedHours));
  const unallocatedHours = sumTraceHours(
    detail.floatTraceRows.filter((traceRow) => traceRow.flags.includes("unallocated") || traceRow.flags.includes("placeholder"))
  );
  const checks = contract.reconciliation.filter((check) => check.scope.jobNumber === jobNumber);

  return {
    matchingRows,
    row,
    detail,
    allocatedHours,
    unallocatedHours,
    checks,
    floatTraceSummary: {
      dashboardVisibleHours: row.totals.floatHours,
      visibleTraceHours: sumTraceHours(detail.floatTraceRows.filter((traceRow) => traceRow.flags.includes("float_visible"))),
      rawTraceHours: sumTraceHours(detail.floatTraceRows.filter((traceRow) => traceRow.flags.includes("float_raw")))
    }
  };
}

function combineProjectRows(rows: readonly DashboardProjectRow[]): DashboardProjectRow {
  const firstRow = rows[0];
  if (firstRow === undefined) {
    throw new Error("Cannot combine an empty project row set.");
  }
  const restRows = rows.slice(1);

  return {
    ...firstRow,
    totals: restRows.reduce((totals, row) => addTotals(totals, row.totals), cloneTotals(firstRow.totals)),
    warnings: uniqueById(rows.flatMap((row) => row.warnings)),
    sourceTrace: rows.flatMap((row) => row.sourceTrace.map((sourceRef) => ({ ...sourceRef }))),
    detail: mergeDetail(rows.map((row) => row.detail ?? emptyDetail()))
  };
}

function cloneTotals(totals: DashboardTotals): DashboardTotals {
  return {
    soldFee: cloneMetric(totals.soldFee),
    soldHours: cloneMetric(totals.soldHours),
    pipelineFee: cloneMetric(totals.pipelineFee),
    productionRevenue: cloneMetric(totals.productionRevenue),
    floatHours: cloneMetric(totals.floatHours)
  };
}

function addTotals(left: DashboardTotals, right: DashboardTotals): DashboardTotals {
  return {
    soldFee: addMetric(left.soldFee, right.soldFee),
    soldHours: addMetric(left.soldHours, right.soldHours),
    pipelineFee: addMetric(left.pipelineFee, right.pipelineFee),
    productionRevenue: addMetric(left.productionRevenue, right.productionRevenue),
    floatHours: addMetric(left.floatHours, right.floatHours)
  };
}

function addMetric(left: MetricValue, right: MetricValue): MetricValue {
  if (left.kind === "unsupported") return cloneMetric(left);
  if (right.kind === "unsupported") return cloneMetric(right);
  if (left.kind === "money" && right.kind === "money") {
    const amountOriginal = left.value.amountOriginal + right.value.amountOriginal;
    const amountGbp = left.value.amountGbp + right.value.amountGbp;

    return {
      kind: "money",
      value: {
        ...left.value,
        amountOriginal,
        amountGbp,
        fxRateToGbp: amountOriginal === 0 ? 1 : amountGbp / amountOriginal
      }
    };
  }
  if (left.kind === "hours" && right.kind === "hours") {
    return {
      kind: "hours",
      value: left.value + right.value,
      unit: "decimal_hours"
    };
  }
  if (left.kind === "count" && right.kind === "count") {
    return {
      kind: "count",
      value: left.value + right.value
    };
  }

  return cloneMetric(left);
}

function cloneMetric(metric: MetricValue): MetricValue {
  if (metric.kind === "money") return { kind: "money", value: { ...metric.value } };
  if (metric.kind === "hours") return { kind: "hours", value: metric.value, unit: metric.unit };
  if (metric.kind === "count") return { kind: "count", value: metric.value };
  return { ...metric, scope: { ...metric.scope } };
}

function mergeDetail(details: readonly ProjectDetailEvidence[]): ProjectDetailEvidence {
  const monthlyRows = new Map<string, ProjectMonthlyDetailRow>();
  const roleRows = new Map<string, ProjectRoleDetailRow>();

  for (const detail of details) {
    for (const row of detail.monthlyRows) {
      const existing = monthlyRows.get(row.month);
      monthlyRows.set(row.month, existing === undefined ? cloneMonthlyRow(row) : mergeMonthlyRow(existing, row));
    }

    for (const row of detail.roleRows) {
      const existing = roleRows.get(row.role);
      roleRows.set(row.role, existing === undefined ? cloneRoleRow(row) : mergeRoleRow(existing, row));
    }
  }

  return {
    monthlyRows: [...monthlyRows.values()],
    roleRows: [...roleRows.values()],
    floatTraceRows: details.flatMap((detail) => detail.floatTraceRows)
  };
}

function cloneMonthlyRow(row: ProjectMonthlyDetailRow): ProjectMonthlyDetailRow {
  return {
    month: row.month,
    soldFee: cloneMetric(row.soldFee),
    soldHours: cloneMetric(row.soldHours),
    allocatedHours: cloneMetric(row.allocatedHours),
    allocatedValue: cloneMetric(row.allocatedValue),
    varianceHours: cloneMetric(row.varianceHours),
    sourceTrace: row.sourceTrace.map((sourceRef) => ({ ...sourceRef }))
  };
}

function mergeMonthlyRow(left: ProjectMonthlyDetailRow, right: ProjectMonthlyDetailRow): ProjectMonthlyDetailRow {
  return {
    month: left.month,
    soldFee: addMetric(left.soldFee, right.soldFee),
    soldHours: addMetric(left.soldHours, right.soldHours),
    allocatedHours: addMetric(left.allocatedHours, right.allocatedHours),
    allocatedValue: addMetric(left.allocatedValue, right.allocatedValue),
    varianceHours: addMetric(left.varianceHours, right.varianceHours),
    sourceTrace: [...left.sourceTrace, ...right.sourceTrace.map((sourceRef) => ({ ...sourceRef }))]
  };
}

function cloneRoleRow(row: ProjectRoleDetailRow): ProjectRoleDetailRow {
  return {
    role: row.role,
    soldHours: cloneMetric(row.soldHours),
    soldFee: cloneMetric(row.soldFee),
    ratePerHour: cloneMetric(row.ratePerHour),
    allocatedHours: cloneMetric(row.allocatedHours),
    allocatedValue: cloneMetric(row.allocatedValue),
    varianceValue: cloneMetric(row.varianceValue),
    variancePercent: cloneMetric(row.variancePercent),
    sourceTrace: row.sourceTrace.map((sourceRef) => ({ ...sourceRef }))
  };
}

function mergeRoleRow(left: ProjectRoleDetailRow, right: ProjectRoleDetailRow): ProjectRoleDetailRow {
  return {
    role: left.role,
    soldHours: addMetric(left.soldHours, right.soldHours),
    soldFee: addMetric(left.soldFee, right.soldFee),
    ratePerHour: left.ratePerHour,
    allocatedHours: addMetric(left.allocatedHours, right.allocatedHours),
    allocatedValue: addMetric(left.allocatedValue, right.allocatedValue),
    varianceValue: addMetric(left.varianceValue, right.varianceValue),
    variancePercent: left.variancePercent,
    sourceTrace: [...left.sourceTrace, ...right.sourceTrace.map((sourceRef) => ({ ...sourceRef }))]
  };
}

function uniqueById<TValue extends { id: string }>(values: readonly TValue[]): TValue[] {
  const seen = new Set<string>();
  const unique: TValue[] = [];

  for (const value of values) {
    if (seen.has(value.id)) continue;
    seen.add(value.id);
    unique.push(value);
  }

  return unique;
}

function emptyDetail(): ProjectDetailEvidence {
  return {
    monthlyRows: [],
    roleRows: [],
    floatTraceRows: []
  };
}

function sumDetailHours(values: readonly MetricValue[]): MetricValue {
  return {
    kind: "hours",
    value: values.reduce((total, value) => total + (value.kind === "hours" ? value.value : 0), 0),
    unit: "decimal_hours"
  };
}

function sumTraceHours(rows: readonly ProjectFloatTraceRow[]): MetricValue {
  return sumDetailHours(rows.map((row) => row.hours));
}
