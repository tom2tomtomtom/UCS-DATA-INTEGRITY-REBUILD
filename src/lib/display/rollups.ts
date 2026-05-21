import type {
  CanonFact,
  DashboardScope,
  MetricValue,
  FloatFact,
  PipelineFact,
  ProductionRevenueFact,
  SoldFact,
  SourceName,
  SourceTraceRef,
  SourceWarning,
  UnsupportedMetric
} from "../canon/types";
import { filterFactsByScope } from "../canon-queries/scope";
import type { DashboardTotals, RollupFloatBreakdown, RollupRow } from "./contract";

export type RollupDimension = "department" | "role" | "client" | "month";

export type BuildRollupsInput = {
  readonly scope: DashboardScope;
  readonly soldFacts: readonly SoldFact[];
  readonly floatFacts?: readonly FloatFact[];
  readonly pipelineFacts?: readonly PipelineFact[];
  readonly productionRevenueFacts?: readonly ProductionRevenueFact[];
};

export type DisplayRollups = {
  readonly byDepartment: RollupRow[];
  readonly byRole: RollupRow[];
  readonly byMonth: RollupRow[];
  readonly byClient: RollupRow[];
};

type OptionalScopeKey = Exclude<keyof DashboardScope, "office" | "from" | "to">;

const optionalScopeKeys = [
  "department",
  "role",
  "client",
  "search",
  "jobNumber",
  "floatProjectId"
] as const satisfies readonly OptionalScopeKey[];

export function buildDisplayRollups(input: BuildRollupsInput): DisplayRollups {
  return {
    byDepartment: buildDepartmentRollups(input),
    byRole: buildRoleRollups(input),
    byMonth: buildMonthRollups(input),
    byClient: buildClientRollups(input)
  };
}

export function buildDepartmentRollups(input: BuildRollupsInput): RollupRow[] {
  return buildRollupsForDimension(input, "department");
}

export function buildRoleRollups(input: BuildRollupsInput): RollupRow[] {
  return buildRollupsForDimension(input, "role");
}

export function buildClientRollups(input: BuildRollupsInput): RollupRow[] {
  return buildRollupsForDimension(input, "client");
}

export function buildMonthRollups(input: BuildRollupsInput): RollupRow[] {
  return buildRollupsForDimension(input, "month");
}

export function scopeForRollupDrilldown(
  scope: DashboardScope,
  dimension: RollupDimension,
  value: string
): DashboardScope {
  if (dimension === "month") {
    return monthScope(scope, value);
  }

  const nextScope = preserveScopeForLink(scope);

  if (dimension === "client") {
    delete nextScope.search;
    nextScope.client = value;
    return nextScope;
  }

  if (dimension === "department") {
    nextScope.department = value;
    return nextScope;
  }

  nextScope.role = value;
  return nextScope;
}

export function preserveScopeForLink(
  scope: DashboardScope,
  overrides: Partial<DashboardScope> = {}
): DashboardScope {
  const nextScope: DashboardScope = {
    office: overrides.office ?? scope.office,
    from: overrides.from ?? scope.from,
    to: overrides.to ?? scope.to
  };
  const offices = overrides.offices ?? (overrides.office === undefined ? scope.offices : undefined);

  if (offices !== undefined && offices.length > 0) {
    nextScope.offices = offices;
  }

  for (const key of optionalScopeKeys) {
    const value = overrides[key] ?? scope[key];

    if (value !== undefined && value.trim() !== "") {
      nextScope[key] = value;
    }
  }

  return nextScope;
}

export function scopeToSearchParams(scope: DashboardScope): URLSearchParams {
  const params = new URLSearchParams();

  params.set("office", scope.office);
  params.set("from", scope.from);
  params.set("to", scope.to);

  if (scope.offices !== undefined && scope.offices.length > 0) {
    params.set("offices", scope.offices.join(","));
  }

  for (const key of optionalScopeKeys) {
    const value = scope[key];

    if (value !== undefined && value.trim() !== "") {
      params.set(key, value);
    }
  }

  return params;
}

export function scopedHref(
  pathname: string,
  scope: DashboardScope,
  overrides: Partial<DashboardScope> = {}
): string {
  const query = scopeToSearchParams(preserveScopeForLink(scope, overrides)).toString();
  return query === "" ? pathname : `${pathname}?${query}`;
}

