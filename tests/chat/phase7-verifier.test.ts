import fs from "node:fs";

import { describe, expect, test } from "vitest";

describe("P7-F phase 7 verifier wiring", () => {
  test("package build is wired to a Phase 7 verification gate", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.["verify:phase7"]).toBe(
      "npm run test && npm run typecheck && next build && node scripts/verify-phase7.mjs"
    );
    expect(pkg.scripts?.build).toBe("npm run verify:phase7");
  });

  test("Phase 7 verifier script protects the chat evidence boundary", () => {
    const script = fs.readFileSync("scripts/verify-phase7.mjs", "utf8");

    expect(script).toContain("app/api/chat/route.ts");
    expect(script).toContain("src/lib/chat/claim-guard.ts");
    expect(script).toContain("selectDashboardView");
    expect(script).toContain("archive");
    expect(script).toContain("sync");
    expect(script).toContain("deploy");
    expect(script).toContain("report.guard.status");
    expect(script).toContain("debugDraft");
    expect(script).toContain("TOOL_NOT_FIXTURE_BACKED");
    expect(script).toContain("high_confidence_with_missing_required_evidence");
  });
});
