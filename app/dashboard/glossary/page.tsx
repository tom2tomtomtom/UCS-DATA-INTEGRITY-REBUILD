import { DashboardChrome } from "../../../src/components/dashboard/chrome/dashboard-chrome";
import { getDashboardContract } from "../../../src/lib/runtime/dashboard-contract";
import { scopeFromSearchParams, type UiSearchParams } from "../../../src/lib/ui/scope-params";

const glossaryItems = [
  ["Unsupported is not zero", "Zero is a source-supported value. Unsupported means the source cannot prove that cut."],
  ["Source-only rows", "Rows from Pipeline, Production Revenue, or Float stay visible even without a sold fee-sheet row."],
  ["Confidence", "Confidence describes how complete and conflict-free the evidence is for the active scope."],
  ["Scope", "Office, dates, department, role, client, search, job number, and Float ID travel with links."],
  ["Needs Codex", "Use Codex for code changes, browser testing, source mutation, sync, deployment, or stakeholder communication."]
] as const;

export default async function GlossaryPage({
  searchParams
}: {
  searchParams?: Promise<UiSearchParams>;
}) {
  const contract = await getDashboardContract(scopeFromSearchParams((await searchParams) ?? {}));

  return (
    <DashboardChrome contract={contract} activePath="/dashboard/glossary">
      <section className="quality-surface">
        <h2>Glossary</h2>
        <ul className="evidence-list">
          {glossaryItems.map(([title, body]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{body}</span>
            </li>
          ))}
        </ul>
      </section>
    </DashboardChrome>
  );
}
