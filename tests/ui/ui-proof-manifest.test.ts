import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";

import { buildUiProofManifest } from "../../src/lib/ui/ui-proof";

const requiredSurfaceIds = [
  "dashboard-home",
  "projects-design-drilldown",
  "project-detail-ucs04787",
  "float-diagnostics",
  "data-quality",
  "approval-audit",
  "chat-evidence"
];

describe("P8-F UI proof manifest", () => {
  test("covers every dashboard surface Sian Yunni and Jade need to trust", () => {
    const manifest = buildUiProofManifest({
      baseUrl: "http://localhost:3030",
      capturedAt: "2026-05-20T18:20:00.000Z"
    });

    expect(manifest.proofType).toBe("deterministic-ui-proof");
    expect(manifest.status).toBe("ready_for_capture");
    expect(manifest.surfaces.map((surface) => surface.id)).toEqual(requiredSurfaceIds);

    for (const surface of manifest.surfaces) {
      expect(surface.url).toMatch(/^http:\/\/localhost:3030\/dashboard/);
      expect(surface.screenshotFile).toMatch(/^p8f-.+\.png$/);
      expect(surface.expectedText.length).toBeGreaterThanOrEqual(3);
      expect(surface.sourceSafety).toBe("redacted_or_fixture_safe");
    }
  });

  test("locks the Sian-style drilldown and unsupported-source proof", () => {
    const manifest = buildUiProofManifest({
      baseUrl: "http://localhost:3030",
      capturedAt: "2026-05-20T18:20:00.000Z"
    });
    const home = manifest.surfaces.find((surface) => surface.id === "dashboard-home");
    const projects = manifest.surfaces.find((surface) => surface.id === "projects-design-drilldown");

    expect(home?.clickProofs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Design department row opens Projects with the same scope",
          expectedUrlIncludes: [
            "/dashboard/projects",
            "office=LDN",
            "from=2026-01-01",
            "to=2026-03-31",
            "department=Design"
          ]
        })
      ])
    );
    expect(projects?.expectedText).toEqual(expect.arrayContaining(["Unsupported", "British Airways", "UCS04787"]));
    expect(projects?.mustNotContain).toEqual(expect.arrayContaining(["£0 pipeline attributed to Design"]));
  });

  test("locks Yunni Float and chat evidence routes without hiding warnings", () => {
    const manifest = buildUiProofManifest({
      baseUrl: "http://localhost:3030",
      capturedAt: "2026-05-20T18:20:00.000Z"
    });
    const detail = manifest.surfaces.find((surface) => surface.id === "project-detail-ucs04787");
    const float = manifest.surfaces.find((surface) => surface.id === "float-diagnostics");
    const chat = manifest.surfaces.find((surface) => surface.id === "chat-evidence");

    expect(detail?.expectedText).toEqual(expect.arrayContaining(["FLOAT_VISIBLE_CACHE_MISSING_CACHE", "fixture-float-visible-ucs04787", "Back to Projects"]));
    expect(float?.expectedText).toEqual(expect.arrayContaining(["PCS00250_RAW_CACHE_UNRESOLVED", "BT_RAW_CACHE_UNRESOLVED", "UCS05186", "archived/manual/source-only candidate"]));
    expect(chat?.expectedText).toEqual(expect.arrayContaining(["Dashboard Chat", "Working", "Needs Codex", "browser testing"]));
  });

  test("script emits a safe screenshot manifest without raw source payloads or secrets", () => {
    const output = execFileSync("node", ["scripts/ui-proof-manifest.mjs"], {
      encoding: "utf8",
      env: {
        ...process.env,
        UI_PROOF_BASE_URL: "http://localhost:3030",
        UI_PROOF_CAPTURED_AT: "2026-05-20T18:20:00.000Z"
      }
    });
    const manifest = JSON.parse(output) as ReturnType<typeof buildUiProofManifest>;

    expect(manifest.surfaces).toHaveLength(requiredSurfaceIds.length);
    expect(output).not.toContain("DATABASE_URL");
    expect(output).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(output).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(output).not.toContain("raw source payload");
    expect(output).not.toContain("sourceRefs");
  });
});
