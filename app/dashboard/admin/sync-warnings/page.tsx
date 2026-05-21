import { ReadOnlyRouteSurface } from "../../../../src/components/dashboard/admin/readonly-route";
import { DashboardChrome } from "../../../../src/components/dashboard/chrome/dashboard-chrome";
import type { ReconciliationCheck, SourceWarning } from "../../../../src/lib";
import { scopedHref } from "../../../../src/lib";
import { getFixtureDashboardContract } from "../../../../src/lib/ui/fixture-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../../src/lib/ui/scope-params";

export default async function SyncWarningsPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = getFixtureDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));
  const evidenceItems = [
    ...contract.warnings.map((warning) => warningEvidenceItem(warning)),
    ...contract.reconciliation.filter((check) => check.status !== "PASS").map((check) => checkEvidenceItem(check))
  ];

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/admin/sync-warnings">
      <ReadOnlyRouteSurface
        title="Sync Warnings"
        status="Read-only warning review. Dismiss, resync, and archive actions are unavailable while MUTATION_GUARD is read_only."
        evidenceItems={evidenceItems}
      />
    </DashboardChrome>
  );
}

function warningEvidenceItem(warning: SourceWarning) {
  return {
    label: `${warning.status}: ${warning.code}`,
    detail: `${warning.owner}: ${warning.message}`,
    href: scopedHref("/dashboard/data-quality", warning.scope),
    meta: [warning.source, warning.sourceLayer, warning.owner]
  };
}

function checkEvidenceItem(check: ReconciliationCheck) {
  return {
    label: `${check.status}: ${check.code}`,
    detail: check.message ?? check.label,
    href:
      check.scope.jobNumber === undefined
        ? scopedHref("/dashboard/data-quality", check.scope)
        : scopedHref(`/dashboard/projects/${check.scope.jobNumber}`, check.scope),
    meta: [check.sourceRefs.map((ref) => ref.source).join(","), check.scope.jobNumber ?? "No job number"]
  };
}
