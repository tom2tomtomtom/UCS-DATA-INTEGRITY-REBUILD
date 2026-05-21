import type { DashboardDisplayContract, DashboardScope, SourceFactSet } from "../index";
import type { SourceArchiveRecord } from "../source-archive/types";
import { fixtureFactSet, getFixtureDashboardContract } from "../ui/fixture-contract";
import {
  buildDashboardContractFromArchiveRows,
  buildSourceFactSetFromArchiveRows
} from "./source-archive-contract";
import { readLatestArchivedSourceRowsFromSupabase } from "./source-archive-supabase-reader";

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
  const mode = dashboardDataMode(options.env ?? process.env);

  if (mode === "source_archive" && options.sourceArchiveRows === undefined) {
    const sourceArchiveRows = await readLatestArchivedSourceRowsFromSupabase({
      env: options.env ?? process.env
    });

    return buildDashboardContractFromArchiveRows({
      rows: sourceArchiveRows,
      scope,
      generatedAt: options.generatedAt ?? new Date().toISOString()
    });
  }

  return getDashboardContractSync(scope, options);
}

export function getDashboardContractSync(
  scope: DashboardScope,
  options: DashboardContractProviderOptions = {}
): DashboardDisplayContract {
  const mode = dashboardDataMode(options.env ?? process.env);

  if (mode === "source_archive") {
    if (options.sourceArchiveRows === undefined) {
      throw new Error("source_archive dashboard sync mode requires explicit sourceArchiveRows; use getDashboardContract for DB-backed reads.");
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
  const mode = env.DASHBOARD_DATA_MODE;

  if (mode === "source_archive") return "source_archive";
  if (mode === "fixture" && fixtureDashboardModeAllowed(env)) return "fixture";
  if (mode === undefined && fixtureDashboardModeAllowed(env)) return "fixture";

  throw new Error(
    mode === undefined
      ? "DASHBOARD_DATA_MODE must be set to source_archive outside local/test dashboard runs."
      : `Unsupported DASHBOARD_DATA_MODE "${mode}". Use source_archive outside local/test dashboard runs.`
  );
}

export function fixtureDashboardModeAllowed(env: DashboardRuntimeEnv = process.env): boolean {
  if (env.ALLOW_FIXTURE_DASHBOARD === "1") return true;
  if (env.NODE_ENV === "test") return true;
  if (env.APP_ENV === "test" || env.APP_ENV === "local" || env.APP_ENV === "development") return true;
  if (env.NODE_ENV === "development" && env.APP_ENV === undefined) return true;

  return false;
}
