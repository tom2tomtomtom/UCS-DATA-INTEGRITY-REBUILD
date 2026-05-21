import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  dashboardDataMode,
  getDashboardContractSync,
  getDashboardFactSetSync
} from "../../src/lib/runtime/dashboard-contract";

const baseScope = {
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31"
} as const;

describe("runtime dashboard contract provider", () => {
  test("defaults to fixture mode until live source archive parsing is implemented", () => {
    expect(dashboardDataMode({})).toBe("fixture");

    const contract = getDashboardContractSync(baseScope, { env: {} });

    expect(contract.scope).toEqual(baseScope);
    expect(contract.visibleRows.length).toBeGreaterThan(0);
  });

  test("blocks source archive mode instead of treating raw imported rows as display facts", () => {
    const env = { DASHBOARD_DATA_MODE: "source_archive" };

    expect(dashboardDataMode(env)).toBe("source_archive");
    expect(() => getDashboardContractSync(baseScope, { env })).toThrow(/source_archive dashboard mode is blocked/);
    expect(() => getDashboardFactSetSync({ env })).toThrow(/source_archive fact-set mode is blocked/);
  });

  test("app routes and chat tools use the runtime provider, not the fixture provider directly", () => {
    const searchedRoots = ["app", "src/lib/chat"].map((root) => join(process.cwd(), root));
    const offenders = searchedRoots
      .flatMap((root) => listFiles(root))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => readFileSync(file, "utf8").includes("fixture-contract"))
      .map((file) => file.replace(`${process.cwd()}/`, ""));

    expect(offenders).toEqual([]);
  });
});

function listFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);

    return stat.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}
