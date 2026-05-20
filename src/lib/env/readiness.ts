export type EnvironmentReadinessStatus = "pass" | "warn" | "fail";

export type EnvironmentReadinessFinding = {
  readonly code: string;
  readonly severity: EnvironmentReadinessStatus;
  readonly message: string;
};

export type EnvironmentReadinessResult = {
  readonly status: EnvironmentReadinessStatus;
  readonly findings: readonly EnvironmentReadinessFinding[];
};

export type EnvironmentReadinessOptions = {
  readonly rebuildSupabaseRef: string;
};

const requiredServerKeys = [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FLOAT_API_KEY",
  "GOOGLE_SERVICE_ACCOUNT_KEY",
  "FEE_TRACKER_SPREADSHEET_ID",
  "MUTATION_GUARD"
] as const;

const optionalSourceKeys = ["PIPELINE_SHEET_ID", "PRODUCTION_REVENUE_SHEET_ID"] as const;

export function analyzeEnvironmentReadiness(
  envText: string,
  options: EnvironmentReadinessOptions
): EnvironmentReadinessResult {
  const env = parseEnv(envText);
  const findings: EnvironmentReadinessFinding[] = [];

  for (const key of requiredServerKeys) {
    findings.push(
      env.get(key) === undefined || env.get(key) === ""
        ? finding(`${key}_MISSING`, "fail", `${key} is missing from the local environment.`)
        : finding(`${key}_PRESENT`, "pass", `${key} is present.`)
    );
  }

  const databaseUrl = env.get("DATABASE_URL") ?? "";
  findings.push(
    databaseUrl.includes(options.rebuildSupabaseRef)
      ? finding("DATABASE_URL_REBUILD_REF", "pass", "DATABASE_URL points at the rebuild Supabase project ref.")
      : finding("DATABASE_URL_NOT_REBUILD_REF", "fail", "DATABASE_URL does not point at the rebuild Supabase project ref.")
  );

  const publicUrl = env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "";
  findings.push(
    publicUrl.includes(options.rebuildSupabaseRef)
      ? finding("NEXT_PUBLIC_SUPABASE_URL_REBUILD_REF", "pass", "NEXT_PUBLIC_SUPABASE_URL points at the rebuild Supabase project ref.")
      : finding("NEXT_PUBLIC_SUPABASE_URL_NOT_REBUILD_REF", "fail", "NEXT_PUBLIC_SUPABASE_URL does not point at the rebuild Supabase project ref.")
  );

  const legacyUrl = env.get("LEGACY_DATABASE_URL");
  if (legacyUrl === undefined || legacyUrl === "") {
    findings.push(finding("LEGACY_DATABASE_URL_MISSING", "warn", "LEGACY_DATABASE_URL is missing, so old-vs-new comparison is not ready."));
  } else if (legacyUrl.includes(options.rebuildSupabaseRef)) {
    findings.push(finding("LEGACY_DATABASE_NOT_DISTINCT", "fail", "LEGACY_DATABASE_URL points at the rebuild project and is not a distinct comparison DB."));
  } else {
    findings.push(finding("LEGACY_DATABASE_DISTINCT", "pass", "LEGACY_DATABASE_URL is distinct from the rebuild project."));
  }

  const mutationGuard = env.get("MUTATION_GUARD");
  findings.push(
    mutationGuard === "read_only"
      ? finding("MUTATION_GUARD_READ_ONLY", "pass", "MUTATION_GUARD is read_only.")
      : finding("MUTATION_GUARD_NOT_READ_ONLY", "fail", "MUTATION_GUARD must be read_only for Phase 8 readiness.")
  );

  for (const key of optionalSourceKeys) {
    if (env.get(key) === undefined || env.get(key) === "") {
      findings.push(finding(`${key}_MISSING`, "warn", `${key} is missing, so live source import for that stream is not ready.`));
    } else {
      findings.push(finding(`${key}_PRESENT`, "pass", `${key} is present.`));
    }
  }

  return {
    status: statusFor(findings),
    findings
  };
}

function parseEnv(envText: string): Map<string, string> {
  const env = new Map<string, string>();

  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex < 1) continue;

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
    env.set(key, value);
  }

  return env;
}

function finding(
  code: string,
  severity: EnvironmentReadinessStatus,
  message: string
): EnvironmentReadinessFinding {
  return {
    code,
    severity,
    message
  };
}

function statusFor(findings: readonly EnvironmentReadinessFinding[]): EnvironmentReadinessStatus {
  if (findings.some((finding) => finding.severity === "fail")) return "fail";
  if (findings.some((finding) => finding.severity === "warn")) return "warn";
  return "pass";
}
