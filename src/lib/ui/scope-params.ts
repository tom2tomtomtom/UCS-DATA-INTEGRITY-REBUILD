import type { DashboardScope } from "../index";

export type UiSearchParams = Record<string, string | string[] | undefined>;

export function scopeFromSearchParams(
  params: UiSearchParams,
  overrides: Partial<DashboardScope> = {}
): DashboardScope {
  const scope: DashboardScope = {
    office: (overrides.office ?? valueFor(params.office, "LDN")) as DashboardScope["office"],
    from: overrides.from ?? valueFor(params.from, "2026-01-01"),
    to: overrides.to ?? valueFor(params.to, "2026-03-31")
  };

  assignOptional(scope, "department", overrides.department ?? optionalValueFor(params.department));
  assignOptional(scope, "role", overrides.role ?? optionalValueFor(params.role));
  assignOptional(scope, "client", overrides.client ?? optionalValueFor(params.client));
  assignOptional(scope, "search", overrides.search ?? optionalValueFor(params.search));
  assignOptional(scope, "jobNumber", overrides.jobNumber ?? optionalValueFor(params.jobNumber));
  assignOptional(scope, "floatProjectId", overrides.floatProjectId ?? optionalValueFor(params.floatProjectId));

  return scope;
}

function valueFor(value: string | string[] | undefined, fallback: string): string {
  return optionalValueFor(value) ?? fallback;
}

function optionalValueFor(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === undefined || raw.trim() === "" ? undefined : raw;
}

function assignOptional(
  scope: DashboardScope,
  key: keyof Omit<DashboardScope, "office" | "from" | "to">,
  value: string | undefined
): void {
  if (value !== undefined) {
    scope[key] = value;
  }
}
