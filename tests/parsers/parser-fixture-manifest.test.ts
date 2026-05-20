import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

type RegressionCoverage = "covered" | "PROCESS_WARN";

type ManifestRegression = {
  readonly id: string;
  readonly label: string;
  readonly coverage: RegressionCoverage;
  readonly reason?: string;
  readonly deferredToPhase?: string;
};

type ManifestFixture = {
  readonly id: string;
  readonly source: "fee_sheet" | "pipeline" | "production_revenue" | "float";
  readonly sourceRowsPath: string;
  readonly expectedFactsPath: string;
  readonly expectedOutputKind: "parsed_facts_json";
  readonly redactionStatus: "synthetic_redacted" | "client_redacted";
  readonly lawsProtected: readonly string[];
  readonly namedRegressions: readonly string[];
};

type ParserFixtureManifest = {
  readonly version: 1;
  readonly reviewStatus: "reviewed";
  readonly fixtures: readonly ManifestFixture[];
  readonly namedRegressions: readonly ManifestRegression[];
};

const root = process.cwd();
const manifestPath = path.join(root, "fixtures/parsed-facts/manifest.json");

function readManifest(): ParserFixtureManifest {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ParserFixtureManifest;
}

function listJsonFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(root, relativeDir);
  const files: string[] = [];
  const stack = [absoluteDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(path.relative(root, absolute));
      }
    }
  }

  return files.sort();
}

describe("P3-F parser fixture manifest", () => {
  test("declares every parser source fixture and expected parsed-fact file", () => {
    const manifest = readManifest();
    const declaredSourceRows = manifest.fixtures.map((fixture) => fixture.sourceRowsPath).sort();
    const declaredExpectedFacts = manifest.fixtures.map((fixture) => fixture.expectedFactsPath).sort();
    const sourceRows = listJsonFiles("fixtures/source-rows");
    const expectedFacts = listJsonFiles("fixtures/parsed-facts").filter(
      (file) => file !== "fixtures/parsed-facts/manifest.json"
    );

    expect(declaredSourceRows).toEqual(sourceRows);
    expect(declaredExpectedFacts).toEqual(expectedFacts);
  });

  test("keeps fixture expectations as reviewed parsed facts, not screenshots or regenerated blobs", () => {
    const manifest = readManifest();

    expect(manifest.version).toBe(1);
    expect(manifest.reviewStatus).toBe("reviewed");

    for (const fixture of manifest.fixtures) {
      expect(fs.existsSync(path.join(root, fixture.sourceRowsPath))).toBe(true);
      expect(fs.existsSync(path.join(root, fixture.expectedFactsPath))).toBe(true);
      expect(fixture.expectedOutputKind).toBe("parsed_facts_json");
      expect(fixture.expectedFactsPath).toMatch(/\.json$/);
      expect(fixture.expectedFactsPath).not.toMatch(/\.(png|jpg|jpeg|webp|mp4)$/);
      expect(fixture.redactionStatus).toMatch(/redacted$/);
      expect(fixture.lawsProtected.length).toBeGreaterThan(0);
      expect(fixture.namedRegressions.length).toBeGreaterThan(0);
    }
  });

  test("lists every named regression as covered or explicitly deferred with a process warning", () => {
    const manifest = readManifest();
    const requiredRegressionIds = [
      "LDN_Q1_DESIGN",
      "UCS04787",
      "UCS05186",
      "UCS04154",
      "PCS00250",
      "USA00262",
      "USA00323",
      "BT_RAW_CACHE",
      "TBC_PIPELINE",
      "ARCHIVED_PRODUCTION_REVENUE"
    ];
    const regressionsById = new Map(manifest.namedRegressions.map((regression) => [regression.id, regression]));

    expect([...regressionsById.keys()].sort()).toEqual([...requiredRegressionIds].sort());

    for (const regressionId of requiredRegressionIds) {
      const regression = regressionsById.get(regressionId);

      expect(regression).toBeDefined();
      expect(regression?.label.trim()).not.toBe("");

      if (regression?.coverage === "PROCESS_WARN") {
        expect(regression.reason?.trim()).not.toBe("");
        expect(regression.deferredToPhase?.trim()).not.toBe("");
      } else {
        expect(
          manifest.fixtures.some((fixture) => fixture.namedRegressions.includes(regressionId))
        ).toBe(true);
      }
    }
  });
});
