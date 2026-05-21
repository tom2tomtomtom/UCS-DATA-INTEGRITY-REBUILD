import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { ProjectsTable } from "../../../src/components/dashboard/projects/projects-table";
import { getDashboardContract } from "../../../src/lib/runtime/dashboard-contract";
import { projectsViewStateFromSearchParams } from "../../../src/lib/ui/projects-view-state";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

export default async function ProjectsPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const scope = scopeFromParams(params);
  const viewState = projectsViewStateFromSearchParams(params);
  const contract = await getDashboardContract(scope);

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/projects" extraScopeParams={projectsChromeParams(params)}>
      <ProjectsTable contract={contract} params={params} viewState={viewState} />
    </DashboardChrome>
  );
}

function scopeFromParams(params: UiSearchParams) {
  return scopeFromSearchParams(params);
}

function projectsChromeParams(params: UiSearchParams): Record<string, string | undefined> {
  return {
    pview: scalarParam(params.pview),
    view: scalarParam(params.view)
  };
}

function scalarParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
