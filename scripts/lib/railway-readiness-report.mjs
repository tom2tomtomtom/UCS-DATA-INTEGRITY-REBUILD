export function buildRailwayTargetReport({ expected, railway, envPlan, railwayMutatingCommandsRun }) {
  const checks = [];
  const databaseHost = hostFromDatabaseUrl(envPlan.databaseUrl);
  const legacyDatabaseHost = hostFromDatabaseUrl(envPlan.legacyDatabaseUrl);
  const supabaseRef = supabaseRefFromUrl(envPlan.nextPublicSupabaseUrl);

  checks.push(
    railway.statusInspected
      ? pass("RAILWAY_STATUS_INSPECTED", "railway status has been inspected before deploy.")
      : fail("RAILWAY_STATUS_NOT_INSPECTED", "railway status must be inspected before deploy.")
  );

  if (!railway.linked) {
    checks.push(fail("RAILWAY_PROJECT_NOT_LINKED", "Railway CLI is not linked to a project/service for this repo."));
  } else {
    checks.push(...targetChecks(expected, railway));
  }

  checks.push(...envPlanChecks(expected.rebuildSupabaseRef, envPlan, databaseHost, legacyDatabaseHost));
  checks.push(...domainChecks(envPlan));
  checks.push(
    railwayMutatingCommandsRun.length === 0
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
      targetLinked: railway.linked,
      projectName: railway.projectName ?? "unlinked",
      serviceName: railway.serviceName ?? "unlinked",
      environmentName: railway.environmentName ?? "unknown",
      databaseHost,
      legacyDatabaseHost,
      supabaseRef,
      domainAction: envPlan.intendedDomainAction
    }
  };
}

function targetChecks(expected, railway) {
  const checks = [];
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

function envPlanChecks(rebuildSupabaseRef, envPlan, databaseHost, legacyDatabaseHost) {
  const checks = [];

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

function domainChecks(envPlan) {
  if (envPlan.intendedDomainAction !== "production_cutover") {
    return [pass("PRODUCTION_DOMAIN_NOT_CUT_OVER", "Production domain is not being cut over in this phase.")];
  }

  return [
    envPlan.productionDomainCutoverApproved
      ? pass("PRODUCTION_DOMAIN_CUTOVER_APPROVED", "Production domain cutover has explicit approval.")
      : fail("PRODUCTION_DOMAIN_CUTOVER_UNAPPROVED", "Production domain cutover must not happen in this phase without approval.")
  ];
}

function hostFromDatabaseUrl(value) {
  if (!hasValue(value)) {
    return "unknown";
  }

  try {
    return new URL(value).host.split(":")[0] ?? "unknown";
  } catch {
    return "unknown";
  }
}

function supabaseRefFromUrl(value) {
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

function hasValue(value) {
  return value !== undefined && value.trim() !== "";
}

function pass(code, message) {
  return {
    code,
    status: "pass",
    message
  };
}

function fail(code, message) {
  return {
    code,
    status: "fail",
    message
  };
}
