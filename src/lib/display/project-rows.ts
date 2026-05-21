import type {
  DashboardProjectRow,
  DashboardTotals,
  ProjectDetailEvidence,
  ProjectFloatTraceRow,
  ProjectMonthlyDetailRow,
  ProjectRoleDetailRow
} from "./contract";
import type {
  CanonFact,
  DashboardScope,
  FloatFact,
  MetricValue,
  PipelineFact,
  ProductionRevenueFact,
  SoldFact,
  SourceFactSet,
  SourceLayer,
  SourceName,
  SourceTraceRef,
  SourceWarning,
  UnsupportedMetric
} from "../canon/types";
import { filterFactsByScope } from "../canon-queries/scope";

export type ProjectRowSourceLabel = {
  source: SourceName;
  sourceLayer: SourceLayer;
};

export type ProjectDisplayRow = DashboardProjectRow & {
  sourceLabels: ProjectRowSourceLabel[];
  confidence: "high" | "medium" | "low";
};

export type BuildProjectRowsInput = Pick<
  SourceFactSet,
  "soldFacts" | "pipelineFacts" | "productionRevenueFacts" | "floatFacts" | "sourceIssues"
> & {
  scope: DashboardScope;
  unsupportedMetrics?: readonly UnsupportedMetric[];
};

type MutableProjectRow = ProjectDisplayRow & {
  factIds: Set<string>;
  rawRowIds: Set<string>;
  detail: {
    monthlyRows: ProjectMonthlyDetailRow[];
    roleRows: ProjectRoleDetailRow[];
    floatTraceRows: ProjectFloatTraceRow[];
  };
};

export function buildProjectRows(input: BuildProjectRowsInput): ProjectDisplayRow[] {
  const rows = new Map<string, MutableProjectRow>();
  const soldFacts = filterFactsByScope(input.soldFacts, input.scope);
  const pipelineFacts = filterFactsByScope(input.pipelineFacts, input.scope);
  const productionRevenueFacts = filterFactsByScope(input.productionRevenueFacts, input.scope);
  const floatFacts = filterFactsByScope(input.floatFacts, input.scope);

  for (const fact of soldFacts) {
    addFactToRow(rows, rowKeyForSold(fact), input.scope, fact, "soldFee", "soldHours");
  }

  for (const fact of floatFacts) {
    const matchedKey = findFeeSheetRowKeyByFloatId(rows, fact);
    addFactToRow(
      rows,
      matchedKey ?? rowKeyForFloat(fact),
      input.scope,
      fact,
      undefined,
      fact.sourceLayer === "float_visible" ? "floatHours" : undefined
    );
  }

  for (const fact of pipelineFacts) {
    const matchedKey = findFeeSheetRowKey(rows, fact);
    addFactToRow(rows, matchedKey ?? rowKeyForPipeline(fact), input.scope, fact, "pipelineFee", undefined);
  }

  for (const fact of productionRevenueFacts) {
    const matchedKey = findFeeSheetRowKey(rows, fact);
    addFactToRow(
      rows,
      matchedKey ?? rowKeyForProduction(fact),
      input.scope,
      fact,
      "productionRevenue",
      undefined
    );
  }

  for (const warning of input.sourceIssues) {
    addSourceIssueToMatchingRows(rows, warning);
  }

  return Array.from(rows.values()).map((row) => finalizeRow(row, input.unsupportedMetrics ?? []));
}

function rowKeyForSold(fact: SoldFact): string {
  const floatProjectId = fact.feeSheetFloatId ?? fact.floatProjectId;

  if (floatProjectId !== undefined && floatProjectId.trim() !== "") {
    return `project:float:${floatProjectId}`;
  }

  if (fact.jobNumber !== undefined && fact.jobNumber.trim() !== "") {
    return `project:sold:${normalizeIdentity(fact.jobNumber)}`;
  }

  return `project:sold:${fact.id}`;
}

function rowKeyForFloat(fact: FloatFact): string {
  if (fact.floatProjectId !== undefined && fact.floatProjectId.trim() !== "") {
    return `project:float:${fact.floatProjectId}`;
  }

  return `project:float:${fact.id}`;
}

function rowKeyForPipeline(fact: PipelineFact): string {
  return `project:pipeline:${fact.stablePipelineIdentity}`;
}

function rowKeyForProduction(fact: ProductionRevenueFact): string {
  return `project:production:${fact.id}`;
}

