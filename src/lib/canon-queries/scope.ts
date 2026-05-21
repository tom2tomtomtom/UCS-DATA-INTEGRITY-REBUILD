import type {
  CanonFact,
  DashboardConcreteOffice,
  DashboardScope,
  SourceCapability,
  SourceCapabilityKey,
  SourceName,
  UnsupportedMetric
} from "../canon/types";
import type { UnsupportedScopeMetricInput } from "./types";

const SCOPED_CAPABILITY_KEYS = ["department", "role", "person"] as const satisfies readonly SourceCapabilityKey[];

export function factMatchesScope(
  fact: CanonFact,
  scope: DashboardScope,
  capabilities: readonly SourceCapability[] = []
): boolean {
  if (!matchesOffice(fact, scope)) return false;
  if (!matchesDateRange(fact, scope)) return false;
  if (!matchesExactValue(fact.jobNumber, scope.jobNumber)) return false;
  if (!matchesExactValue(fact.floatProjectId, scope.floatProjectId)) return false;
  if (!matchesExactClient(fact, scope.client)) return false;
  if (!matchesSearch(fact, scope.search)) return false;
  if (!matchesCapabilityScopedValue(fact.department, scope.department, "department", capabilities)) return false;
  if (!matchesCapabilityScopedValue(fact.role, scope.role, "role", capabilities)) return false;

  return true;
}

export function filterFactsByScope<TFact extends CanonFact>(
  facts: readonly TFact[],
  scope: DashboardScope,
  capabilities: readonly SourceCapability[] = []
): TFact[] {
  return facts.filter((fact) => factMatchesScope(fact, scope, capabilities));
}

export function createUnsupportedScopeMetrics(input: UnsupportedScopeMetricInput): UnsupportedMetric[] {
  const unsupported: UnsupportedMetric[] = [];

  for (const key of SCOPED_CAPABILITY_KEYS) {
    const requestedValue = scopeValueForKey(input.scope, key);
    if (requestedValue === undefined) {
      continue;
    }

    const capability = capabilityFor(input.capabilities, key);
    if (capability?.status !== "unsupported") {
      continue;
    }

    unsupported.push({
      kind: "unsupported",
      metric: key,
      scope: { ...input.scope },
      source: input.source,
      reason: capability.reason ?? `${input.source} does not support ${key} scope.`,
      displayLabel: "Unsupported",
      severity: "warn"
    });
  }

  return unsupported;
}

export function capabilityFor(
  capabilities: readonly SourceCapability[],
  key: SourceCapabilityKey
): SourceCapability | undefined {
  return capabilities.find((capability) => capability.key === key);
}

export function sourceSupportsScopedField(
  capabilities: readonly SourceCapability[],
  key: SourceCapabilityKey
): boolean {
  return capabilityFor(capabilities, key)?.status !== "unsupported";
}

function matchesOffice(fact: CanonFact, scope: DashboardScope): boolean {
  if (scope.offices !== undefined && scope.offices.length > 0) {
    return isConcreteOffice(fact.office) && scope.offices.includes(fact.office);
  }

  return scope.office === "ALL" || fact.office === scope.office;
}

function isConcreteOffice(value: string | undefined): value is DashboardConcreteOffice {
  return value === "LDN" || value === "UCX" || value === "USA";
}

function matchesDateRange(fact: CanonFact, scope: DashboardScope): boolean {
  if (fact.month !== undefined) {
    const monthStart = `${fact.month.slice(0, 7)}-01`;
    const monthEnd = monthEndFor(monthStart);
    return monthStart <= scope.to && monthEnd >= scope.from;
  }

  if (fact.from !== undefined || fact.to !== undefined) {
    const from = fact.from ?? fact.to;
    const to = fact.to ?? fact.from;

    if (from === undefined || to === undefined) {
      return true;
    }

    return from <= scope.to && to >= scope.from;
  }

  return true;
}

function matchesExactValue(actual: string | undefined, expected: string | undefined): boolean {
  if (expected === undefined || expected.trim() === "") {
    return true;
  }

  return normalize(actual) === normalize(expected);
}

function matchesExactClient(fact: CanonFact, expectedClient: string | undefined): boolean {
  if (expectedClient === undefined || expectedClient.trim() === "") {
    return true;
  }

  const expected = normalize(expectedClient);
  return [fact.canonicalClient, fact.client, fact.sourceClient].some((client) => normalize(client) === expected);
}

function matchesSearch(fact: CanonFact, search: string | undefined): boolean {
  const normalizedSearch = normalize(search);
  if (normalizedSearch === "") {
    return true;
  }

  const haystack = [
    fact.jobNumber,
    fact.floatProjectId,
    fact.client,
    fact.sourceClient,
    fact.canonicalClient,
    fact.projectName,
    fact.sourceProjectName,
    fact.department,
    fact.role,
    fact.person
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");

  return haystack.includes(normalizedSearch);
}

function matchesCapabilityScopedValue(
  actual: string | undefined,
  expected: string | undefined,
  key: SourceCapabilityKey,
  capabilities: readonly SourceCapability[]
): boolean {
  if (expected === undefined || expected.trim() === "") {
    return true;
  }

  if (!sourceSupportsScopedField(capabilities, key)) {
    return true;
  }

  return normalize(actual) === normalize(expected);
}

function scopeValueForKey(scope: DashboardScope, key: SourceCapabilityKey): string | undefined {
  if (key === "department") return scope.department;
  if (key === "role") return scope.role;
  return undefined;
}

function monthEndFor(monthStart: string): string {
  const [yearPart, monthPart] = monthStart.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) {
    return monthStart;
  }

  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return end.toISOString().slice(0, 10);
}

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function queryResultSource<TFact extends CanonFact>(facts: readonly TFact[]): SourceName | undefined {
  return facts[0]?.source;
}
