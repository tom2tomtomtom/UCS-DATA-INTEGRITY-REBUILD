import type { DashboardScope, SourceTraceRef } from "../canon/types";

export type DualRunMetric = "soldFee" | "soldHours" | "pipelineFee" | "productionRevenue" | "floatHours";

export type DualRunEvidenceRow = {
  readonly id: string;
  readonly comparisonKey?: string;
  readonly metric: DualRunMetric;
  readonly value: number | null;
  readonly sourceRefs: readonly SourceTraceRef[];
  readonly warnings?: readonly string[];
};

export type DualRunLane = {
  readonly label: string;
  readonly scope?: DashboardScope;
  readonly rows: readonly DualRunEvidenceRow[];
};

export type OldDashboardComparisonLane = DualRunLane & {
  readonly comparisonOnly: true;
};

export type DualRunComparisonInput = {
  readonly scope: DashboardScope;
  readonly sourceSnapshot: DualRunLane;
  readonly newDisplay: DualRunLane;
  readonly oldDashboard: OldDashboardComparisonLane | (DualRunLane & { readonly comparisonOnly: false });
  readonly tolerance?: number;
};

export type DualRunDifferenceClassification =
  | "old_bug"
  | "new_bug"
  | "source_issue"
  | "intentional_change"
  | "unresolved";

export type DualRunDifference = {
  readonly metric: DualRunMetric;
  readonly comparisonKey: string;
  readonly classification: DualRunDifferenceClassification;
  readonly oldValue: number | null;
  readonly newValue: number | null;
  readonly sourceValue: number | null;
  readonly sourceWarnings: readonly string[];
  readonly sourceRefs: readonly SourceTraceRef[];
  readonly message: string;
};

export type DualRunComparisonResult = {
  readonly status: "pass" | "warn" | "fail";
  readonly scope: DashboardScope;
  readonly differences: readonly DualRunDifference[];
  readonly warnings: readonly string[];
};

const defaultTolerance = 0.01;

export function compareDualRunSnapshots(input: DualRunComparisonInput): DualRunComparisonResult {
  if (input.oldDashboard.comparisonOnly !== true) {
    throw new Error("Old dashboard lane must be comparison evidence only.");
  }
  assertLaneScope("Source snapshot", input.scope, input.sourceSnapshot.scope);
  assertLaneScope("New display", input.scope, input.newDisplay.scope);
  assertLaneScope("Old dashboard", input.scope, input.oldDashboard.scope);

  const tolerance = input.tolerance ?? defaultTolerance;
  const differences: DualRunDifference[] = [];
  const rowKeys = new Set<string>([
    ...input.sourceSnapshot.rows.map(rowGroupKey),
    ...input.newDisplay.rows.map(rowGroupKey),
    ...input.oldDashboard.rows.map(rowGroupKey)
  ]);

  for (const key of rowKeys) {
    const sourceRows = input.sourceSnapshot.rows.filter((row) => rowGroupKey(row) === key);
    const newRows = input.newDisplay.rows.filter((row) => rowGroupKey(row) === key);
    const oldRows = input.oldDashboard.rows.filter((row) => rowGroupKey(row) === key);
    const metric = metricForKey(key, [...sourceRows, ...newRows, ...oldRows]);
    const comparisonKey = comparisonKeyForRows(key, [...sourceRows, ...newRows, ...oldRows]);
    const sourceValue = sumRows(sourceRows);
    const newValue = sumRows(newRows);
    const oldValue = sumRows(oldRows);
    const sourceWarnings = warningsFor(sourceRows);

    if (sourceWarnings.length === 0 && valuesEqual(sourceValue, newValue, tolerance) && valuesEqual(newValue, oldValue, tolerance)) {
      continue;
    }

    const classification = classifyDifference({
      sourceValue,
      newValue,
      oldValue,
      sourceWarnings,
      newWarnings: warningsFor(newRows),
      oldWarnings: warningsFor(oldRows),
      tolerance
    });

    differences.push({
      metric,
      comparisonKey,
      classification,
      oldValue,
      newValue,
      sourceValue,
      sourceWarnings,
      sourceRefs: refsFor([...sourceRows, ...newRows, ...oldRows]),
      message: messageFor(classification, metric, comparisonKey, { sourceValue, newValue, oldValue })
    });
  }

  return {
    status: statusForDifferences(differences),
    scope: { ...input.scope },
    differences,
    warnings: differences.some((difference) => difference.sourceWarnings.length > 0)
      ? ["source_snapshot_has_open_warnings"]
      : []
  };
}

