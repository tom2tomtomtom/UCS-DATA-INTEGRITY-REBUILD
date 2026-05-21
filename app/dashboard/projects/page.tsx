import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { ProjectsTable } from "../../../src/components/dashboard/projects/projects-table";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";
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
  const contract = getFixtureDashboardContract(scope);

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/projects">
      <ProjectsTable contract={contract} params={params} viewState={viewState} />
    </DashboardChrome>
  );
}

function scopeFromParams(params: UiSearchParams) {
  return scopeFromSearchParams(params);
}