function addFactToRow(
  rows: Map<string, MutableProjectRow>,
  rowId: string,
  scope: DashboardScope,
  fact: CanonFact,
  moneyMetric: keyof DashboardTotals | undefined,
  hoursMetric: keyof DashboardTotals | undefined
): void {
  const row = rows.get(rowId) ?? createRow(rowId, scope);

  applyFactIdentity(row, fact);
  appendSourceLabel(row, fact.source, fact.sourceLayer);
  appendTrace(row, fact.trace);
  appendWarnings(row, fact.warnings);
  appendDetail(row, fact);
  row.factIds.add(fact.id);
  for (const rawRowId of fact.rawRowIds) {
    row.rawRowIds.add(rawRowId);
  }

  if (fact.isAdditive) {
    if (moneyMetric !== undefined && fact.amount?.kind === "money") {
      addMoney(row.totals[moneyMetric], fact.amount);
    }

    if (hoursMetric !== undefined && fact.hours?.kind === "hours") {
      addHours(row.totals[hoursMetric], fact.hours);
    }
  }

  row.confidence = lowerConfidence(row.confidence, fact.confidence);
  rows.set(rowId, row);
}

function createRow(id: string, scope: DashboardScope): MutableProjectRow {
  return {
    id,
    scope: { ...scope },
    totals: zeroTotals(),
    rowType: "source_only",
    warnings: [],
    sourceTrace: [],
    sourceLabels: [],
    confidence: "high",
    factIds: new Set<string>(),
    rawRowIds: new Set<string>(),
    detail: {
      monthlyRows: [],
      roleRows: [],
      floatTraceRows: []
    }
  };
}

function zeroTotals(): DashboardTotals {
  return {
    soldFee: zeroMoney(),
    soldHours: zeroHours(),
    pipelineFee: zeroMoney(),
    productionRevenue: zeroMoney(),
    floatHours: zeroHours()
  };
}

function zeroMoney(): MetricValue {
  return {
    kind: "money",
    value: {
      amountOriginal: 0,
      currencyOriginal: "GBP",
      amountGbp: 0,
      fxRateToGbp: 1,
      fxSource: "project_row_zero",
      fxCapturedAt: ""
    }
  };
}

function zeroHours(): MetricValue {
  return {
    kind: "hours",
    value: 0,
    unit: "decimal_hours"
  };
}

function applyFactIdentity(row: MutableProjectRow, fact: CanonFact): void {
  if (row.jobNumber === undefined && fact.jobNumber !== undefined) {
    row.jobNumber = fact.jobNumber;
  }
  if (row.sourceProjectName === undefined) {
    const sourceProjectName = fact.sourceProjectName ?? fact.projectName;
    if (sourceProjectName !== undefined) row.sourceProjectName = sourceProjectName;
  }
  if (row.canonicalProjectName === undefined) {
    const canonicalProjectName = fact.projectName ?? fact.sourceProjectName;
    if (canonicalProjectName !== undefined) row.canonicalProjectName = canonicalProjectName;
  }
  if (row.sourceClient === undefined) {
    const sourceClient = fact.sourceClient ?? fact.client;
    if (sourceClient !== undefined) row.sourceClient = sourceClient;
  }
  if (row.canonicalClient === undefined) {
    const canonicalClient = fact.canonicalClient ?? fact.client;
    if (canonicalClient !== undefined) row.canonicalClient = canonicalClient;
  }
  if (row.sourceFloatProjectId === undefined && fact.floatProjectId !== undefined) {
    row.sourceFloatProjectId = fact.floatProjectId;
  }
  if (row.canonicalFloatProjectId === undefined && fact.floatProjectId !== undefined) {
    row.canonicalFloatProjectId = fact.floatProjectId;
  }
}

function appendSourceLabel(row: MutableProjectRow, source: SourceName, sourceLayer: SourceLayer): void {
  if (
    row.sourceLabels.some(
      (sourceLabel) => sourceLabel.source === source && sourceLabel.sourceLayer === sourceLayer
    )
  ) {
    return;
  }

  row.sourceLabels.push({ source, sourceLayer });
}

function appendTrace(row: MutableProjectRow, traceRefs: readonly SourceTraceRef[]): void {
  for (const traceRef of traceRefs) {
    if (row.sourceTrace.some((existing) => sameTraceRef(existing, traceRef))) {
      continue;
    }

    row.sourceTrace.push({ ...traceRef });
  }
}

