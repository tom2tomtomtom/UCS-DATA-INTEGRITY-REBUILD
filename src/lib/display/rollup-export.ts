import type { RollupRow } from "./contract";
import type { MetricValue } from "../canon/types";

export type RollupFooter = {
  readonly allocatedHours: MetricValue;
  readonly allocatedValue: MetricValue;
  readonly pipelineFee: MetricValue;
  readonly soldFee: MetricValue;
  readonly soldHours: MetricValue;
  readonly status: string;
  readonly totalHours: MetricValue;
  readonly unallocatedHours: MetricValue;
  readonly variancePercent: MetricValue;
};

export function buildRollupFooter(rows: readonly RollupRow[]): RollupFooter {
  const pipelineFee = sumMetric(rows.map((row) => row.totals.pipelineFee), "money");
  const soldFee = sumMetric(rows.map((row) => row.totals.soldFee), "money");
  const soldHours = sumMetric(rows.map((row) => row.totals.soldHours), "hours");
  const allocatedHours = sumMetric(rows.map((row) => row.floatBreakdown?.allocatedHours), "hours");
  const unallocatedHours = sumMetric(rows.map((row) => row.floatBreakdown?.unallocatedHours), "hours");
  const totalHours = sumMetric(rows.map((row) => row.totals.floatHours), "hours");
  const allocatedValue = allocatedValueMetric(soldFee, soldHours, allocatedHours);
  const variancePercent = variancePercentMetric(soldHours, totalHours);

  return {
    allocatedHours,
    allocatedValue,
    pipelineFee,
    soldFee,
    soldHours,
    status: statusFor(metricNumber(soldHours), metricNumber(totalHours), unsupportedCount([allocatedHours, unallocatedHours])),
    totalHours,
    unallocatedHours,
    variancePercent
  };
}

export function buildRollupCsvText(rows: readonly RollupRow[]): string {
  const headers = [
    "label",
    "pipelineGbp",
    "soldGbp",
    "soldHours",
    "allocatedHours",
    "unallocatedHours",
    "totalHours",
    "allocatedValueGbp",
    "variancePercent",
    "status"
  ];
  const bodyRows = rows.map((row) => rollupCsvCells(row));
  const footer = footerCsvCells(buildRollupFooter(rows));

  return [
    headers.join(","),
    ...bodyRows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
    headers.map((header) => csvEscape(footer[header] ?? "")).join(",")
  ].join("\n");
}

export function buildRollupCsvDataUri(rows: readonly RollupRow[]): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(buildRollupCsvText(rows))}`;
}

function rollupCsvCells(row: RollupRow): Record<string, string | number> {
  const allocatedHours = row.floatBreakdown?.allocatedHours ?? unsupportedMetric("allocatedHours");
  const unallocatedHours = row.floatBreakdown?.unallocatedHours ?? unsupportedMetric("unallocatedHours");
  const allocatedValue = allocatedValueMetric(row.totals.soldFee, row.totals.soldHours, allocatedHours);
  const variancePercent = variancePercentMetric(row.totals.soldHours, row.totals.floatHours);

  return {
    label: row.label,
    pipelineGbp: metricNumber(row.totals.pipelineFee),
    soldGbp: metricNumber(row.totals.soldFee),
    soldHours: metricNumber(row.totals.soldHours),
    allocatedHours: metricNumber(allocatedHours),
    unallocatedHours: metricNumber(unallocatedHours),
    totalHours: metricNumber(row.totals.floatHours),
    allocatedValueGbp: metricNumber(allocatedValue),
    variancePercent: metricNumber(variancePercent),
    status: statusFor(metricNumber(row.totals.soldHours), metricNumber(row.totals.floatHours), row.unsupported.length)
  };
}

function footerCsvCells(footer: RollupFooter): Record<string, string | number> {
  return {
    label: "Total",
    pipelineGbp: metricNumber(footer.pipelineFee),
    soldGbp: metricNumber(footer.soldFee),
    soldHours: metricNumber(footer.soldHours),
    allocatedHours: metricNumber(footer.allocatedHours),
    unallocatedHours: metricNumber(footer.unallocatedHours),
    totalHours: metricNumber(footer.totalHours),
    allocatedValueGbp: metricNumber(footer.allocatedValue),
    variancePercent: metricNumber(footer.variancePercent),
    status: footer.status
  };
}

function sumMetric(values: readonly (MetricValue | undefined)[], kind: "hours" | "money"): MetricValue {
  if (values.some((value) => value === undefined || value.kind === "unsupported")) {
    return unsupportedMetric(kind);
  }

  if (kind === "money") {
    return moneyMetric(values.reduce((total, value) => total + metricNumber(value), 0));
  }

  return hoursMetric(values.reduce((total, value) => total + metricNumber(value), 0));
}

function allocatedValueMetric(soldFee: MetricValue, soldHours: MetricValue, allocatedHours: MetricValue): MetricValue {
  if (soldFee.kind === "unsupported" || soldHours.kind === "unsupported" || allocatedHours.kind === "unsupported") {
    return unsupportedMetric("allocatedValue");
  }

  const soldHourCount = metricNumber(soldHours);
  const allocatedHourCount = metricNumber(allocatedHours);
  if (soldHourCount <= 0 || allocatedHourCount <= 0) return moneyMetric(0);

  return moneyMetric((metricNumber(soldFee) / soldHourCount) * allocatedHourCount);
}

function variancePercentMetric(soldHours: MetricValue, totalHours: MetricValue): MetricValue {
  if (soldHours.kind === "unsupported" || totalHours.kind === "unsupported") return unsupportedMetric("variancePercent");

  const soldHourCount = metricNumber(soldHours);
  const totalHourCount = metricNumber(totalHours);

  return {
    kind: "count",
    value: soldHourCount === 0 ? (totalHourCount > 0 ? Number.POSITIVE_INFINITY : 0) : ((totalHourCount - soldHourCount) / soldHourCount) * 100
  };
}

function statusFor(soldHours: number, allocatedHours: number, unsupportedMetrics: number): string {
  if (unsupportedMetrics > 0 && allocatedHours === 0) return "Warn";
  if (soldHours === 0 && allocatedHours > 0) return "Uncosted";
  if (allocatedHours > soldHours * 1.15) return "Over";
  if (allocatedHours < soldHours * 0.7) return "Gap";
  return "OK";
}

function unsupportedCount(values: readonly MetricValue[]): number {
  return values.filter((value) => value.kind === "unsupported").length;
}

function metricNumber(value: MetricValue | undefined): number {
  if (value?.kind === "money") return value.value.amountGbp;
  if (value?.kind === "hours" || value?.kind === "count") return value.value;
  return 0;
}

function moneyMetric(amountGbp: number): MetricValue {
  return {
    kind: "money",
    value: {
      amountOriginal: amountGbp,
      currencyOriginal: "GBP",
      amountGbp,
      fxRateToGbp: 1,
      fxSource: "rollup_display_contract",
      fxCapturedAt: ""
    }
  };
}

function hoursMetric(value: number): MetricValue {
  return {
    kind: "hours",
    value,
    unit: "decimal_hours"
  };
}

function unsupportedMetric(metric: string): MetricValue {
  return {
    kind: "unsupported",
    metric,
    scope: {
      office: "ALL",
      from: "2026-01-01",
      to: "2026-12-31"
    },
    source: "float",
    reason: "Rollup footer cannot sum unsupported source capability.",
    displayLabel: "Unsupported",
    severity: "info"
  };
}

function csvEscape(value: string | number): string {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}
