export const CORE_SCHEMA_TABLES = [
  "source_batches",
  "raw_source_rows",
  "parsed_facts",
  "source_conflicts",
  "display_contract_snapshots",
  "warning_events",
  "user_overlays",
  "audit_log"
] as const;

export type CoreSchemaTable = (typeof CORE_SCHEMA_TABLES)[number];

export const REQUIRED_SCHEMA_TABLE_COLUMNS = {
  source_batches: [
    "id",
    "source",
    "mode",
    "status",
    "source_label",
    "source_version",
    "read_only",
    "started_at",
    "completed_at",
    "warnings",
    "metadata",
    "created_at"
  ],
  raw_source_rows: [
    "id",
    "batch_id",
    "source",
    "stable_source_row_key",
    "source_document_id",
    "source_tab",
    "source_row_number",
    "source_object_id",
    "raw",
    "content_hash",
    "observed_at",
    "source_refs",
    "created_at"
  ],
  parsed_facts: [
    "id",
    "source",
    "source_layer",
    "batch_id",
    "raw_row_ids",
    "job_number",
    "float_project_id",
    "scope",
    "dimensions",
    "metrics",
    "status",
    "is_additive",
    "additive_status",
    "confidence",
    "lifecycle_state",
    "warnings",
    "source_refs",
    "created_at",
    "superseded_by"
  ],
  source_conflicts: [
    "id",
    "scope",
    "conflict_type",
    "severity",
    "source_layers",
    "fact_ids",
    "raw_row_ids",
    "message",
    "lifecycle_state",
    "first_seen_at",
    "last_seen_at",
    "resolution_evidence",
    "source_refs",
    "created_at",
    "superseded_by"
  ],
  display_contract_snapshots: [
    "id",
    "scope",
    "contract_version",
    "generated_at",
    "contract_hash",
    "source_batch_ids",
    "legacy_comparison_only",
    "visible_rows",
    "totals",
    "unsupported",
    "reconciliation",
    "warnings",
    "confidence",
    "source_refs",
    "created_at"
  ],
  warning_events: [
    "id",
    "warning_id",
    "status",
    "lifecycle_state",
    "source",
    "source_layer",
    "scope",
    "owner",
    "message",
    "source_refs",
    "first_seen_at",
    "last_seen_at",
    "resolution_evidence",
    "created_at",
    "superseded_by"
  ],
  user_overlays: [
    "id",
    "overlay_type",
    "target_type",
    "target_id",
    "scope",
    "before_value",
    "after_value",
    "reason",
    "actor_id",
    "status",
    "source_refs",
    "created_at",
    "superseded_by"
  ],
  audit_log: [
    "id",
    "actor_id",
    "action",
    "target_table",
    "target_id",
    "before_value",
    "after_value",
    "reason",
    "source_refs",
    "created_at"
  ]
} as const satisfies Record<CoreSchemaTable, readonly string[]>;

export type SchemaLawStatus = "pass" | "fail";

export type SchemaLawFinding = {
  readonly code: string;
  readonly severity: SchemaLawStatus;
  readonly message: string;
};

export type SchemaLawValidationResult = {
  readonly status: SchemaLawStatus;
  readonly findings: readonly SchemaLawFinding[];
};

const forbiddenLegacyTables = [
  "float_allocations",
  "float_tasks_canon",
  "pipeline_data",
  "sold_monthly",
  "production_revenue",
  "projects_cache",
  "dashboard_cache",
  "fee_sheet_cache"
] as const;