function buildRollupsForDimension(input: BuildRollupsInput, dimension: RollupDimension): RollupRow[] {
  const scopedSoldFacts = filterFactsByScope(input.soldFacts, input.scope).filter((fact) => fact.isAdditive);
  const scopedFloatFacts = filterFactsByScope(input.floatFacts ?? [], input.scope).filter(
    (fact) => fact.isAdditive && fact.sourceLayer === "float_visible"
  );
  const scopedPipelineFacts = filterFactsByScope(input.pipelineFacts ?? [], input.scope).filter((fact) => fact.isAdditive);
  const scopedProductionRevenueFacts = filterFactsByScope(input.productionRevenueFacts ?? [], input.scope).filter(
    (fact) => fact.isAdditive
  );
  const grouped = groupLabelsByDimension(
    dimension,
    scopedSoldFacts,
    scopedFloatFacts,
    dimensionSupportsPipelineAndProduction(dimension) ? scopedPipelineFacts : [],
    dimensionSupportsPipelineAndProduction(dimension) ? scopedProductionRevenueFacts : []
  );

  return [...grouped]
    .sort((left, right) => left.localeCompare(right))
    .map((label) =>
      buildRollupRow(
        input,
        dimension,
        label,
        factsForDimensionLabel(scopedSoldFacts, dimension, label),
        factsForDimensionLabel(scopedFloatFacts, dimension, label)
      )
    );
}

function groupLabelsByDimension(
  dimension: RollupDimension,
  ...factGroups: readonly (readonly CanonFact[])[]
): Set<string> {
  const grouped = new Set<string>();

  for (const fact of factGroups.flat()) {
    const label = labelForDimension(fact, dimension);

    if (label === undefined || label.trim() === "") {
      continue;
    }

    grouped.add(label);
  }

  return grouped;
}

function factsForDimensionLabel<TFact extends CanonFact>(
  facts: readonly TFact[],
  dimension: RollupDimension,
  label: string
): TFact[] {
  return facts.filter((fact) => labelForDimension(fact, dimension) === label);
}

function buildRollupRow(
  input: BuildRollupsInput,
  dimension: RollupDimension,
  label: string,
  soldFacts: readonly SoldFact[],
  floatFacts: readonly FloatFact[]
): RollupRow {
  const scope = scopeForRollupDrilldown(input.scope, dimension, label);
  const pipelineFacts = dimensionSupportsPipelineAndProduction(dimension)
    ? filterFactsByScope(input.pipelineFacts ?? [], scope).filter((fact) => fact.isAdditive)
    : [];
  const productionRevenueFacts = dimensionSupportsPipelineAndProduction(dimension)
    ? filterFactsByScope(input.productionRevenueFacts ?? [], scope).filter((fact) => fact.isAdditive)
    : [];
  const totals: DashboardTotals = {
    soldFee: sumMoneyMetric(soldFacts, "amount"),
    soldHours: sumHoursMetric(soldFacts, "hours"),
    pipelineFee: pipelineTotalFor(dimension, scope, pipelineFacts),
    productionRevenue: productionRevenueTotalFor(dimension, scope, productionRevenueFacts),
    floatHours: sumHoursMetric(floatFacts, "hours")
  };

  return {
    id: `${dimension}:${slug(label)}`,
    scope,
    label,
    totals,
    floatBreakdown: buildFloatBreakdown(floatFacts),
    unsupported: unsupportedFromTotals(totals),
    warnings: collectWarnings(soldFacts, floatFacts, pipelineFacts, productionRevenueFacts),
    sourceTrace: collectTrace(soldFacts, floatFacts, pipelineFacts, productionRevenueFacts)
  };
}

function buildFloatBreakdown(floatFacts: readonly FloatFact[]): RollupFloatBreakdown {
  const allocatedFacts = floatFacts.filter((fact) => fact.allocationClass === "allocated");
  const unallocatedFacts = floatFacts.filter(
    (fact) => fact.allocationClass === "unallocated" || fact.allocationClass === "placeholder"
  );
  const unclassifiedFacts = floatFacts.filter(
    (fact) =>
      fact.allocationClass === undefined ||
      fact.allocationClass === "orphan" ||
      fact.allocationClass === "pencil"
  );
  const unclassifiedHours = sumHoursMetric(unclassifiedFacts, "hours");

  return {
    allocatedHours: sumHoursMetric(allocatedFacts, "hours"),
    unallocatedHours: sumHoursMetric(unallocatedFacts, "hours"),
    unclassifiedHours,
    splitStatus: metricNumber(unclassifiedHours) > 0 ? "partial" : "supported"
  };
}

