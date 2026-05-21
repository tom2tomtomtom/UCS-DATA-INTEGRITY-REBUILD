import { DashboardChrome } from "../../src/components/dashboard/chrome/dashboard-chrome";
import { DashboardHome, type RollupSortKey } from "../../src/components/dashboard/rollups/dashboard-home";
import type { RollupDimension } from "../../src/lib";
import { getDashboardContract } from "../../src/lib/runtime/dashboard-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../src/lib/ui/scope-params";

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const contract = await getDashboardContract(scopeFromSearchParams(params));
  const view = rollupViewFromSearchParams(params);
  const sortKey = rollupSortKeyFromSearchParams(params);
  const sortDir = rollupSortDirFromSearchParams(params);

  return (
    <DashboardChrome contract={contract} activePath="/dashboard" extraScopeParams={rollupChromeParams(params, view, sortKey, sortDir)}>
      <DashboardHome contract={contract} view={view} sortKey={sortKey} sortDir={sortDir} />
    </DashboardChrome>
  );
}

function rollupViewFromSearchParams(params: UiSearchParams): RollupDimension {
  const raw = Array.isArray(params.view) ? params.view[0] : params.view;

  if (raw === "month" || raw === "role" || raw === "client") {
    return raw;
  }

  return "department";
}

function rollupSortKeyFromSearchParams(params: UiSearchParams): RollupSortKey {
  const raw = Array.isArray(params.sort) ? params.sort[0] : params.sort;

  if (
    raw === "label" ||
    raw === "pipelineFee" ||
    raw === "soldFee" ||
    raw === "soldHours" ||
    raw === "allocatedHours" ||
    raw === "unallocatedHours" ||
    raw === "totalHours" ||
    raw === "allocatedValue" ||
    raw === "variancePercent" ||
    raw === "status"
  ) {
    return raw;
  }

  return "soldFee";
}

function rollupSortDirFromSearchParams(params: UiSearchParams): "asc" | "desc" {
  const raw = Array.isArray(params.dir) ? params.dir[0] : params.dir;
  return raw === "asc" ? "asc" : "desc";
}

function rollupChromeParams(
  params: UiSearchParams,
  view: RollupDimension,
  sortKey: RollupSortKey,
  sortDir: "asc" | "desc"
): Record<string, string | undefined> {
  return {
    view,
    ...(hasScalarParam(params.sort) ? { sort: sortKey } : {}),
    ...(hasScalarParam(params.dir) ? { dir: sortDir } : {})
  };
}

function hasScalarParam(value: string | string[] | undefined): boolean {
  const scalar = Array.isArray(value) ? value[0] : value;
  return scalar !== undefined && scalar.trim() !== "";
}
