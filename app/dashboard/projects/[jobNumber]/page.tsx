import { DashboardChrome } from "../../../../src/components/dashboard/chrome/dashboard-chrome";
import { ProjectDetail } from "../../../../src/components/dashboard/project-detail/project-detail";
import type { DashboardScope } from "../../../../src/lib";
import { getFixtureDashboardContract } from "../../../../src/lib/ui/fixture-contract";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ jobNumber: string }>;
  searchParams?: Promise<SearchParams>;
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

function scopeFromParams(params: SearchParams, jobNumber: string): DashboardScope {
  const scope: DashboardScope = {
    office: valueFor(params.office, "LDN") as DashboardScope["office"],
    from: valueFor(params.from, "2026-01-01"),
    to: valueFor(params.to, "2026-03-31"),
    jobNumber
  };
  const department = optionalValueFor(params.department);
  if (department !== undefined) scope.department = department;
  const role = optionalValueFor(params.role);
  if (role !== undefined) scope.role = role;
  const client = optionalValueFor(params.client);
  if (client !== undefined) scope.client = client;
  return scope;
}

function valueFor(value: string | string[] | undefined, fallback: string): string {
  return optionalValueFor(value) ?? fallback;
}

function optionalValueFor(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === undefined || raw.trim() === "" ? undefined : raw;
}
