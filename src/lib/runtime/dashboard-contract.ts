import type { DashboardDisplayContract, DashboardScope, SourceFactSet } from "../index";
import type { SourceArchiveRecord } from "../source-archive/types";
import { fixtureFactSet, getFixtureDashboardContract } from "../ui/fixture-contract";
import {
  buildDashboardContractFromArchiveRows,
  buildSourceFactSetFromArchiveRows
} from "./source-archive-contract";

export type DashboardDataMode = "fixture" | "source_archive";
export type DashboardRuntimeEnv = Readonly<Record<string, string | undefined>>;

export type DashboardContractProviderOptions = {
  readonly env?: DashboardRuntimeEnv;
  readonly sourceArchiveRows?: readonly SourceArchiveRecord[];
  readonly generatedAt?: string;
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
    if (options.sourceArchiveRows === undefined) {
      throw new Error("source_archive dashboard mode requires explicit sourceArchiveRows until the DB reader is implemented.");
    }

    return buildDashboardContractFromArchiveRows({
      rows: options.sourceArchiveRows,
      scope,
      generatedAt: options.generatedAt ?? new Date().toISOString()
    });
  }

  return getFixtureDashboardContract(scope);
}

export function getDashboardFactSetSync(options: DashboardContractProviderOptions = {}): SourceFactSet {
  const mode = dashboardDataMode(options.env ?? process.env);

  if (mode === "source_archive") {
    if (options.sourceArchiveRows === undefined) {
      throw new Error("source_archive fact-set mode requires explicit sourceArchiveRows until the DB reader is implemented.");
    }

    return buildSourceFactSetFromArchiveRows(
      options.sourceArchiveRows,
      options.generatedAt ?? new Date().toISOString()
    );
  }

  return fixtureFactSet();
}

export function dashboardDataMode(env: DashboardRuntimeEnv = process.env): DashboardDataMode {
  return env.DASHBOARD_DATA_MODE === "source_archive" ? "source_archive" : "fixture";
}
