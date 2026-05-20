export type LaunchReadinessStatus = "pass" | "warn" | "fail";

export type LaunchReadinessCheck = {
  readonly code: string;
  readonly status: LaunchReadinessStatus;
  readonly message: string;
};

export type LaunchReadinessReport = {
  readonly status: LaunchReadinessStatus;
  readonly checks: readonly LaunchReadinessCheck[];
  readonly blockers: readonly LaunchReadinessCheck[];
  readonly warnings: readonly LaunchReadinessCheck[];
};

export type RuntimeReadinessSummary = {
  readonly environment: string;
  readonly supabaseRef: string;
  readonly mutationGuard: string;
  readonly databaseHost: string;
};

export type RuntimeReadinessReport = LaunchReadinessReport & {
  readonly summary: RuntimeReadinessSummary;
};

export type BuildLaunchReadinessReportInput = {
  readonly packageScripts: Record<string, string | undefined>;
  readonly envExample: string;
  readonly routeFiles: readonly string[];
  readonly railwayMutatingCommandsRun: readonly string[];
};

export type BuildRuntimeReadinessReportInput = {
  readonly env: Record<string, string | undefined>;
};

const requiredEnvNames = [
  "APP_ENV",
  "MUTATION_GUARD",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "GOOGLE_SERVICE_ACCOUNT_KEY",
  "FEE_TRACKER_SPREADSHEET_ID",
  "FLOAT_API_KEY",
  "ANTHROPIC_API_KEY",
  "CRON_SECRET"
] as const;

const runtimeRequiredEnvNames = [
  "APP_ENV",
  "MUTATION_GUARD",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL"
] as const;

const forbiddenScriptNeedles = [
  ["FORBIDDEN_SCRIPT_DEPLOY", "deploy", "railway up"],
  ["FORBIDDEN_SCRIPT_SYNC", "sync", "supabase db push"],
  ["FORBIDDEN_SCRIPT_MIGRATE", "migration", "migration up"],
  ["FORBIDDEN_SCRIPT_DB_PUSH", "db-push", "db push"]
] as const;

export function buildLaunchReadinessReport(input: BuildLaunchReadinessReportInput): LaunchReadinessReport {
  const checks: LaunchReadinessCheck[] = [];

  checks.push(
    input.packageScripts.build === "npm run verify:phase8"
      ? pass("BUILD_GATES_PHASE8", "npm run build delegates to the Phase 8 gate.")
      : fail("BUILD_NOT_PHASE8", "npm run build must delegate to verify:phase8 before launch.")
  );

  checks.push(
    input.packageScripts["verify:phase9"] === "npm run build && node scripts/verify-phase9.mjs"
      ? pass("VERIFY_PHASE9_SCRIPT", "npm run verify:phase9 is wired to build plus the Phase 9 verifier.")
      : fail("VERIFY_PHASE9_SCRIPT_MISSING", "npm run verify:phase9 must exist before launch work continues.")
  );

  checks.push(routeCheck(input.routeFiles, "app/api/health/route.ts", "HEALTH_ROUTE", "HEALTH_ROUTE_MISSING"));
  checks.push(routeCheck(input.routeFiles, "app/api/readiness/route.ts", "READINESS_ROUTE", "READINESS_ROUTE_MISSING"));

  for (const envName of requiredEnvNames) {
    checks.push(envDeclarationCheck(input.envExample, envName));
  }

  checks.push(...forbiddenScriptChecks(input.packageScripts));

  checks.push(
    input.railwayMutatingCommandsRun.length === 0
      ? pass("NO_RAILWAY_MUTATION", "No Railway deploy or variable mutation command has been recorded for this gate.")
      : fail("RAILWAY_MUTATION_ALREADY_RUN", "Launch readiness must run before Railway deploy or variable mutation commands.")
  );

  const blockers = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  return {
    status: blockers.length > 0 ? "fail" : warnings.length > 0 ? "warn" : "pass",
    checks,
    blockers,
    warnings
  };
}

