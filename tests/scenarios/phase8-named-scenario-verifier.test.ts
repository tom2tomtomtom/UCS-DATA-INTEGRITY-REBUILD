import fs from "node:fs";

import { describe, expect, test } from "vitest";

describe("P8-E named scenario verifier markers", () => {
  test("Phase 8 verifier protects named scenario report coverage", () => {
    const script = fs.readFileSync("scripts/verify-phase8.mjs", "utf8");

    expect(script).toContain("src/lib/scenarios/named-scenario-report.ts");
    expect(script).toContain("scripts/named-scenario-report.mjs");
    expect(script).toContain("ldn-q1-design");
    expect(script).toContain("ucs04787");
    expect(script).toContain("usa00262");
    expect(script).toContain("bt-raw-without-cache");
    expect(script).toContain("new_code_bug");
  });
});