function appendWarnings(row: MutableProjectRow, warnings: readonly SourceWarning[]): void {
  for (const warning of warnings) {
    if (row.warnings.some((existing) => existing.id === warning.id)) {
      continue;
    }

    row.warnings.push(cloneWarning(warning));
    row.confidence = confidenceForWarning(row.confidence, warning);
  }
}

function addSourceIssueToMatchingRows(rows: Map<string, MutableProjectRow>, warning: SourceWarning): void {
  for (const row of rows.values()) {
    if (!warning.sourceRefs.some((sourceRef) => row.rawRowIds.has(sourceRef.rawRowId ?? ""))) {
      continue;
    }

    appendWarnings(row, [warning]);
  }
}

function addMoney(target: MetricValue, amount: MetricValue): void {
  if (target.kind !== "money" || amount.kind !== "money") {
    return;
  }

  target.value.amountOriginal += amount.value.amountOriginal;
  target.value.amountGbp += amount.value.amountGbp;
  target.value.currencyOriginal = amount.value.currencyOriginal;
  target.value.fxRateToGbp =
    target.value.amountOriginal === 0 ? 1 : target.value.amountGbp / target.value.amountOriginal;
}

function addHours(target: MetricValue, hours: MetricValue): void {
  if (target.kind !== "hours" || hours.kind !== "hours") {
    return;
  }

  target.value += hours.value;
}

function findFeeSheetRowKey(rows: Map<string, MutableProjectRow>, fact: CanonFact): string | undefined {
  const floatRowKey = findFeeSheetRowKeyByFloatId(rows, fact);
  if (floatRowKey !== undefined) {
    return floatRowKey;
  }

  if (fact.jobNumber === undefined || fact.jobNumber.trim() === "") {
    return undefined;
  }

  const normalizedJobNumber = normalizeIdentity(fact.jobNumber);

  for (const [rowKey, row] of rows.entries()) {
    if (!row.sourceLabels.some((sourceLabel) => sourceLabel.source === "fee_sheet")) {
      continue;
    }

    if (normalizeIdentity(row.jobNumber) === normalizedJobNumber) {
      return rowKey;
    }
  }

  return undefined;
}

function findFeeSheetRowKeyByFloatId(rows: Map<string, MutableProjectRow>, fact: CanonFact): string | undefined {
  if (fact.floatProjectId !== undefined && fact.floatProjectId.trim() !== "") {
    const floatRowKey = `project:float:${fact.floatProjectId}`;
    const floatRow = rows.get(floatRowKey);

    if (floatRow?.sourceLabels.some((sourceLabel) => sourceLabel.source === "fee_sheet") === true) {
      return floatRowKey;
    }
  }

  return undefined;
}

function finalizeRow(row: MutableProjectRow, unsupportedMetrics: readonly UnsupportedMetric[]): ProjectDisplayRow {
  const sourceNames = new Set(row.sourceLabels.map((sourceLabel) => sourceLabel.source));

  if (sourceNames.has("fee_sheet")) {
    row.rowType = "matched";
  } else if (sourceNames.size === 1 && sourceNames.has("float")) {
    row.rowType = "float_only";
  } else if (sourceNames.size === 1 && sourceNames.has("pipeline")) {
    row.rowType = "pipeline_only";
  } else if (sourceNames.size === 1 && sourceNames.has("production_revenue")) {
    row.rowType = "production_revenue_only";
  } else {
    row.rowType = "source_only";
  }

  for (const unsupportedMetric of unsupportedMetrics) {
    applyUnsupportedMetric(row, unsupportedMetric);
  }

  const detail = finalizeProjectDetail(row.detail);

  const { factIds: _factIds, rawRowIds: _rawRowIds, detail: _detail, ...publicRow } = row;
  return {
    ...publicRow,
    detail
  };
}

function appendDetail(row: MutableProjectRow, fact: CanonFact): void {
  if (!fact.isAdditive) return;

  appendMonthlyDetail(row.detail.monthlyRows, fact);
  appendRoleDetail(row.detail.roleRows, fact);
  appendFloatTrace(row.detail.floatTraceRows, fact);
}

