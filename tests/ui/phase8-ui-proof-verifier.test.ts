import fs from "node:fs";

import { describe, expect, test } from "vitest";

describe("P8-F UI proof verifier markers", () => {
  test("Phase 8 verifier protects the UI screenshot and click proof gate", () => {
    const script = fs.readFileSync("scripts/verify-phase8.mjs", "utf8");

    expect(script).toContain("src/lib/ui/ui-proof.ts");
    expect(script).toContain("scripts/ui-proof-manifest.mjs");
    expect(script).toContain("dashboard-home");
    expect(script).toContain("projects-design-drilldown");
    expect(script).toContain("project-detail-ucs04787");
    expect(script).toContain("float-diagnostics");
    expect(script).toContain("chat-evidence");
  });
});
