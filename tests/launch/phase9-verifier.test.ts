import fs from "node:fs";

import { describe, expect, test } from "vitest";

describe("P9-A phase 9 verifier wiring", () => {
  test("package exposes a Phase 9 verification gate without replacing the Phase 8 build gate", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.build).toBe("npm run verify:phase8");
    expect(pkg.scripts?.["verify:phase9"]).toBe("npm run build && node scripts/verify-phase9.mjs");
  });

  test("Phase 9 verifier protects launch readiness and no-deploy markers", () => {
    const script = fs.readFileSync("scripts/verify-phase9.mjs", "utf8");

    expect(script).toContain("src/lib/launch/readiness.ts");
    expect(script).toContain("tests/launch/launch-readiness.test.ts");
    expect(script).toContain("scripts/launch-readiness-report.mjs");
    expect(script).toContain("app/api/health/route.ts");
    expect(script).toContain("app/api/readiness/route.ts");
    expect(script).toContain("tests/launch/health-readiness-routes.test.ts");
    expect(script).toContain("tests/launch/railway-target.test.ts");
    expect(script).toContain("tests/launch/railway-build-config.test.ts");
    expect(script).toContain("railway.json");
    expect(script).toContain("HEALTH_ROUTE_MISSING");
    expect(script).toContain("READINESS_ROUTE_MISSING");
    expect(script).toContain("scripts/railway-readiness-report.mjs");
    expect(script).toContain("src/lib/launch/railway-target.ts");
    expect(script).toContain("RAILWAY_TARGET_FORBIDDEN");
    expect(script).toContain("DATABASE_URL_REBUILD_SUPABASE");
    expect(script).toContain("PRODUCTION_DOMAIN_CUTOVER_UNAPPROVED");
    expect(script).toContain("RAILPACK");
    expect(script).toContain("next start");
    expect(script).toContain("/api/health");
    expect(script).toContain("DATABASE_URL_NEW_SUPABASE");
    expect(script).toContain("MUTATION_GUARD_READ_ONLY");
    expect(script).toContain("FORBIDDEN_SCRIPT_DEPLOY");
    expect(script).toContain("railway up");
    expect(script).toContain("supabase db push");
  });
});
