import type { SourceName } from "../canon/types";
import type { ArchivedRawSourceRow, SourceRowIdentity } from "../source-archive/types";
import {
  buildSourceSnapshotImportPlan,
  type SourceSnapshotImportInput
} from "./snapshot-import";

export type SourceSnapshotDeletionEvidence = {
  readonly source: SourceName;
  readonly identity: Partial<SourceRowIdentity> & Pick<SourceRowIdentity, "stableSourceRowKey">;
  readonly observedAt: string;
  readonly evidenceRef: string;
};

export type SourceSnapshotLifecycleState =
  | "current"
  | "not_seen_in_latest_batch"
  | "deleted_by_source_evidence";

export type SourceSnapshotLifecycleRow = {
  readonly source: SourceName;
  readonly identity: SourceRowIdentity;
  readonly lifecycleState: SourceSnapshotLifecycleState;
  readonly previousSnapshotId: string;
  readonly currentSnapshotId: string;
  readonly currentSupported: boolean;
  readonly historicalRawRow?: ArchivedRawSourceRow;
  readonly currentRawRow?: ArchivedRawSourceRow;
  readonly deletionEvidence?: SourceSnapshotDeletionEvidence;
};

export type SourceSnapshotLifecyclePlan = {
  readonly previousSnapshotId: string;
  readonly currentSnapshotId: string;
  readonly currentRows: readonly ArchivedRawSourceRow[];
  readonly historicalRows: readonly ArchivedRawSourceRow[];
  readonly lifecycleRows: readonly SourceSnapshotLifecycleRow[];
  readonly unresolvedDisappearedRows: readonly SourceSnapshotLifecycleRow[];
  readonly deletedRows: readonly SourceSnapshotLifecycleRow[];
  readonly currentCountBySource: Partial<Record<SourceName, number>>;
};

export function buildSourceSnapshotLifecyclePlan(input: {
  readonly previous: SourceSnapshotImportInput;
  readonly current: SourceSnapshotImportInput;
  readonly deletionEvidence?: readonly SourceSnapshotDeletionEvidence[];
}): SourceSnapshotLifecyclePlan {
  const previousPlan = buildSourceSnapshotImportPlan(input.previous);
  const currentPlan = buildSourceSnapshotImportPlan(input.current);
  const currentSources = new Set(input.current.sources.map((source) => source.source));
  const currentRowsByIdentity = new Map(
    currentPlan.rawRows.map((row) => [identityKey(row.source, row.identity), row])
  );
  const deletionEvidence = input.deletionEvidence ?? [];
  const lifecycleRows: SourceSnapshotLifecycleRow[] = [];

  for (const currentRawRow of currentPlan.rawRows) {
    lifecycleRows.push({
      source: currentRawRow.source,
      identity: currentRawRow.identity,
      lifecycleState: "current",
      previousSnapshotId: input.previous.snapshotId,
      currentSnapshotId: input.current.snapshotId,
      currentSupported: true,
      currentRawRow
    });
  }

  for (const historicalRawRow of previousPlan.rawRows) {
    if (!currentSources.has(historicalRawRow.source)) continue;
    if (currentRowsByIdentity.has(identityKey(historicalRawRow.source, historicalRawRow.identity))) {
      continue;
    }

    const matchingDeletionEvidence = deletionEvidence.find((evidence) =>
      evidenceMatchesIdentity(evidence, historicalRawRow)
    );
    lifecycleRows.push({
      source: historicalRawRow.source,
      identity: historicalRawRow.identity,
      lifecycleState:
        matchingDeletionEvidence === undefined
          ? "not_seen_in_latest_batch"
          : "deleted_by_source_evidence",
      previousSnapshotId: input.previous.snapshotId,
      currentSnapshotId: input.current.snapshotId,
      currentSupported: false,
      historicalRawRow,
      ...(matchingDeletionEvidence === undefined ? {} : { deletionEvidence: matchingDeletionEvidence })
    });
  }

  const unresolvedDisappearedRows = lifecycleRows.filter(
    (row) => row.lifecycleState === "not_seen_in_latest_batch"
  );
  const deletedRows = lifecycleRows.filter(
    (row) => row.lifecycleState === "deleted_by_source_evidence"
  );

  return {
    previousSnapshotId: input.previous.snapshotId,
    currentSnapshotId: input.current.snapshotId,
    currentRows: currentPlan.rawRows,
    historicalRows: previousPlan.rawRows,
    lifecycleRows,
    unresolvedDisappearedRows,
    deletedRows,
    currentCountBySource: countRowsBySource(currentPlan.rawRows)
  };
}

function identityKey(source: SourceName, identity: SourceRowIdentity): string {
  return `${source}:${identity.stableSourceRowKey}`;
}

function evidenceMatchesIdentity(
  evidence: SourceSnapshotDeletionEvidence,
  row: ArchivedRawSourceRow
): boolean {
  return (
    evidence.source === row.source &&
    matchesRequired(evidence.identity.stableSourceRowKey, row.identity.stableSourceRowKey) &&
    matchesOptional(evidence.identity.sourceDocumentId, row.identity.sourceDocumentId) &&
    matchesOptional(evidence.identity.sourceTab, row.identity.sourceTab) &&
    matchesOptional(evidence.identity.sourceRowNumber, row.identity.sourceRowNumber) &&
    matchesOptional(evidence.identity.sourceObjectId, row.identity.sourceObjectId)
  );
}

function matchesRequired<T>(expected: T, actual: T): boolean {
  return expected === actual;
}

function matchesOptional<T>(expected: T | undefined, actual: T | undefined): boolean {
  return expected === undefined || expected === actual;
}

function countRowsBySource(rows: readonly ArchivedRawSourceRow[]): Partial<Record<SourceName, number>> {
  return rows.reduce<Partial<Record<SourceName, number>>>((counts, row) => {
    counts[row.source] = (counts[row.source] ?? 0) + 1;
    return counts;
  }, {});
}
