import { ReadOnlyRouteSurface } from "../../../../src/components/dashboard/admin/readonly-route";
import { DashboardChrome } from "../../../../src/components/dashboard/chrome/dashboard-chrome";
import type { DashboardScope, ReconciliationCheck, SourceWarning } from "../../../../src/lib";
import { scopedHref } from "../../../../src/lib";
import { getFixtureDashboardContract } from "../../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../../src/lib/ui/scope-params";

type WarningEvidenceItem = {
  readonly label: string;
  readonly detail: string;
  readonly href?: string;
  readonly meta?: readonly string[];
  readonly owner: string;
  readonly source: string;
  readonly status: string;
};

export default async function SyncWarningsPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const scope = scopeFromSearchParams(params);
  const contract = getFixtureDashboardContract(scope);
  const evidenceItems = filterEvidenceItems([
    ...contract.warnings.map((warning) => warningEvidenceItem(warning)),
    ...contract.reconciliation.filter((check) => check.status !== "PASS").map((check) => checkEvidenceItem(check))
  ], params);

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/admin/sync-warnings">
      <ReadOnlyRouteSurface
        title="Sync Warnings"
        status="Read-only warning review. Dismiss, resync, and archive actions are unavailable while MUTATION_GUARD is read_only."
        controls={warningFilterControls(scope, params)}
        evidenceItems={evidenceItems}
      />
    </DashboardChrome>
  );
}

function warningEvidenceItem(warning: SourceWarning): WarningEvidenceItem {
  return {
    label: `${warning.status}: ${warning.code}`,
    detail: `${warning.owner}: ${warning.message}`,
    href: scopedHref("/dashboard/data-quality", warning.scope),
    meta: [warning.source, warning.sourceLayer, warning.owner],
    owner: warning.owner,
    source: warning.source,
    status: warning.status
  };
}

function checkEvidenceItem(check: ReconciliationCheck): WarningEvidenceItem {
  const source = check.sourceRefs.map((ref) => ref.source).filter(Boolean).join(",") || "reconciliation";

  return {
    label: `${check.status}: ${check.code}`,
    detail: check.message ?? check.label,
    href:
      check.scope.jobNumber === undefined
        ? scopedHref("/dashboard/data-quality", check.scope)
        : scopedHref(`/dashboard/projects/${check.scope.jobNumber}`, check.scope),
    meta: [source, check.scope.jobNumber ?? "No job number"],
    owner: "System",
    source,
    status: check.status
  };
}

function filterEvidenceItems(items: readonly WarningEvidenceItem[], params: UiSearchParams): WarningEvidenceItem[] {
  const status = scalarParam(params.warningStatus)?.toUpperCase();
  const source = scalarParam(params.warningSource);
  const owner = scalarParam(params.warningOwner);

  return items.filter((item) => {
    if (status !== undefined && item.status.toUpperCase() !== status) return false;
    if (source !== undefined && !item.source.split(",").includes(source)) return false;
    if (owner !== undefined && item.owner !== owner) return false;
    return true;
  });
}

function warningFilterControls(scope: DashboardScope, params: UiSearchParams) {
  return (
    <form action="/dashboard/admin/sync-warnings" className="filter-menu" method="get">
      {scopeHiddenInputs(scope)}
      <label htmlFor="warningStatus">Status</label>
      <select id="warningStatus" name="warningStatus" defaultValue={scalarParam(params.warningStatus) ?? ""}>
        <option value="">All statuses</option>
        <option value="WARN">WARN</option>
        <option value="FAIL">FAIL</option>
      </select>
      <label htmlFor="warningSource">Source</label>
      <select id="warningSource" name="warningSource" defaultValue={scalarParam(params.warningSource) ?? ""}>
        <option value="">All sources</option>
        <option value="fee_sheet">Fee sheets</option>
        <option value="pipeline">Pipeline</option>
        <option value="production_revenue">Production revenue</option>
        <option value="float">Float</option>
      </select>
      <label htmlFor="warningOwner">Owner</label>
      <select id="warningOwner" name="warningOwner" defaultValue={scalarParam(params.warningOwner) ?? ""}>
        <option value="">All owners</option>
        <option value="Sian">Sian</option>
        <option value="Jade">Jade</option>
        <option value="Yunni">Yunni</option>
        <option value="System">System</option>
      </select>
      <button type="submit">Apply filters</button>
      <a className="filter-clear-link" href={scopedHref("/dashboard/admin/sync-warnings", scope)}>
        Clear warning filters
      </a>
    </form>
  );
}

function scopeHiddenInputs(scope: DashboardScope) {
  const values = {
    office: scope.office,
    offices: scope.offices?.join(","),
    from: scope.from,
    to: scope.to,
    department: scope.department,
    role: scope.role,
    client: scope.client,
    search: scope.search,
    jobNumber: scope.jobNumber,
    floatProjectId: scope.floatProjectId
  };

  return Object.entries(values).flatMap(([name, value]) =>
    value === undefined || value.trim() === "" ? [] : <input key={name} name={name} type="hidden" value={value} />
  );
}

function scalarParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === undefined || raw.trim() === "" ? undefined : raw;
}