function classifyDifference(input: {
  readonly sourceValue: number | null;
  readonly newValue: number | null;
  readonly oldValue: number | null;
  readonly sourceWarnings: readonly string[];
  readonly newWarnings: readonly string[];
  readonly oldWarnings: readonly string[];
  readonly tolerance: number;
}): DualRunDifferenceClassification {
  if (input.sourceValue !== null && input.newValue === null) {
    return "new_bug";
  }

  if (input.sourceWarnings.length > 0 && valuesEqual(input.newValue, input.oldValue, input.tolerance)) {
    return "source_issue";
  }

  if (valuesEqual(input.sourceValue, input.newValue, input.tolerance) && !valuesEqual(input.sourceValue, input.oldValue, input.tolerance)) {
    return "old_bug";
  }

  if (valuesEqual(input.sourceValue, input.oldValue, input.tolerance) && !valuesEqual(input.sourceValue, input.newValue, input.tolerance)) {
    return "new_bug";
  }

  if (input.newWarnings.includes("intentional_change")) {
    return "intentional_change";
  }

  return "unresolved";
}

function messageFor(
  classification: DualRunDifferenceClassification,
  metric: DualRunMetric,
  comparisonKey: string,
  values: Pick<DualRunDifference, "sourceValue" | "newValue" | "oldValue">
): string {
  if (classification === "new_bug" && values.sourceValue !== null && values.newValue === null) {
    return `${metric} row ${comparisonKey} is missing from the new display contract.`;
  }

  if (classification === "unresolved") {
    return `${metric} row ${comparisonKey} is unresolved because all lanes disagree: source=${values.sourceValue}, new=${values.newValue}, old=${values.oldValue}.`;
  }

  if (classification === "source_issue") {
    return `${metric} differs because source evidence carries an open warning. The dashboard must surface it rather than choose a winner.`;
  }

  if (classification === "old_bug") {
    return `${metric} differs only in the old dashboard comparison lane.`;
  }

  if (classification === "new_bug") {
    return `${metric} differs in the new display contract while old and source agree.`;
  }

  return `${metric} differs by an explicitly marked intentional change.`;
}

function sumRows(rows: readonly DualRunEvidenceRow[]): number | null {
  if (rows.length === 0) return null;

  let total = 0;
  for (const row of rows) {
    if (row.value === null) return null;
    total += row.value;
  }
  return total;
}

function rowGroupKey(row: DualRunEvidenceRow): string {
  return `${row.metric}:${row.comparisonKey ?? row.id}`;
}

function rowComparisonKey(row: DualRunEvidenceRow): string {
  return row.comparisonKey ?? row.id;
}

function comparisonKeyForRows(key: string, rows: readonly DualRunEvidenceRow[]): string {
  const firstRow = rows[0];
  if (firstRow !== undefined) return rowComparisonKey(firstRow);

  return key.includes(":") ? key.split(":").slice(1).join(":") : key;
}

function metricForKey(key: string, rows: readonly DualRunEvidenceRow[]): DualRunMetric {
  const firstRow = rows[0];
  if (firstRow !== undefined) return firstRow.metric;
  return key.split(":")[0] as DualRunMetric;
}

function statusForDifferences(differences: readonly DualRunDifference[]): "pass" | "warn" | "fail" {
  if (differences.length === 0) return "pass";
  if (differences.some((difference) => difference.classification === "new_bug" || difference.classification === "unresolved")) {
    return "fail";
  }
  return "warn";
}

function assertLaneScope(label: string, scope: DashboardScope, laneScope: DashboardScope | undefined): void {
  if (laneScope === undefined) return;
  if (JSON.stringify(normalizeScope(laneScope)) !== JSON.stringify(normalizeScope(scope))) {
    throw new Error(`${label} lane scope must match the comparison scope.`);
  }
}

function normalizeScope(scope: DashboardScope): DashboardScope {
  return Object.fromEntries(
    Object.entries(scope).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b))
  ) as DashboardScope;
}

function valuesEqual(a: number | null, b: number | null, tolerance: number): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= tolerance;
}

function warningsFor(rows: readonly DualRunEvidenceRow[]): readonly string[] {
  return rows.flatMap((row) => row.warnings ?? []);
}

function refsFor(rows: readonly DualRunEvidenceRow[]): readonly SourceTraceRef[] {
  return rows.flatMap((row) => row.sourceRefs.map((sourceRef) => ({ ...sourceRef })));
}
