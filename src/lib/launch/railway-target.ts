import type { LaunchReadinessCheck, LaunchReadinessStatus } from "./readiness";

export type RailwayDomainAction = "none" | "railway_generated" | "production_cutover";

export type RailwayTargetSnapshot = {
  readonly statusInspected: boolean;
  readonly linked: boolean;
  readonly projectName?: string;
  readonly serviceName?: string;
  readonly environmentName?: string;
  readonly statusMessage?: string;
};

export type RailwayEnvPlanSnapshot = {
  readonly databaseUrl?: string;
  readonly legacyDatabaseUrl?: string;
  readonly nextPublicSupabaseUrl?: string;
  readonly intendedDomainAction: RailwayDomainAction;
  readonly productionDomainCutoverApproved: boolean;
};

export type ExpectedRailwayTarget = {
  readonly projectName: string;
  readonly serviceName: string;
  readonly rebuildSupabaseRef: string;
  readonly forbiddenTargetNeedles: readonly string[];
};

export type BuildRailwayTargetReportInput = {
  readonly expected: ExpectedRailwayTarget;
  readonly railway: RailwayTargetSnapshot;
  readonly envPlan: RailwayEnvPlanSnapshot;
  readonly railwayMutatingCommandsRun: readonly string[];
};

export type RailwayTargetSummary = {
  readonly targetLinked: boolean;
  readonly projectName: string;
  readonly serviceName: string;
  readonly environmentName: string;
  readonly databaseHost: string;
  readonly legacyDatabaseHost: string;
  readonly supabaseRef: string;
  readonly domainAction: RailwayDomainAction;
};

export type RailwayTargetReport = {
  readonly status: LaunchReadinessStatus;
  readonly checks: readonly LaunchReadinessCheck[];
  readonly blockers: readonly LaunchReadinessCheck[];
  readonly warnings: readonly LaunchReadinessCheck[];
  readonly summary: RailwayTargetSummary;
};

export function buildRailwayTargetReport(input: BuildRailwayTargetReportInput): RailwayTargetReport {
  const checks: LaunchReadinessCheck[] = [];
  const databaseHost = hostFromDatabaseUrl(input.envPlan.databaseUrl);
  const legacyDatabaseHost = hostFromDatabaseUrl(input.envPlan.legacyDatabaseUrl);
  const supabaseRef = supabaseRefFromUrl(input.envPlan.nextPublicSupabaseUrl);

  checks.push(
    input.railway.statusInspected
      ? pass("RAILWAY_STATUS_INSPECTED", "railway status has been inspected before deploy.")
      : fail("RAILWAY_STATUS_NOT_INSPECTED", "railway status must be inspected before deploy.")
  );

  if (!input.railway.linked) {
    checks.push(fail("RAILWAY_PROJECT_NOT_LINKED", "Railway CLI is not linked to a project/service for this repo."));
  } else {
    checks.push(...targetChecks(input.expected, input.railway));
  }

  checks.push(...envPlanChecks(input.expected.rebuildSupabaseRef, input.envPlan, databaseHost, legacyDatabaseHost));
  checks.push(...domainChecks(input.envPlan));
  checks.push(
    input.railwayMutatingCommandsRun.length === 0
      ? pass("NO_RAILWAY_MUTATION", "No Railway deploy or variable mutation command has been recorded for this gate.")
      : fail("RAILWAY_MUTATION_ALREADY_RUN", "Railway deploy or variable mutation commands must not run before target approval.")
  );

  const blockers = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  return {
    status: blockers.length > 0 ? "fail" : warnings.length > 0 ? "warn" : "pass",
    checks,
    blockers,
    warnings,
    summary: {
      targetLinked: input.railway.linked,
      projectName: input.railway.projectName ?? "unlinked",
      serviceName: input.railway.serviceName ?? "unlinked",
      environmentName: input.railway.environmentName ?? "unknown",
      databaseHost,
      legacyDatabaseHost,
      supabaseRef,
      domainAction: input.envPlan.intendedDomainAction
    }
  };
}