export function buildRuntimeReadinessReport(input: BuildRuntimeReadinessReportInput): RuntimeReadinessReport {
  const env = input.env;
  const checks: LaunchReadinessCheck[] = [];
  const supabaseRef = supabaseRefFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const databaseHost = hostFromDatabaseUrl(env.DATABASE_URL);

  for (const envName of runtimeRequiredEnvNames) {
    checks.push(
      hasValue(env[envName])
        ? pass(`ENV_PRESENT_${envName}`, `${envName} is present.`)
        : fail(`ENV_MISSING_${envName}`, `${envName} is required for runtime readiness.`)
    );
  }

  checks.push(
    env.MUTATION_GUARD === "read_only"
      ? pass("MUTATION_GUARD_READ_ONLY", "Mutation guard is read_only.")
      : fail("MUTATION_GUARD_NOT_READ_ONLY", "Mutation guard must be read_only at launch.")
  );

  checks.push(
    supabaseRef === "unknown"
      ? fail("NEXT_PUBLIC_SUPABASE_URL_INVALID", "NEXT_PUBLIC_SUPABASE_URL must be a Supabase project URL.")
      : pass("NEXT_PUBLIC_SUPABASE_URL_SUPABASE", "NEXT_PUBLIC_SUPABASE_URL identifies a Supabase project.")
  );

  checks.push(
    databaseHost === "unknown"
      ? fail("DATABASE_URL_INVALID", "DATABASE_URL must be a parseable database URL.")
      : pass("DATABASE_URL_PARSEABLE", "DATABASE_URL is parseable.")
  );

  if (hasValue(env.DATABASE_URL) && hasValue(env.LEGACY_DATABASE_URL) && env.DATABASE_URL === env.LEGACY_DATABASE_URL) {
    checks.push(fail("DATABASE_URL_MATCHES_LEGACY", "DATABASE_URL must not equal LEGACY_DATABASE_URL."));
  }

  checks.push(
    supabaseRef !== "unknown" && databaseHost === `db.${supabaseRef}.supabase.co`
      ? pass("DATABASE_URL_NEW_SUPABASE", "DATABASE_URL host matches the new Supabase project ref.")
      : fail("DATABASE_URL_NOT_NEW_SUPABASE", "DATABASE_URL host must match the new Supabase project ref.")
  );

  const blockers = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  return {
    status: blockers.length > 0 ? "fail" : warnings.length > 0 ? "warn" : "pass",
    checks,
    blockers,
    warnings,
    summary: {
      environment: env.APP_ENV ?? "unknown",
      supabaseRef,
      mutationGuard: env.MUTATION_GUARD ?? "unknown",
      databaseHost
    }
  };
}

function routeCheck(
  routeFiles: readonly string[],
  routeFile: string,
  passCode: string,
  failCode: string
): LaunchReadinessCheck {
  return routeFiles.includes(routeFile)
    ? pass(passCode, `${routeFile} exists.`)
    : fail(failCode, `${routeFile} must exist before Railway launch.`);
}

function envDeclarationCheck(envExample: string, envName: string): LaunchReadinessCheck {
  const pattern = new RegExp(`^${escapeRegExp(envName)}=`, "m");
  return pattern.test(envExample)
    ? pass(`ENV_DECLARED_${envName}`, `${envName} is declared in .env.example without exposing a value.`)
    : fail(`ENV_MISSING_${envName}`, `${envName} must be declared in .env.example before launch.`);
}

function hasValue(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
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

function forbiddenScriptChecks(packageScripts: Record<string, string | undefined>): LaunchReadinessCheck[] {
  const checks: LaunchReadinessCheck[] = [];
  const entries = Object.entries(packageScripts);

  for (const [code, scriptNameNeedle, commandNeedle] of forbiddenScriptNeedles) {
    const match = entries.find(([scriptName, command]) => {
      const normalizedScriptName = scriptName.toLowerCase();
      const normalizedCommand = command?.toLowerCase() ?? "";
      return normalizedScriptName.includes(scriptNameNeedle) || normalizedCommand.includes(commandNeedle);
    });

    if (match === undefined) {
      checks.push(pass(`${code}_ABSENT`, `${commandNeedle} is not present in package scripts.`));
      continue;
    }

    checks.push(fail(code, `Package script ${match[0]} contains launch-mutating command ${commandNeedle}.`));
  }

  return checks;
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
