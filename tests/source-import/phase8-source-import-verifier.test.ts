import fs from "node:fs";

import { describe, expect, test } from "vitest";

describe("P8-C source import verifier markers", () => {
  test("Phase 8 verifier protects read-only source snapshot import files and boundaries", () => {
    const script = fs.readFileSync("scripts/verify-phase8.mjs", "utf8");

    expect(script).toContain("src/lib/source-import/snapshot-import.ts");
    expect(script).toContain("scripts/dry-run-source-import.mjs");
    expect(script).toContain("scripts/lib/source-import-report.mjs");
    expect(script).toContain("fixtures/source-import/p8c-redacted-snapshot.json");
    expect(script).toContain("legacy_cache_imported_as_evidence_only");
    expect(script).toContain("fetch(");
    expect(script).toContain("supabase");
  });
});
