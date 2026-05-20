import fs from "node:fs";

import { describe, expect, test } from "vitest";

describe("P8-B phase 8 verifier wiring", () => {
  test("package exposes a Phase 8 verification gate before real-data import work continues", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.["verify:phase8"]).toBe(
      "npm run test && npm run typecheck && next build && node scripts/verify-phase8.mjs"
    );
  });

  test("Phase 8 verifier protects schema laws and legacy-cache boundaries", () => {
    const script = fs.readFileSync("scripts/verify-phase8.mjs", "utf8");

    expect(script).toContain("src/lib/schema/schema-law.ts");
    expect(script).toContain("tests/schema/schema-law-gate.test.ts");
    expect(script).toContain("raw_source_rows");
    expect(script).toContain("parsed_facts");
    expect(script).toContain("legacy_comparison_only");
    expect(script).toContain("READ_ONLY_SQL_NOT_DIAGNOSTIC_ONLY");
    expect(script).toContain("RAW_ROWS_MUTABLE");
    expect(script).toContain("float_allocations");
    expect(script).toContain("SECURITY DEFINER");
  });
});