function pipelineTotalFor(
  dimension: RollupDimension,
  scope: DashboardScope,
  facts: readonly PipelineFact[]
): MetricValue {
  if (!dimensionSupportsPipelineAndProduction(dimension)) {
    return unsupportedTotal(
      "pipelineFee",
      scope,
      "pipeline",
      `Pipeline does not support ${dimension} rollup attribution.`
    );
  }

  return sumMoneyMetric(facts, "amount");
}

function productionRevenueTotalFor(
  dimension: RollupDimension,
  scope: DashboardScope,
  facts: readonly ProductionRevenueFact[]
): MetricValue {
  if (!dimensionSupportsPipelineAndProduction(dimension)) {
    return unsupportedTotal(
      "productionRevenue",
      scope,
      "production_revenue",
      `Production Revenue does not support ${dimension} rollup attribution.`
    );
  }

  return sumMoneyMetric(facts, "amount");
}

function dimensionSupportsPipelineAndProduction(dimension: RollupDimension): boolean {
  return dimension === "client" || dimension === "month";
}

function labelForDimension(fact: CanonFact, dimension: RollupDimension): string | undefined {
  if (dimension === "department") return fact.department ?? "_unmapped";
  if (dimension === "role") return fact.role ?? fact.department ?? "_unmapped";
  if (dimension === "client") return fact.canonicalClient ?? fact.client ?? fact.sourceClient;
  return fact.month ?? fact.from?.slice(0, 7) ?? fact.to?.slice(0, 7);
}

function sumMoneyMetric(facts: readonly CanonFact[], key: "amount"): MetricValue {
  let amountOriginal = 0;
  let amountGbp = 0;
  let currencyOriginal: "GBP" | "USD" | "EUR" | "SEK" | "UNKNOWN" = "GBP";

  for (const fact of facts) {
    const metric = fact[key];

    if (metric?.kind !== "money") {
      continue;
    }

    amountOriginal += metric.value.amountOriginal;
    amountGbp += metric.value.amountGbp;
    currencyOriginal = metric.value.currencyOriginal;
  }

  return {
    kind: "money",
    value: {
      amountOriginal,
      currencyOriginal,
      amountGbp,
      fxRateToGbp: amountOriginal === 0 ? 1 : amountGbp / amountOriginal,
      fxSource: "display_rollup_additive_facts",
      fxCapturedAt: ""
    }
  };
}

function sumHoursMetric(facts: readonly CanonFact[], key: "hours"): MetricValue {
  let value = 0;

  for (const fact of facts) {
    const metric = fact[key];

    if (metric?.kind === "hours") {
      value += metric.value;
    }
  }

  return {
    kind: "hours",
    value,
    unit: "decimal_hours"
  };
}

function unsupportedTotal(
  metric: string,
  scope: DashboardScope,
  source: SourceName,
  reason: string
): UnsupportedMetric {
  return {
    kind: "unsupported",
    metric,
    scope: { ...scope },
    source,
    reason,
    displayLabel: "Unsupported",
    severity: "warn"
  };
}

function unsupportedFromTotals(totals: DashboardTotals): UnsupportedMetric[] {
  return Object.values(totals).filter((metric): metric is UnsupportedMetric => metric.kind === "unsupported");
}

function metricNumber(value: MetricValue): number {
  if (value.kind === "money") return value.value.amountGbp;
  if (value.kind === "hours" || value.kind === "count") return value.value;
  return 0;
}

function collectWarnings(
  ...factGroups: readonly (readonly CanonFact[])[]
): SourceWarning[] {
  return factGroups.flatMap((facts) => facts.flatMap((fact) => fact.warnings.map((warning) => ({ ...warning }))));
}

function collectTrace(
  ...factGroups: readonly (readonly CanonFact[])[]
): SourceTraceRef[] {
  return factGroups.flatMap((facts) => facts.flatMap((fact) => fact.trace.map((ref) => ({ ...ref }))));
}

function monthScope(scope: DashboardScope, month: string): DashboardScope {
  const monthStart = `${month.slice(0, 7)}-01`;
  const monthEnd = monthEndFor(monthStart);

  return preserveScopeForLink(scope, {
    from: maxDate(scope.from, monthStart),
    to: minDate(scope.to, monthEnd)
  });
}

function monthEndFor(monthStart: string): string {
  const [yearPart, monthPart] = monthStart.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) {
    return monthStart;
  }

  return new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);
}

function maxDate(left: string, right: string): string {
  return left > right ? left : right;
}

function minDate(left: string, right: string): string {
  return left < right ? left : right;
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}
