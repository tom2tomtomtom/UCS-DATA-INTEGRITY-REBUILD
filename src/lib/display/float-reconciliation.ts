import type {
  CheckStatus,
  DashboardScope,
  FloatFact,
  MetricValue,
  ReconciliationCheck,
  SourceTraceRef
} from "../canon/types";
import { filterFactsByScope } from "../canon-queries/scope";

export type FloatReconciliationInput = {
  readonly scope: DashboardScope;
  readonly facts: readonly FloatFact[];
  readonly rawCacheDeltaToleranceHours?: number;
};

const DEFAULT_RAW_CACHE_DELTA_TOLERANCE_HOURS = 0.01;

type NamedRawCacheCheck = "BT_RAW_CACHE" | "PCS00250";

type FloatReconciliationGroup = {
  readonly key: string;
  readonly label: string;
  readonly scope: DashboardScope;
  readonly namedCheck?: NamedRawCacheCheck;
  readonly rawFacts: FloatFact[];
  readonly cacheFacts: FloatFact[];
  readonly visibleFacts: FloatFact[];
};

export function createFloatReconciliationChecks(
  input: FloatReconciliationInput
): ReconciliationCheck[] {
  const tolerance = input.rawCacheDeltaToleranceHours ?? DEFAULT_RAW_CACHE_DELTA_TOLERANCE_HOURS;
  const checks: ReconciliationCheck[] = [];

  for (const group of groupFloatFacts(input.scope, filterFactsByScope(input.facts, input.scope))) {
    const rawHours = sumAdditiveHours(group.rawFacts);
    const cacheHours = sumAdditiveHours(group.cacheFacts);
    const visibleHours = sumAdditiveHours(group.visibleFacts);

    if (rawHours > 0 && cacheHours === 0) {
      checks.push(
        createCheck({
          group,
          code: rawCacheCodeFor(group, "FLOAT_RAW_CACHE_MISSING_CACHE"),
          status: "FAIL",
          idSuffix: "raw-cache-missing-cache",
          label: `${group.label} raw/cache reconciliation`,
          expected: hoursMetric(rawHours),
          actual: hoursMetric(0),
          sourceRefs: refsFor(group.rawFacts),
          tolerance,
          message: `${group.label} has ${formatHours(rawHours)} raw Float hours but no cache hours. Cache cannot replace or overwrite raw evidence.`
        })
      );
    }

    if (cacheHours > 0 && rawHours === 0) {
      checks.push(
        createCheck({
          group,
          code: rawCacheCodeFor(group, "FLOAT_CACHE_WITHOUT_RAW"),
          status: "PROCESS_WARN",
          idSuffix: "cache-without-raw",
          label: `${group.label} cache/raw reconciliation`,
          expected: hoursMetric(0),
          actual: hoursMetric(cacheHours),
          sourceRefs: refsFor(group.cacheFacts),
          tolerance,
          message: `${group.label} has ${formatHours(cacheHours)} cache-only Float hours. The raw source cannot currently prove it, so cache data stays warning evidence rather than a raw fact replacement.`
        })
      );
    }

    if (rawHours > 0 && cacheHours > 0 && Math.abs(rawHours - cacheHours) > tolerance) {
      checks.push(
        createCheck({
          group,
          code: rawCacheCodeFor(group, "FLOAT_RAW_CACHE_DELTA"),
          status: "DATA_WARN",
          idSuffix: "raw-cache-delta",
          label: `${group.label} raw/cache delta`,
          expected: hoursMetric(rawHours),
          actual: hoursMetric(cacheHours),
          sourceRefs: refsFor([...group.rawFacts, ...group.cacheFacts]),
          tolerance,
          message: `${group.label} raw Float hours (${formatHours(rawHours)}) differ from cache hours (${formatHours(cacheHours)}).`
        })
      );
    }

    if (visibleHours > 0 && cacheHours === 0) {
      checks.push(
        createCheck({
          group,
          code: "FLOAT_VISIBLE_CACHE_MISSING_CACHE",
          status: "FAIL",
          idSuffix: "visible-cache-missing-cache",
          label: `${group.label} visible/cache reconciliation`,
          expected: hoursMetric(cacheHours),
          actual: hoursMetric(visibleHours),
          sourceRefs: refsFor(group.visibleFacts),
          tolerance,
          message: `${group.label} has ${formatHours(visibleHours)} visible dashboard Float hours but no cache hours. Visible hours cannot be treated as reconciled without cache evidence.`
        })
      );
    }

    const inactiveVisibleFacts = group.visibleFacts.filter((fact) => {
      const activeState = fact.activeState ?? "unknown";
      return (activeState === "inactive" || activeState === "archived") && hoursFor(fact) > 0;
    });
    const inactiveVisibleHours = sumHours(inactiveVisibleFacts);

    if (inactiveVisibleHours > 0) {
      checks.push(
        createCheck({
          group,
          code: "FLOAT_INACTIVE_VISIBLE_HOURS",
          status: "FAIL",
          idSuffix: "inactive-visible-hours",
          label: `${group.label} inactive visible Float hours`,
          expected: hoursMetric(0),
          actual: hoursMetric(inactiveVisibleHours),
          sourceRefs: refsFor(inactiveVisibleFacts),
          tolerance,
          message: `${group.label} has ${formatHours(inactiveVisibleHours)} visible dashboard Float hours from inactive or archived Float evidence.`
        })
      );
    }
  }

  return checks;
}

