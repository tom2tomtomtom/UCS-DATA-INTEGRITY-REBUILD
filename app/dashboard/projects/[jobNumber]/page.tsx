import { DashboardChrome } from "../../../../src/components/dashboard/chrome/dashboard-chrome";
import { ProjectDetail } from "../../../../src/components/dashboard/project-detail/project-detail";
import { getFixtureDashboardContract } from "../../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../../src/lib/ui/scope-params";

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ jobNumber: string }>;
  searchParams?: Promise<UiSearchParams>;
}) {
  const { jobNumber } = await params;
  const query = (await searchParams) ?? {};
  const scope = scopeFromParams(query, jobNumber);
  const contract = getFixtureDashboardContract(scope);

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/projects">
      <ProjectDetail contract={contract} jobNumber={jobNumber} />
    </DashboardChrome>
  );
}

function scopeFromParams(params: UiSearchParams, jobNumber: string) {
  return scopeFromSearchParams(params, { jobNumber });
}
