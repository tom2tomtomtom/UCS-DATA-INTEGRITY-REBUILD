import fs from "node:fs";

import { describe, expect, test } from "vitest";

describe("P8-D dual-run verifier markers", () => {
  test("Phase 8 verifier protects comparator files and comparison-only boundaries", () => {
    const script = fs.readFileSync("scripts/verify-phase8.mjs", "utf8");

    expect(script).toContain("src/lib/dual-run/dual-run-compare.ts");
    expect(script).toContain("scripts/dual-run-compare.mjs");
    expect(script).toContain("fixtures/dual-run/p8d-basic.json");
    expect(script).toContain("Old dashboard lane must be comparison evidence only");
    expect(script).toContain("old_bug");
    expect(script).toContain("new_bug");
    expect(script).toContain("source_issue");
    expect(script).toContain("unresolved");
  });
});
