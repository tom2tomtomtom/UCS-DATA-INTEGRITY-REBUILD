export function buildSourceApprovalReadinessReport({
  envText,
  expected,
  uiSpecStatus = "pending",
  sourceSnapshotStatus = "missing",
  stakeholderApprovalStatus = "not_approved",
  productionCutoverStatus = "not_cut_over"
}) {
  const env = parseEnv(envText);
  const checks = [];

  checks.push(requiredValueCheck(env, "APP_ENV"));
  checks.push(requiredValueCheck(env, "DATABASE_URL"));
  checks.push(requiredValueCheck(env, "NEXT_PUBLIC_SUPABASE_URL"));
  checks.push(requiredValueCheck(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  checks.push(requiredValueCheck(env, "SUPABASE_SERVICE_ROLE_KEY"));
  checks.push(requiredValueCheck(env, "GOOGLE_SERVICE_ACCOUNT_KEY"));
  checks.push(requiredValueCheck(env, "FEE_TRACKER_SPREADSHEET_ID"));
  checks.push(requiredValueCheck(env, "PIPELINE_SHEET_ID"));
  checks.push(requiredValueCheck(env, "PRODUCTION_REVENUE_SHEET_ID"));
  checks.push(requiredValueCheck(env, "FLOAT_API_KEY"));
  checks.push(optionalValueCheck(env, "ANTHROPIC_API_KEY", "Chat investigation is not source approval, but the chat evidence surface needs this before stakeholder review."));

  checks.push(
    env.get("MUTATION_GUARD") === "read_only"
      ? pass("MUTATION_GUARD_READ_ONLY", "Mutation guard is read_only.")
      : fail("MUTATION_GUARD_NOT_READ_ONLY", "MUTATION_GUARD must be read_only for source approval.")
  );

  const databaseUrl = env.get("DATABASE_URL") ?? "";
  checks.push(
    databaseUrl.includes(expected.rebuildSupabaseRef)
      ? pass("DATABASE_URL_REBUILD_SUPABASE", "DATABASE_URL points at the rebuild Supabase ref.")
      : fail("DATABASE_URL_NOT_REBUILD_SUPABASE", "DATABASE_URL must point at the rebuild Supabase ref.")
  );

  const publicUrl = env.get("NEXT_PUBLIC_SUPABASE_URL") ?? "";
  checks.push(
    publicUrl.includes(expected.rebuildSupabaseRef)
      ? pass("NEXT_PUBLIC_SUPABASE_URL_REBUILD_SUPABASE", "NEXT_PUBLIC_SUPABASE_URL points at the rebuild Supabase ref.")
      : fail("NEXT_PUBLIC_SUPABASE_URL_NOT_REBUILD_SUPABASE", "NEXT_PUBLIC_SUPABASE_URL must point at the rebuild Supabase ref.")
  );

  const legacyUrl = env.get("LEGACY_DATABASE_URL") ?? "";
  if (legacyUrl === "") {
    checks.push(warn("LEGACY_DATABASE_URL_MISSING", "LEGACY_DATABASE_URL is missing, so old-dashboard comparison is unavailable."));
  } else if (legacyUrl.includes(expected.rebuildSupabaseRef) || legacyUrl === databaseUrl) {
    checks.push(fail("LEGACY_DATABASE_NOT_DISTINCT", "LEGACY_DATABASE_URL must be distinct from rebuild DATABASE_URL."));
  } else {
    checks.push(pass("LEGACY_DATABASE_DISTINCT", "LEGACY_DATABASE_URL is distinct and comparison-only."));
  }

  const sourceStreams = [
    streamCheck("sold", "SOLD_STREAM_CONFIGURED", ["GOOGLE_SERVICE_ACCOUNT_KEY", "FEE_TRACKER_SPREADSHEET_ID"], env),
    streamCheck("pipeline", "PIPELINE_STREAM_CONFIGURED", ["GOOGLE_SERVICE_ACCOUNT_KEY", "PIPELINE_SHEET_ID"], env),
    streamCheck("production_revenue", "PRODUCTION_REVENUE_STREAM_CONFIGURED", ["GOOGLE_SERVICE_ACCOUNT_KEY", "PRODUCTION_REVENUE_SHEET_ID"], env),
    streamCheck("float", "FLOAT_STREAM_CONFIGURED", ["FLOAT_API_KEY"], env)
  ];
  checks.push(...sourceStreams.map((stream) => stream.check));

  checks.push(statusCheck({
    code: "SOURCE_SNAPSHOTS_READY",
    value: sourceSnapshotStatus,
    passValue: "ready",
    failMessage: "Source snapshots are not ready. Do not ask stakeholders to approve source accuracy yet."
  }));

  checks.push(
    uiSpecStatus === "ready"
      ? pass("UI_PARITY_SPEC_READY", "Legacy UI UX spec has been ingested for parity checks.")
      : warn("UI_PARITY_SPEC_PENDING", "Legacy UI UX spec is pending. Continue source work, but do not claim stakeholder UI approval.")
  );

  checks.push(statusCheck({
    code: "STAKEHOLDER_APPROVAL_COMPLETE",
    value: stakeholderApprovalStatus,
    passValue: "approved",
    failMessage: "Sian, Jade, and Yunni approval is not complete."
  }));

  checks.push(
    productionCutoverStatus === "not_cut_over"
      ? pass("PRODUCTION_NOT_CUT_OVER", "Production is not cut over before source approval.")
      : fail("PRODUCTION_CUTOVER_BEFORE_APPROVAL", "Production cutover must not happen before source and stakeholder approval.")
  );

  const blockers = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  return {
    status: blockers.length > 0 ? "fail" : warnings.length > 0 ? "warn" : "pass",
    checks,
    blockers,
    warnings,
    sources: sourceStreams.map(({ check, ...stream }) => ({
      ...stream,
      status: check.status
    })),
    summary: {
      rebuildSupabaseRef: expected.rebuildSupabaseRef,
      sourceStreamsConfigured: sourceStreams.filter((stream) => stream.check.status === "pass").map((stream) => stream.name),
      sourceStreamsBlocked: sourceStreams.filter((stream) => stream.check.status === "fail").map((stream) => stream.name),
      uiSpecStatus,
      sourceSnapshotStatus,
      stakeholderApprovalStatus,
      productionCutoverStatus
    }
  };
}

function parseEnv(envText) {
  const env = new Map();

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

function requiredValueCheck(env, key) {
  return hasValue(env, key)
    ? pass(`ENV_PRESENT_${key}`, `${key} is present.`)
    : fail(`ENV_MISSING_${key}`, `${key} is required for Phase 10 source approval.`);
}

function optionalValueCheck(env, key, message) {
  return hasValue(env, key)
    ? pass(`ENV_PRESENT_${key}`, `${key} is present.`)
    : warn(`ENV_MISSING_${key}`, message);
}

function streamCheck(name, passCode, requiredKeys, env) {
  const missingKeys = requiredKeys.filter((key) => !hasValue(env, key));
  const check =
    missingKeys.length === 0
      ? pass(passCode, `${name} source stream is configured.`)
      : fail(`${passCode}_BLOCKED`, `${name} source stream is missing required env keys: ${missingKeys.join(", ")}.`);

  return {
    name,
    requiredKeys,
    missingKeys,
    check
  };
}

function statusCheck({ code, value, passValue, failMessage }) {
  return value === passValue
    ? pass(code, `${code} is ${passValue}.`)
    : fail(`${code}_BLOCKED`, failMessage);
}

function hasValue(env, key) {
  return (env.get(key) ?? "").trim() !== "";
}

function pass(code, message) {
  return {
    code,
    status: "pass",
    message
  };
}

function warn(code, message) {
  return {
    code,
    status: "warn",
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
