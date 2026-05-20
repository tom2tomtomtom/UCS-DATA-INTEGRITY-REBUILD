import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

type FixtureScreenshotManifest = {
  readonly proofType: "deterministic-fixture-screenshot-proof";
  readonly dataMode: "deterministic-fixture";
  readonly surfaces: readonly {
    readonly id: string;
    readonly route: string;
    readonly screenshotFile: string;
    readonly fixtureRows: readonly string[];
    readonly statesCovered: readonly string[];
    readonly expectedText: readonly string[];
  }[];
};

const requiredStates = [
  "no-warning rollup row",
  "pipeline and production revenue unsupported in department or role scope",
  "Projects source-only pipeline-only production-only Float-only archived rows",
  "exact client drilldown distinct from fuzzy search",
  "project detail missing role data and source trace links",
  "Float raw/cache/visible comparison",
  "Float duplicate/manual inactive/archived",
  "Float export compare empty and pasted sample",
  "ambiguous Float export matches and dashboard-only rows",
  "chat closed open idle working evidence warning confidence Needs Codex",
  "TBC pipeline row identity",
  "USA00262 and USA00323 false-zero sold-hours guard"
];

describe("P1-I deterministic fixture screenshot reference", () => {
  test("names fixture rows and screenshots for every required deterministic state", () => {
    const manifestPath = "reference/ui/fixture-app/manifest.json";
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as FixtureScreenshotManifest;

    expect(manifest.proofType).toBe("deterministic-fixture-screenshot-proof");
    expect(manifest.dataMode).toBe("deterministic-fixture");

    const allStates = manifest.surfaces.flatMap((surface) => surface.statesCovered);
    for (const state of requiredStates) {
      expect(allStates).toContain(state);
    }

    for (const surface of manifest.surfaces) {
      expect(surface.route).toMatch(/^\/dashboard/);
      expect(surface.fixtureRows.length).toBeGreaterThan(0);
      expect(surface.expectedText.length).toBeGreaterThan(0);
      expect(fs.existsSync(path.join("reference/ui/fixture-app", surface.screenshotFile))).toBe(true);
    }
  });

  test("keeps fixture screenshot manifest free of live secrets and source payloads", () => {
    const text = fs.readFileSync("reference/ui/fixture-app/manifest.json", "utf8");

    expect(text).not.toContain("DATABASE_URL");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(text).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(text).not.toContain("postgres://");
    expect(text).not.toContain("postgresql://");
    expect(text).not.toContain("raw source payload");
  });
});
