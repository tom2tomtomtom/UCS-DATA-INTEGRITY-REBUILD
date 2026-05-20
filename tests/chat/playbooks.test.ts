import { describe, expect, test } from "vitest";

import { getPlaybook, routePlaybook } from "../../src/lib/chat";

describe("P7-B chat playbook router", () => {
  test.each([
    ["what errors can you see?", "dashboard_scan"],
    ["check against Google sheets", "fee_sheet_sold_hours_mismatch"],
    ["why is PCS00250 showing hours?", "float_hours_mismatch"],
    ["does USA00262 have zero sold hours?", "fee_sheet_sold_hours_mismatch"],
    ["is UCS04787 a dashboard problem or Float source mismatch?", "float_hours_mismatch"],
    ["why does LDN Q1 Design show different numbers?", "scope_drilldown_mismatch"],
    ["the Projects search box is only reordering", "project_visibility_archive_search"],
    ["Department Roll Up loses hours when I switch filters", "department_rollup_missing_hours"],
    ["Sheet Health says formula errors but sheets look fine", "sheet_health_false_positive"]
  ])("routes %s to %s", (question, expectedPlaybook) => {
    expect(routePlaybook(question).id).toBe(expectedPlaybook);
  });

  test.each([
    ["archive this project", ["mutation"]],
    ["sync Float now", ["sync"]],
    ["deploy the fix", ["deploy"]],
    ["open the browser and test it", ["browser"]]
  ])("routes out-of-bound request %s to Needs Codex", (question, triggers) => {
    const routed = routePlaybook(question);

    expect(routed.id).toBe("needs_codex_handoff");
    expect(routed.needsCodexTriggers).toEqual(expect.arrayContaining(triggers));
  });

  test("Float mismatch playbook requires raw, cache, visible, and export checks or unresolved framing", () => {
    const playbook = getPlaybook("float_hours_mismatch");

    expect(playbook.requiredTools).toEqual(
      expect.arrayContaining([
        "get_display_contract",
        "inspect_project",
        "inspect_float_raw_cache_visible",
        "parse_pasted_float_export",
        "compare_float_export_to_contract"
      ])
    );
    expect(playbook.requiredSourceLayers).toEqual(
      expect.arrayContaining(["float_raw", "float_cache", "float_visible", "float_export"])
    );
    expect(playbook.forbiddenClaims).toEqual(expect.arrayContaining(["float_mismatch_without_all_layers"]));
  });

  test("fee-sheet sold-hours playbook forbids false zero-hours claims", () => {
    const playbook = getPlaybook("fee_sheet_sold_hours_mismatch");

    expect(playbook.requiredTools).toEqual(expect.arrayContaining(["get_display_contract", "inspect_fee_sheet"]));
    expect(playbook.requiredSourceLayers).toEqual(expect.arrayContaining(["sold", "fee_sheet_parser_summary"]));
    expect(playbook.forbiddenClaims).toEqual(expect.arrayContaining(["zero_hours_when_source_or_contract_nonzero"]));
  });

  test("generic scans are evidence-seeking and cannot claim dashboard bugs by default", () => {
    const playbook = getPlaybook("dashboard_scan");

    expect(playbook.requiredTools.length).toBeGreaterThanOrEqual(3);
    expect(playbook.forbiddenClaims).toEqual(expect.arrayContaining(["dashboard_bug_without_failed_check"]));
    expect(playbook.confidenceRules).toContain("unresolved required checks lower confidence");
  });
});
