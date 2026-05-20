export function buildLaunchReadinessReport({
  packageScripts,
  envExample,
  routeFiles,
  railwayMutatingCommandsRun
}) {
  const checks = [];

  checks.push(
    packageScripts.build === "npm run verify:phase8"
      ? pass("BUILD_GATES_PHASE8", "npm run build delegates to the Phase 8 gate.")
      : fail("BUILD_NOT_PHASE8", "npm run build must delegate to verify:phase8 before launch.")
  );
  checks.push(
    packageScripts["verify:phase9"] === "npm run build && node scripts/verify-phase9.mjs"
      ? pass("VERIFY_PHASE9_SCRIPT", "npm run verify:phase9 is wired to build plus the Phase 9 verifier.")
      : fail("VERIFY_PHASE9_SCRIPT_MISSING", "npm run verify:phase9 must exist before launch work continues.")
  );

  checks.push(routeCheck(routeFiles, "app/api/health/route.ts", "HEALTH_ROUTE", "HEALTH_ROUTE_MISSING"));
  checks.push(routeCheck(routeFiles, "app/api/readiness/route.ts", "READINESS_ROUTE", "READINESS_ROUTE_MISSING"));

  for (const envName of requiredEnvNames) {
    checks.push(envDeclarationCheck(envExample, envName));
  }

  checks.push(...forbiddenScriptChecks(packageScripts));
  checks.push(
    railwayMutatingCommandsRun.length === 0
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
];

const forbiddenScriptNeedles = [
  ["FORBIDDEN_SCRIPT_DEPLOY", "deploy", "railway up"],
  ["FORBIDDEN_SCRIPT_SYNC", "sync", "supabase db push"],
  ["FORBIDDEN_SCRIPT_MIGRATE", "migration", "migration up"],
  ["FORBIDDEN_SCRIPT_DB_PUSH", "db-push", "db push"]
];

function routeCheck(routeFiles, routeFile, passCode, failCode) {
  return routeFiles.includes(routeFile)
    ? pass(passCode, `${routeFile} exists.`)
    : fail(failCode, `${routeFile} must exist before Railway launch.`);
}

function envDeclarationCheck(envExample, envName) {
  return new RegExp(`^${escapeRegExp(envName)}=`, "m").test(envExample)
    ? pass(`ENV_DECLARED_${envName}`, `${envName} is declared in .env.example without exposing a value.`)
    : fail(`ENV_MISSING_${envName}`, `${envName} must be declared in .env.example before launch.`);
}

function forbiddenScriptChecks(packageScripts) {
  const checks = [];
  const entries = Object.entries(packageScripts);

  for (const [code, scriptNameNeedle, commandNeedle] of forbiddenScriptNeedles) {
    const match = entries.find(([scriptName, command]) => {
      const normalizedScriptName = scriptName.toLowerCase();
      const normalizedCommand = command?.toLowerCase() ?? "";
      return normalizedScriptName.includes(scriptNameNeedle) || normalizedCommand.includes(commandNeedle);
    });

    checks.push(
      match === undefined
        ? pass(`${code}_ABSENT`, `${commandNeedle} is not present in package scripts.`)
        : fail(code, `Package script ${match[0]} contains launch-mutating command ${commandNeedle}.`)
    );
  }

  return checks;
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