function appendMonthlyDetail(rows: ProjectMonthlyDetailRow[], fact: CanonFact): void {
  if (fact.month === undefined) return;
  const row = findOrCreateMonthlyRow(rows, fact.month);

  if (fact.source === "fee_sheet") {
    if (fact.amount?.kind === "money") addMoney(row.soldFee, fact.amount);
    if (fact.hours?.kind === "hours") addHours(row.soldHours, fact.hours);
    appendDetailTrace(row.sourceTrace, fact.trace);
  }

  if (fact.source === "float" && fact.sourceLayer === "float_visible") {
    if (fact.hours?.kind === "hours") addHours(row.allocatedHours, fact.hours);
    appendDetailTrace(row.sourceTrace, fact.trace);
  }
}

function appendRoleDetail(rows: ProjectRoleDetailRow[], fact: CanonFact): void {
  if (fact.source !== "fee_sheet" && !(fact.source === "float" && fact.sourceLayer === "float_visible")) return;
  const role = fact.role ?? fact.department ?? "_unmapped";
  const row = findOrCreateRoleRow(rows, role);

  if (fact.source === "fee_sheet") {
    if (fact.amount?.kind === "money") addMoney(row.soldFee, fact.amount);
    if (fact.hours?.kind === "hours") addHours(row.soldHours, fact.hours);
    appendDetailTrace(row.sourceTrace, fact.trace);
  }

  if (fact.source === "float" && fact.hours?.kind === "hours") {
    addHours(row.allocatedHours, fact.hours);
    appendDetailTrace(row.sourceTrace, fact.trace);
  }
}

function appendFloatTrace(rows: ProjectFloatTraceRow[], fact: CanonFact): void {
  if (fact.source !== "float") return;

  rows.push({
    floatProject: fact.projectName ?? fact.sourceProjectName ?? fact.floatProjectId ?? "Unknown Float project",
    task: fact.taskId ?? fact.rawRowIds[0] ?? fact.id,
    person: fact.person ?? fact.personId ?? (fact.allocationClass === "placeholder" ? "Placeholder role" : "Unassigned"),
    departmentRole: [fact.department, fact.role].filter((value): value is string => value !== undefined && value.trim() !== "").join(" / ") || "_unmapped",
    dates: fact.from !== undefined && fact.to !== undefined ? `${fact.from} to ${fact.to}` : fact.month ?? "No source date",
    hours: cloneMetric(fact.hours ?? zeroHours()),
    flags: floatTraceFlags(fact),
    sourceTrace: fact.trace.map((traceRef) => ({ ...traceRef }))
  });
}

function findOrCreateMonthlyRow(rows: ProjectMonthlyDetailRow[], month: string): ProjectMonthlyDetailRow {
  const existing = rows.find((row) => row.month === month);
  if (existing !== undefined) return existing;

  const row: ProjectMonthlyDetailRow = {
    month,
    soldFee: zeroMoney(),
    soldHours: zeroHours(),
    allocatedHours: zeroHours(),
    allocatedValue: zeroMoney(),
    varianceHours: zeroHours(),
    sourceTrace: []
  };
  rows.push(row);
  return row;
}

function findOrCreateRoleRow(rows: ProjectRoleDetailRow[], role: string): ProjectRoleDetailRow {
  const existing = rows.find((row) => row.role === role);
  if (existing !== undefined) return existing;

  const row: ProjectRoleDetailRow = {
    role,
    soldHours: zeroHours(),
    soldFee: zeroMoney(),
    ratePerHour: zeroMoney(),
    allocatedHours: zeroHours(),
    allocatedValue: zeroMoney(),
    varianceValue: zeroMoney(),
    variancePercent: { kind: "count", value: 0 },
    sourceTrace: []
  };
  rows.push(row);
  return row;
}

function finalizeProjectDetail(detail: MutableProjectRow["detail"]): ProjectDetailEvidence {
  for (const row of detail.monthlyRows) {
    const rate = hourlyRate(row.soldFee, row.soldHours);
    setMoney(row.allocatedValue, metricHours(row.allocatedHours) * rate);
    setHours(row.varianceHours, metricHours(row.soldHours) - metricHours(row.allocatedHours));
  }

  for (const row of detail.roleRows) {
    const rate = hourlyRate(row.soldFee, row.soldHours);
    setMoney(row.ratePerHour, rate);
    setMoney(row.allocatedValue, metricHours(row.allocatedHours) * rate);
    setMoney(row.varianceValue, metricMoney(row.soldFee) - metricMoney(row.allocatedValue));
    setCount(row.variancePercent, metricMoney(row.soldFee) === 0 ? 0 : (metricMoney(row.varianceValue) / metricMoney(row.soldFee)) * 100);
  }

  return {
    monthlyRows: [...detail.monthlyRows].sort((left, right) => left.month.localeCompare(right.month)),
    roleRows: [...detail.roleRows].sort((left, right) => left.role.localeCompare(right.role)),
    floatTraceRows: [...detail.floatTraceRows]
  };
}

