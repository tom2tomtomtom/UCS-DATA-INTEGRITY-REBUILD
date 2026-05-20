import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { ProjectsTable } from "../../../src/components/dashboard/projects/projects-table";
import type { DashboardScope } from "../../../src/lib";
import { getFixtureDashboardContract } from "../../../src/lib/ui/fixture-contract";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProjectsPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const scope = scopeFromParams(params);
  const contract = getFixtureDashboardContract(scope);

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/projects">
      <ProjectsTable contract={contract} />
    </DashboardChrome>
  );
}

function scopeFromParams(params: SearchParams): DashboardScope {
  const scope: DashboardScope = {
    office: valueFor(params.office, "LDN") as DashboardScope["office"],
    from: valueFor(params.from, "2026-01-01"),
    to: valueFor(params.to, "2026-03-31")
  };

  assignOptional(scope, "department", optionalValueFor(params.department));
  assignOptional(scope, "role", optionalValueFor(params.role));
  assignOptional(scope, "client", optionalValueFor(params.client));
  assignOptional(scope, "search", optionalValueFor(params.search));
  assignOptional(scope, "jobNumber", optionalValueFor(params.jobNumber));
  assignOptional(scope, "floatProjectId", optionalValueFor(params.floatProjectId));

  return scope;
}

function valueFor(value: string | string[] | undefined, fallback: string): string {
  return optionalValueFor(value) ?? fallback;
}

function optionalValueFor(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === undefined || raw.trim() === "" ? undefined : raw;
}

function assignOptional(scope: DashboardScope, key: keyof Omit<DashboardScope, "office" | "from" | "to">, value: string | undefined): void {
  if (value !== undefined) {
    scope[key] = value;
  }
}