export function validateSchemaLawSql(sql: string): SchemaLawValidationResult {
  const normalised = normaliseSql(sql);
  const findings: SchemaLawFinding[] = [];

  for (const table of CORE_SCHEMA_TABLES) {
    const tableBlock = findCreateTableBlock(sql, table);
    if (tableBlock === undefined) {
      findings.push(fail(`TABLE_MISSING_${table}`, `Missing public.${table}.`));
      continue;
    }

    findings.push(pass(`TABLE_PRESENT_${table}`, `public.${table} exists in the migration SQL.`));

    const tableColumns = extractColumnNames(tableBlock);
    for (const column of REQUIRED_SCHEMA_TABLE_COLUMNS[table]) {
      findings.push(
        tableColumns.has(column)
          ? pass(`COLUMN_PRESENT_${table}_${column}`, `public.${table}.${column} is present.`)
          : fail(`COLUMN_MISSING_${table}_${column}`, `public.${table}.${column} is missing.`)
      );
    }

    findings.push(
      hasRls(normalised, table)
        ? pass(`RLS_ENABLED_${table}`, `RLS is enabled on public.${table}.`)
        : fail(`RLS_MISSING_${table}`, `RLS is not enabled on public.${table}.`)
    );
  }

  for (const table of forbiddenLegacyTables) {
    if (hasCreateTable(normalised, table)) {
      findings.push(fail(`FORBIDDEN_TABLE_${table}`, `Forbidden legacy table public.${table} appears in the migration SQL.`));
    }
  }

  if (/\bsecurity\s+definer\b/i.test(sql) && /\bpublic\./i.test(sql)) {
    findings.push(fail("PUBLIC_SECURITY_DEFINER", "Public SECURITY DEFINER functions are not allowed in the law schema migration."));
  }

  findings.push(
    hasReadOnlySqlDiagnosticGuard(normalised)
      ? pass("READ_ONLY_SQL_DIAGNOSTIC_ONLY", "read_only_sql is constrained to diagnostic evidence and cannot become display truth.")
      : fail("READ_ONLY_SQL_NOT_DIAGNOSTIC_ONLY", "read_only_sql must be constrained to diagnostic evidence only.")
  );

  findings.push(
    hasRawRowsImmutableGuard(normalised)
      ? pass("RAW_ROWS_IMMUTABLE", "raw_source_rows are protected from direct updates and deletes by database triggers.")
      : fail("RAW_ROWS_MUTABLE", "raw_source_rows need database-level update and delete guards.")
  );

  findings.push(
    hasDefaultPrivilegeRevoke(normalised)
      ? pass("DEFAULT_TABLE_PRIVILEGES_REVOKED", "Default table privileges are revoked from anon and authenticated.")
      : fail("DEFAULT_TABLE_PRIVILEGES_NOT_REVOKED", "Default table privileges must be revoked from anon and authenticated.")
  );

  return {
    status: findings.some((finding) => finding.severity === "fail") ? "fail" : "pass",
    findings
  };
}

function normaliseSql(sql: string): string {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findCreateTableBlock(sql: string, table: string): string | undefined {
  const tablePattern = new RegExp(
    `create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+(?:"public"|public)\\.(?:"${table}"|${table})\\s*\\(`,
    "i"
  );
  const match = tablePattern.exec(sql);
  if (match === null) return undefined;

  let depth = 0;
  for (let index = match.index + match[0].length - 1; index < sql.length; index += 1) {
    const char = sql[index];
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth === 0) return sql.slice(match.index, index + 1);
  }

  return sql.slice(match.index);
}

function extractColumnNames(createTableBlock: string): Set<string> {
  const body = createTableBlock.slice(createTableBlock.indexOf("(") + 1, createTableBlock.lastIndexOf(")"));
  const columns = new Set<string>();

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/,$/, "");
    if (line === "" || /^(constraint|primary|foreign|unique|check)\b/i.test(line)) continue;

    const match = /^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+/.exec(line);
    const columnName = match?.[1];
    if (columnName !== undefined) columns.add(columnName.toLowerCase());
  }

  return columns;
}

function hasRls(normalisedSql: string, table: string): boolean {
  const escapedTable = table.replace(/_/g, "[_]");
  const patterns = [
    new RegExp(`alter table(?: only)? public\\.${escapedTable} enable row level security;?`, "i"),
    new RegExp(`alter table(?: only)? "public"\\."${escapedTable}" enable row level security;?`, "i")
  ];
  return patterns.some((pattern) => pattern.test(normalisedSql));
}

function hasCreateTable(normalisedSql: string, table: string): boolean {
  return new RegExp(`create table(?: if not exists)? public\\.${table}\\s*\\(`, "i").test(normalisedSql);
}

function hasDefaultPrivilegeRevoke(normalisedSql: string): boolean {
  return /alter default privileges in schema public revoke all on tables from anon, authenticated;?/i.test(normalisedSql);
}

function hasReadOnlySqlDiagnosticGuard(normalisedSql: string): boolean {
  return /source <> 'read_only_sql' or \(\(dimensions ->> 'diagnostic_only'\) = 'true'\)/i.test(normalisedSql);
}

function hasRawRowsImmutableGuard(normalisedSql: string): boolean {
  return (
    normalisedSql.includes("create trigger raw_source_rows_no_update") &&
    normalisedSql.includes("create trigger raw_source_rows_no_delete")
  );
}

function pass(code: string, message: string): SchemaLawFinding {
  return {
    code,
    severity: "pass",
    message
  };
}

function fail(code: string, message: string): SchemaLawFinding {
  return {
    code,
    severity: "fail",
    message
  };
}