function targetChecks(expected: ExpectedRailwayTarget, railway: RailwayTargetSnapshot): LaunchReadinessCheck[] {
  const checks: LaunchReadinessCheck[] = [];
  const combinedTarget = `${railway.projectName ?? ""} ${railway.serviceName ?? ""}`.toLowerCase();
  const forbiddenMatch = expected.forbiddenTargetNeedles.find((needle) => combinedTarget.includes(needle.toLowerCase()));

  checks.push(
    forbiddenMatch === undefined
      ? pass("RAILWAY_TARGET_NOT_FORBIDDEN", "Railway target does not match the known old dashboard target names.")
      : fail("RAILWAY_TARGET_FORBIDDEN", "Railway target matches a known old dashboard project or service name.")
  );

  checks.push(
    railway.projectName === expected.projectName
      ? pass("RAILWAY_PROJECT_REBUILD", "Railway project is the rebuild project.")
      : fail("RAILWAY_PROJECT_UNCONFIRMED", "Railway project is not confirmed as the rebuild project.")
  );

  checks.push(
    railway.serviceName === expected.serviceName
      ? pass("RAILWAY_SERVICE_REBUILD", "Railway service is the rebuild service.")
      : fail("RAILWAY_SERVICE_UNCONFIRMED", "Railway service is not confirmed as the rebuild service.")
  );

  checks.push(
    railway.projectName === expected.projectName && railway.serviceName === expected.serviceName
      ? pass("RAILWAY_TARGET_REBUILD", "Railway target is confirmed as the rebuild service.")
      : fail("RAILWAY_TARGET_NOT_REBUILD", "Railway target must be confirmed as the separate rebuild service.")
  );

  checks.push(
    hasValue(railway.environmentName)
      ? pass("RAILWAY_ENVIRONMENT_SELECTED", "Railway environment is selected.")
      : fail("RAILWAY_ENVIRONMENT_MISSING", "Railway environment must be selected before deploy.")
  );

  return checks;
}

function envPlanChecks(
  rebuildSupabaseRef: string,
  envPlan: RailwayEnvPlanSnapshot,
  databaseHost: string,
  legacyDatabaseHost: string
): LaunchReadinessCheck[] {
  const checks: LaunchReadinessCheck[] = [];

  checks.push(
    databaseHost === `db.${rebuildSupabaseRef}.supabase.co`
      ? pass("DATABASE_URL_REBUILD_SUPABASE", "DATABASE_URL host is the rebuild Supabase project.")
      : fail("DATABASE_URL_NOT_REBUILD_SUPABASE", "DATABASE_URL host must be the rebuild Supabase project.")
  );

  if (hasValue(envPlan.legacyDatabaseUrl) && envPlan.databaseUrl === envPlan.legacyDatabaseUrl) {
    checks.push(fail("DATABASE_URL_MATCHES_LEGACY", "DATABASE_URL must not equal LEGACY_DATABASE_URL."));
  }

  checks.push(
    hasValue(envPlan.legacyDatabaseUrl)
      ? pass("LEGACY_DATABASE_URL_COMPARISON_ONLY", "Old database is configured only through LEGACY_DATABASE_URL.")
      : pass("LEGACY_DATABASE_URL_ABSENT", "No old database URL is configured for Railway env plan.")
  );

  checks.push(
    legacyDatabaseHost === "unknown" || legacyDatabaseHost !== databaseHost
      ? pass("LEGACY_DATABASE_DISTINCT", "Legacy database host is absent or distinct from DATABASE_URL.")
      : fail("LEGACY_DATABASE_NOT_DISTINCT", "LEGACY_DATABASE_URL must be distinct from DATABASE_URL.")
  );

  return checks;
}

function domainChecks(envPlan: RailwayEnvPlanSnapshot): LaunchReadinessCheck[] {
  if (envPlan.intendedDomainAction !== "production_cutover") {
    return [pass("PRODUCTION_DOMAIN_NOT_CUT_OVER", "Production domain is not being cut over in this phase.")];
  }

  return [
    envPlan.productionDomainCutoverApproved
      ? pass("PRODUCTION_DOMAIN_CUTOVER_APPROVED", "Production domain cutover has explicit approval.")
      : fail("PRODUCTION_DOMAIN_CUTOVER_UNAPPROVED", "Production domain cutover must not happen in this phase without approval.")
  ];
}

function hostFromDatabaseUrl(value: string | undefined): string {
  if (!hasValue(value)) {
    return "unknown";
  }

  try {
    return new URL(value).host.split(":")[0] ?? "unknown";
  } catch {
    return "unknown";
  }
}

function supabaseRefFromUrl(value: string | undefined): string {
  if (!hasValue(value)) {
    return "unknown";
  }

  try {
    const host = new URL(value).host;
    return host.endsWith(".supabase.co") ? host.replace(".supabase.co", "") : "unknown";
  } catch {
    return "unknown";
  }
}

function hasValue(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
}

function pass(code: string, message: string): LaunchReadinessCheck {
  return {
    code,
    status: "pass",
    message
  };
}

function fail(code: string, message: string): LaunchReadinessCheck {
  return {
    code,
    status: "fail",
    message
  };
}
