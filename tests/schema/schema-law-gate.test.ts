import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  CORE_SCHEMA_TABLES,
  REQUIRED_SCHEMA_TABLE_COLUMNS,
  validateSchemaLawSql
} from "../../src/lib/schema/schema-law";

const migrationDirectory = "supabase/migrations";

describe("P8-B schema law gate", () => {
  test("declares the core law-aligned tables", () => {
    expect(CORE_SCHEMA_TABLES).toEqual([
      "source_batches",
      "raw_source_rows",
      "skipped_source_rows",
      "parsed_facts",
      "source_conflicts",
      "display_contract_snapshots",
      "warning_events",
      "user_overlays",
      "audit_log"
    ]);
  });

  test("requires trace columns that prevent source rows, parser facts, warnings, and overlays becoming detached", () => {
    expect(REQUIRED_SCHEMA_TABLE_COLUMNS.raw_source_rows).toEqual(
      expect.arrayContaining([
        "batch_id",
        "stable_source_row_key",
        "raw",
        "content_hash",
        "source_refs"
      ])
    );
    expect(REQUIRED_SCHEMA_TABLE_COLUMNS.skipped_source_rows).toEqual(
      expect.arrayContaining([
        "batch_id",
        "stable_source_row_key",
        "raw",
        "content_hash",
        "skip",
        "source_refs"
      ])
    );
    expect(REQUIRED_SCHEMA_TABLE_COLUMNS.parsed_facts).toEqual(
      expect.arrayContaining([
        "batch_id",
        "raw_row_ids",
        "source_layer",
        "is_additive",
        "lifecycle_state",
        "source_refs"
      ])
    );
    expect(REQUIRED_SCHEMA_TABLE_COLUMNS.warning_events).toEqual(
      expect.arrayContaining([
        "lifecycle_state",
        "source_refs",
        "resolution_evidence",
        "owner"
      ])
    );
    expect(REQUIRED_SCHEMA_TABLE_COLUMNS.user_overlays).toEqual(
      expect.arrayContaining([
        "overlay_type",
        "target_type",
        "target_id",
        "source_refs",
        "reason"
      ])
    );
    expect(REQUIRED_SCHEMA_TABLE_COLUMNS.display_contract_snapshots).toEqual(
      expect.arrayContaining([
        "source_batch_ids",
        "source_refs",
        "legacy_comparison_only"
      ])
    );
  });

  test("rejects migration SQL that misses required tables, required columns, or RLS", () => {
    const badSql = `
      create table public.raw_source_rows (id uuid primary key, raw jsonb not null);
      create table public.float_allocations (id uuid primary key, hours numeric not null);
    `;

    const result = validateSchemaLawSql(badSql);

    expect(result.status).toBe("fail");
    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TABLE_MISSING_source_batches", severity: "fail" }),
        expect.objectContaining({ code: "COLUMN_MISSING_raw_source_rows_batch_id", severity: "fail" }),
        expect.objectContaining({ code: "RLS_MISSING_raw_source_rows", severity: "fail" }),
        expect.objectContaining({ code: "FORBIDDEN_TABLE_float_allocations", severity: "fail" }),
        expect.objectContaining({ code: "READ_ONLY_SQL_NOT_DIAGNOSTIC_ONLY", severity: "fail" }),
        expect.objectContaining({ code: "RAW_ROWS_MUTABLE", severity: "fail" }),
        expect.objectContaining({ code: "SKIPPED_ROWS_MUTABLE", severity: "fail" })
      ])
    );
  });

  test("the initial migration satisfies the schema laws before it is applied anywhere", () => {
    const migrationPath = readdirSync(migrationDirectory)
      .filter((fileName) => fileName.endsWith("_initial_integrity_schema.sql"))
      .map((fileName) => `${migrationDirectory}/${fileName}`)
      .at(0);

    expect(migrationPath).toBeDefined();
    if (migrationPath === undefined) throw new Error("Missing initial integrity schema migration");
    const sql = readFileSync(migrationPath, "utf8");

    const result = validateSchemaLawSql(sql);

    expect(result.status).toBe("pass");
    expect(result.findings.filter((finding) => finding.severity === "fail")).toEqual([]);
  });
});
