import type { DashboardProjectRow, DashboardTotals } from "./contract";
import type { MetricValue, SourceName } from "../canon/types";

export type ProjectMetricKey = keyof DashboardTotals;

export function projectMetricCellName(_row: DashboardProjectRow, metric: ProjectMetricKey): string {
  if (isMoneyMetric(metric)) {
    return `${metric}Gbp`;
  }

  return metric;
}

export function projectMetricCsvValue(row: DashboardProjectRow, metric: ProjectMetricKey): string | number {
  const value = row.totals[metric];
  const label = absentProjectMetricLabel(row, metric, value);

  if (label !== undefined) return label;
  if (value.kind === "unsupported") return value.displayLabel;
  if (value.kind === "money") return value.value.amountGbp;
  return value.value;
}

export function formatProjectMetric(value: MetricValue, row: DashboardProjectRow, metric: ProjectMetricKey): string {
  const label = absentProjectMetricLabel(row, metric, value);

  if (label !== undefined) return label;
  if (value.kind === "unsupported") return value.displayLabel;

  if (value.kind === "money") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0
    }).format(value.value.amountGbp);
  }

  if (value.kind === "hours") {
    return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value.value)}h`;
  }

  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 1
  }).format(value.value);
}

export function projectRowTraceabilityLabel(row: DashboardProjectRow): string {
  if (row.warnings.length > 0) return "Warn";
  if (row.rowType !== "matched") return "Source-only";
  return "Traceable";
}

function absentProjectMetricLabel(
  row: DashboardProjectRow,
  metric: ProjectMetricKey,
  value: MetricValue
): string | undefined {
  if (!isAbsentProjectMetric(row, metric, value)) {
    return undefined;
  }

  return row.rowType === "matched" ? "No source row" : "Source-only";
}

function isAbsentProjectMetric(row: DashboardProjectRow, metric: ProjectMetricKey, value: MetricValue): boolean {
  if (value.kind === "unsupported") return false;
  if (!isZeroMetric(value)) return false;

  const expectedSource = metricSource(metric);
  const refsForMetricSource = row.sourceTrace.filter((ref) => {
    if (ref.source !== expectedSource) return false;
    if (metric === "floatHours") return ref.sourceLayer === "float_visible";
    if (metric === "soldFee" || metric === "soldHours") return ref.sourceLayer === "sold";
    return true;
  });

  if (refsForMetricSource.length === 0) return true;

  const fieldedRefs = refsForMetricSource.filter((ref) => ref.field !== undefined);
  if (fieldedRefs.length === 0) return false;

  const expectedFields = metricTraceFields(metric);
  return !fieldedRefs.some((ref) => expectedFields.includes(ref.field ?? ""));
}

function isZeroMetric(value: MetricValue): boolean {
  if (value.kind === "money") return value.value.amountGbp === 0;
  if (value.kind === "hours" || value.kind === "count") return value.value === 0;
  return false;
}

function metricSource(metric: ProjectMetricKey): SourceName {
  if (metric === "pipelineFee") return "pipeline";
  if (metric === "productionRevenue") return "production_revenue";
  if (metric === "floatHours") return "float";
  return "fee_sheet";
}

function isMoneyMetric(metric: ProjectMetricKey): boolean {
  return metric === "soldFee" || metric === "pipelineFee" || metric === "productionRevenue";
}

function metricTraceFields(metric: ProjectMetricKey): string[] {
  if (metric === "soldFee") return ["soldFee", "amount", "amountGbp"];
  if (metric === "soldHours") return ["soldHours", "hours"];
  if (metric === "pipelineFee") return ["pipelineFee", "amount", "amountGbp"];
  if (metric === "productionRevenue") return ["productionRevenue", "amount", "amountGbp"];
  return ["floatHours", "hours"];
}
