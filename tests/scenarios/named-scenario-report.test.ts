import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";

import { buildNamedScenarioReport } from "../../src/lib/scenarios/named-scenario-report";

const requiredScenarioIds = [
  "ldn-q1-design",
  "ucs04787",
  "ucs05186",
  "ucs04154",
  "pcs00250",
  "usa00262",
  "usa00323",
  "bt-raw-without-cache",
  "tbc-pipeline-identity",
  "archived-production-revenue",
  "exact-client-drilldown"
];

describe("P8-E named Sian Yunni Jade scenario report", () => {
  test("covers every Gate 5 named scenario with owner, status, classification, and checks", () => {
    const report = buildNamedScenarioReport();

    expect(report.scenarios.map((scenario) => scenario.id)).toEqual(requiredScenarioIds);
    expect(report.scenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ldn-q1-design",
          owner: "Sian",
          status: "pass",
          classification: "display_contract_agrees",
          checks: expect.arrayContaining([
            expect.objectContaining({ code: "same_scope_same_number", status: "pass" }),
            expect.objectContaining({ code: "projects_csv_detail_parity", status: "pass" })
          ])
        }),
        expect.objectContaining({
          id: "ucs04787",
          owner: "Yunni",
          status: "warn",
          classification: "source_or_cache_warning",
          checks: expect.arrayContaining([
            expect.objectContaining({ code: "float_layers_compared", status: "pass" }),
            expect.objectContaining({ code: "raw_cache_visible_mismatch_surfaced", status: "warn" })
          ])
        }),
        expect.objectContaining({
          id: "tbc-pipeline-identity",
          owner: "Jade",
          status: "pass",
          classification: "source_only_visible"
        })
      ])
    );
  });

  test("does not let known scenario warnings become hidden new-code failures", () => {
    const report = buildNamedScenarioReport();

    expect(report.status).toBe("warn");
    expect(report.summary.fail).toBe(0);
    expect(report.scenarios.filter((scenario) => scenario.classification === "new_code_bug")).toEqual([]);
    expect(report.scenarios.filter((scenario) => scenario.status === "warn").map((scenario) => scenario.id)).toEqual(
      ["ucs04787", "ucs05186", "pcs00250", "bt-raw-without-cache"]
    );
  });

  test("encodes the USA sold-hours false-zero guard as source-supported, not zero", () => {
    const report = buildNamedScenarioReport();
    const usaScenarios = report.scenarios.filter((scenario) => scenario.id === "usa00262" || scenario.id === "usa00323");

    expect(usaScenarios).toHaveLength(2);
    for (const scenario of usaScenarios) {
      expect(scenario.checks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "sold_hours_false_zero_guard",
            status: "pass",
            evidence: expect.stringContaining("source sold hours are nonzero")
          })
        ])
      );
    }
  });

  test("script emits stakeholder-safe JSON without raw source refs or payloads", () => {
    const output = execFileSync("node", ["scripts/named-scenario-report.mjs"], { encoding: "utf8" });
    const report = JSON.parse(output) as ReturnType<typeof buildNamedScenarioReport>;

    expect(report.status).toBe("warn");
    expect(report.scenarios).toHaveLength(requiredScenarioIds.length);
    expect(output).not.toContain("rawRowId");
    expect(output).not.toContain("sourceRefs");
    expect(output).not.toContain("old selector truth");
  });
});