function groupFloatFacts(
  scope: DashboardScope,
  facts: readonly FloatFact[]
): FloatReconciliationGroup[] {
  const groups = new Map<string, MutableFloatReconciliationGroup>();

  for (const fact of facts) {
    const identity = identityFor(fact);
    const namedCheck = namedRawCacheCheckFor(fact);
    const key = namedCheck === undefined ? identity.key : `${namedCheck}:${identity.key}`;
    const existing = groups.get(key);

    if (existing === undefined) {
      groups.set(key, {
        key,
        label: labelFor(identity, namedCheck),
        scope: scopeForGroup(scope, fact),
        ...(namedCheck !== undefined ? { namedCheck } : {}),
        rawFacts: [],
        cacheFacts: [],
        visibleFacts: []
      });
    } else if (existing.namedCheck === undefined && namedCheck !== undefined) {
      existing.namedCheck = namedCheck;
    }

    const group = groups.get(key);

    if (group === undefined) {
      continue;
    }

    if (fact.sourceLayer === "float_raw") {
      group.rawFacts.push(fact);
    }

    if (fact.sourceLayer === "float_cache") {
      group.cacheFacts.push(fact);
    }

    if (fact.sourceLayer === "float_visible") {
      group.visibleFacts.push(fact);
    }
  }

  return [...groups.values()];
}

type MutableFloatReconciliationGroup = {
  key: string;
  label: string;
  scope: DashboardScope;
  namedCheck?: NamedRawCacheCheck;
  rawFacts: FloatFact[];
  cacheFacts: FloatFact[];
  visibleFacts: FloatFact[];
};

type FloatIdentity = {
  readonly key: string;
  readonly label: string;
};

function identityFor(fact: FloatFact): FloatIdentity {
  if (fact.jobNumber !== undefined && fact.jobNumber.trim() !== "") {
    return {
      key: `job:${fact.jobNumber}`,
      label: fact.jobNumber
    };
  }

  if (fact.floatProjectId !== undefined && fact.floatProjectId.trim() !== "") {
    return {
      key: `float:${fact.floatProjectId}`,
      label: `Float ${fact.floatProjectId}`
    };
  }

  if (fact.projectName !== undefined && fact.projectName.trim() !== "") {
    return {
      key: `project:${fact.projectName}`,
      label: fact.projectName
    };
  }

  return {
    key: `fact:${fact.id}`,
    label: fact.id
  };
}

function namedRawCacheCheckFor(fact: FloatFact): NamedRawCacheCheck | undefined {
  const searchable = [
    fact.jobNumber,
    fact.floatProjectId,
    fact.client,
    fact.sourceClient,
    fact.canonicalClient,
    fact.projectName,
    fact.sourceProjectName
  ]
    .filter((value): value is string => value !== undefined && value.trim() !== "")
    .join(" ")
    .toLowerCase();

  if (searchable.includes("pcs00250")) {
    return "PCS00250";
  }

  if (/\bbt\b/.test(searchable) || searchable.includes("bt group")) {
    return "BT_RAW_CACHE";
  }

  return undefined;
}

function labelFor(identity: FloatIdentity, namedCheck: NamedRawCacheCheck | undefined): string {
  if (namedCheck === "BT_RAW_CACHE") {
    return `BT ${identity.label}`;
  }

  if (namedCheck === "PCS00250") {
    return "PCS00250";
  }

  return identity.label;
}

function scopeForGroup(scope: DashboardScope, fact: FloatFact): DashboardScope {
  return {
    ...scope,
    ...(fact.jobNumber !== undefined ? { jobNumber: fact.jobNumber } : {}),
    ...(fact.floatProjectId !== undefined ? { floatProjectId: fact.floatProjectId } : {})
  };
}

function rawCacheCodeFor(group: FloatReconciliationGroup, fallback: string): string {
  if (group.namedCheck === "BT_RAW_CACHE") {
    return "BT_RAW_CACHE_UNRESOLVED";
  }

  if (group.namedCheck === "PCS00250") {
    return "PCS00250_RAW_CACHE_UNRESOLVED";
  }

  return fallback;
}

function sumAdditiveHours(facts: readonly FloatFact[]): number {
  return sumHours(facts.filter((fact) => fact.isAdditive));
}

function sumHours(facts: readonly FloatFact[]): number {
  return facts.reduce((total, fact) => total + hoursFor(fact), 0);
}

function hoursFor(fact: FloatFact): number {
  if (fact.hours?.kind !== "hours") {
    return 0;
  }

  return fact.hours.value;
}

function hoursMetric(value: number): MetricValue {
  return {
    kind: "hours",
    value,
    unit: "decimal_hours"
  };
}

function refsFor(facts: readonly FloatFact[]): SourceTraceRef[] {
  return facts.flatMap((fact) => fact.trace.map((sourceRef) => ({ ...sourceRef })));
}

function createCheck(input: {
  readonly group: FloatReconciliationGroup;
  readonly code: string;
  readonly status: CheckStatus;
  readonly idSuffix: string;
  readonly label: string;
  readonly expected: MetricValue;
  readonly actual: MetricValue;
  readonly sourceRefs: readonly SourceTraceRef[];
  readonly tolerance: number;
  readonly message: string;
}): ReconciliationCheck {
  return {
    id: `float:${input.group.key}:${input.idSuffix}`,
    status: input.status,
    code: input.code,
    label: input.label,
    scope: { ...input.group.scope },
    sourceRefs: input.sourceRefs.map((sourceRef) => ({ ...sourceRef })),
    expected: input.expected,
    actual: input.actual,
    tolerance: input.tolerance,
    message: input.message
  };
}

function formatHours(hours: number): string {
  return `${hours}h`;
}
