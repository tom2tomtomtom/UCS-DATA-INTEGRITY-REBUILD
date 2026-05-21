import type { DashboardDisplayContract, DashboardScope, SourceFactSet } from "../index";
import { fixtureFactSet, getFixtureDashboardContract } from "../ui/fixture-contract";

export type DashboardDataMode = "fixture" | "source_archive";
export type DashboardRuntimeEnv = Readonly<Record<string, string | undefined>>;

export type DashboardContractProviderOptions = {
  readonly env?: DashboardRuntimeEnv;
};

export async function getDashboardContract(
  scope: DashboardScope,
  options: DashboardContractProviderOptions = {}
): Promise<DashboardDisplayContract> {
  return getDashboardContractSync(scope, options);
}

export function getDashboardContractSync(
  scope: DashboardScope,
  options: DashboardContractProviderOptions = {}
): DashboardDisplayContract {
  const mode = dashboardDataMode(options.env ?? process.env);

  if (mode === "source_archive") {
    throw new Error("source_archive dashboard mode is blocked until imported source rows are parsed into display facts.");
  }

  return getFixtureDashboardContract(scope);
}

export function getDashboardFactSetSync(options: DashboardContractProviderOptions = {}): SourceFactSet {
  const mode = dashboardDataMode(options.env ?? process.env);

  if (mode === "source_archive") {
    throw new Error("source_archive fact-set mode is blocked until imported source rows are parsed into display facts.");
  }

  return fixtureFactSet();
}

export function dashboardDataMode(env: DashboardRuntimeEnv = process.env): DashboardDataMode {
  return env.DASHBOARD_DATA_MODE === "source_archive" ? "source_archive" : "fixture";
}