function hourlyRate(fee: MetricValue, hours: MetricValue): number {
  const hourValue = metricHours(hours);
  return hourValue === 0 ? 0 : metricMoney(fee) / hourValue;
}

function metricMoney(metric: MetricValue): number {
  return metric.kind === "money" ? metric.value.amountGbp : 0;
}

function metricHours(metric: MetricValue): number {
  return metric.kind === "hours" ? metric.value : 0;
}

function setMoney(metric: MetricValue, amountGbp: number): void {
  if (metric.kind !== "money") return;
  metric.value.amountOriginal = amountGbp;
  metric.value.amountGbp = amountGbp;
  metric.value.currencyOriginal = "GBP";
  metric.value.fxRateToGbp = 1;
}

function setHours(metric: MetricValue, value: number): void {
  if (metric.kind === "hours") metric.value = value;
}

function setCount(metric: MetricValue, value: number): void {
  if (metric.kind === "count") metric.value = value;
}

function appendDetailTrace(target: SourceTraceRef[], traceRefs: readonly SourceTraceRef[]): void {
  for (const traceRef of traceRefs) {
    if (!target.some((existing) => sameTraceRef(existing, traceRef))) {
      target.push({ ...traceRef });
    }
  }
}

function floatTraceFlags(fact: FloatFact): string[] {
  return [
    fact.sourceLayer,
    fact.activeState,
    fact.allocationClass,
    fact.tentative === true ? "tentative" : undefined,
    fact.expansionRule
  ].filter((value): value is string => value !== undefined && value.trim() !== "");
}

function cloneMetric(metric: MetricValue): MetricValue {
  if (metric.kind === "money") {
    return {
      kind: "money",
      value: { ...metric.value }
    };
  }

  if (metric.kind === "hours") {
    return {
      kind: "hours",
      value: metric.value,
      unit: metric.unit
    };
  }

  if (metric.kind === "count") {
    return {
      kind: "count",
      value: metric.value
    };
  }

  return {
    ...metric,
    scope: { ...metric.scope }
  };
}

function applyUnsupportedMetric(row: MutableProjectRow, unsupportedMetric: UnsupportedMetric): void {
  const metric = unsupportedMetric.metric;

  if (metric === "soldFee" || metric === "soldHours" || metric === "pipelineFee" || metric === "productionRevenue" || metric === "floatHours") {
    row.totals[metric] = cloneUnsupportedMetric(unsupportedMetric);
  }
}

function cloneUnsupportedMetric(metric: UnsupportedMetric): UnsupportedMetric {
  return {
    ...metric,
    scope: { ...metric.scope }
  };
}

function lowerConfidence(
  current: ProjectDisplayRow["confidence"],
  next: ProjectDisplayRow["confidence"]
): ProjectDisplayRow["confidence"] {
  if (current === "low" || next === "low") return "low";
  if (current === "medium" || next === "medium") return "medium";
  return "high";
}

function confidenceForWarning(
  current: ProjectDisplayRow["confidence"],
  warning: SourceWarning
): ProjectDisplayRow["confidence"] {
  if (warning.status === "FAIL") {
    return "low";
  }

  if (warning.status === "DATA_WARN" || warning.status === "PROCESS_WARN") {
    return lowerConfidence(current, "medium");
  }

  return current;
}

function sameTraceRef(left: SourceTraceRef, right: SourceTraceRef): boolean {
  return (
    left.source === right.source &&
    left.sourceLayer === right.sourceLayer &&
    left.batchId === right.batchId &&
    left.rawRowId === right.rawRowId &&
    left.sourceDocumentId === right.sourceDocumentId &&
    left.sourceTab === right.sourceTab &&
    left.sourceRowNumber === right.sourceRowNumber &&
    left.sourceObjectId === right.sourceObjectId &&
    left.field === right.field
  );
}

function cloneWarning(warning: SourceWarning): SourceWarning {
  return {
    ...warning,
    scope: { ...warning.scope },
    sourceRefs: warning.sourceRefs.map((sourceRef) => ({ ...sourceRef }))
  };
}

function normalizeIdentity(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}
