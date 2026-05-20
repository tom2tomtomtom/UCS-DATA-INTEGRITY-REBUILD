import type { SourceName } from "../canon/types";
import type {
  ArchivedRawSourceRow,
  SkippedSourceRow,
  SourceArchiveBatch,
  SourceArchiveRecord,
  SourceRowIdentity
} from "./types";

export type SourceArchiveIdentityQuery = Partial<SourceRowIdentity> & {
  readonly source?: SourceName;
};

export type SourceArchiveStore = {
  appendBatch(batch: SourceArchiveBatch): SourceArchiveStore;
  appendRawRow(row: ArchivedRawSourceRow): SourceArchiveStore;
  appendSkippedRow(row: SkippedSourceRow): SourceArchiveStore;
  getBatch(id: string): SourceArchiveBatch | undefined;
  getRawRow(id: string): ArchivedRawSourceRow | undefined;
  getSkippedRow(id: string): SkippedSourceRow | undefined;
  listBatches(): readonly SourceArchiveBatch[];
  listRawRows(): readonly ArchivedRawSourceRow[];
  listSkippedRows(): readonly SkippedSourceRow[];
  listRowsByBatch(batchId: string): readonly SourceArchiveRecord[];
  listRowsBySource(source: SourceName): readonly SourceArchiveRecord[];
  listRawRowsByContentHash(contentHash: string): readonly ArchivedRawSourceRow[];
  findRowsByIdentity(query: SourceArchiveIdentityQuery): readonly SourceArchiveRecord[];
};

class InMemorySourceArchiveStore implements SourceArchiveStore {
  private readonly batches: readonly SourceArchiveBatch[];
  private readonly rawRows: readonly ArchivedRawSourceRow[];
  private readonly skippedRows: readonly SkippedSourceRow[];

  constructor(
    batches: readonly SourceArchiveBatch[] = [],
    rawRows: readonly ArchivedRawSourceRow[] = [],
    skippedRows: readonly SkippedSourceRow[] = []
  ) {
    this.batches = freezeArray(batches);
    this.rawRows = freezeArray(rawRows);
    this.skippedRows = freezeArray(skippedRows);
  }

  appendBatch(batch: SourceArchiveBatch): SourceArchiveStore {
    if (this.getBatch(batch.id) !== undefined) {
      throw new Error(`Source archive batch already exists: ${batch.id}`);
    }

    return new InMemorySourceArchiveStore(
      [...this.batches, cloneAndFreeze(batch)],
      this.rawRows,
      this.skippedRows
    );
  }

  appendRawRow(row: ArchivedRawSourceRow): SourceArchiveStore {
    if (this.getRawRow(row.id) !== undefined || this.getSkippedRow(row.id) !== undefined) {
      throw new Error(`Source archive row already exists: ${row.id}`);
    }

    return new InMemorySourceArchiveStore(
      this.batches,
      [...this.rawRows, cloneAndFreeze(row)],
      this.skippedRows
    );
  }

  appendSkippedRow(row: SkippedSourceRow): SourceArchiveStore {
    if (this.getRawRow(row.id) !== undefined || this.getSkippedRow(row.id) !== undefined) {
      throw new Error(`Source archive row already exists: ${row.id}`);
    }

    return new InMemorySourceArchiveStore(
      this.batches,
      this.rawRows,
      [...this.skippedRows, cloneAndFreeze(row)]
    );
  }

  getBatch(id: string): SourceArchiveBatch | undefined {
    return this.batches.find((batch) => batch.id === id);
  }

  getRawRow(id: string): ArchivedRawSourceRow | undefined {
    return this.rawRows.find((row) => row.id === id);
  }

  getSkippedRow(id: string): SkippedSourceRow | undefined {
    return this.skippedRows.find((row) => row.id === id);
  }

  listBatches(): readonly SourceArchiveBatch[] {
    return this.batches;
  }

  listRawRows(): readonly ArchivedRawSourceRow[] {
    return this.rawRows;
  }

  listSkippedRows(): readonly SkippedSourceRow[] {
    return this.skippedRows;
  }

  listRowsByBatch(batchId: string): readonly SourceArchiveRecord[] {
    return freezeArray(this.records().filter((row) => row.batchId === batchId));
  }

  listRowsBySource(source: SourceName): readonly SourceArchiveRecord[] {
    return freezeArray(this.records().filter((row) => row.source === source));
  }

  listRawRowsByContentHash(contentHash: string): readonly ArchivedRawSourceRow[] {
    return freezeArray(this.rawRows.filter((row) => row.contentHash === contentHash));
  }

  findRowsByIdentity(query: SourceArchiveIdentityQuery): readonly SourceArchiveRecord[] {
    if (!hasIdentityCriteria(query)) {
      return freezeArray([]);
    }

    return freezeArray(this.records().filter((row) => matchesIdentity(row, query)));
  }

  private records(): readonly SourceArchiveRecord[] {
    return freezeArray([...this.rawRows, ...this.skippedRows]);
  }
}

export function createInMemorySourceArchiveStore(): SourceArchiveStore {
  return new InMemorySourceArchiveStore();
}

function hasIdentityCriteria(query: SourceArchiveIdentityQuery): boolean {
  return (
    query.source !== undefined ||
    query.stableSourceRowKey !== undefined ||
    query.sourceDocumentId !== undefined ||
    query.sourceTab !== undefined ||
    query.sourceRowNumber !== undefined ||
    query.sourceObjectId !== undefined
  );
}

function matchesIdentity(record: SourceArchiveRecord, query: SourceArchiveIdentityQuery): boolean {
  return (
    matchesOptional(query.source, record.source) &&
    matchesOptional(query.stableSourceRowKey, record.identity.stableSourceRowKey) &&
    matchesOptional(query.sourceDocumentId, record.identity.sourceDocumentId) &&
    matchesOptional(query.sourceTab, record.identity.sourceTab) &&
    matchesOptional(query.sourceRowNumber, record.identity.sourceRowNumber) &&
    matchesOptional(query.sourceObjectId, record.identity.sourceObjectId)
  );
}

function matchesOptional<T>(expected: T | undefined, actual: T | undefined): boolean {
  return expected === undefined || expected === actual;
}

function cloneAndFreeze<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function freezeArray<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items]);
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  const objectValue = value as object;
  if (seen.has(objectValue)) {
    return value;
  }
  seen.add(objectValue);

  for (const nestedValue of Object.values(value)) {
    deepFreeze(nestedValue, seen);
  }

  return Object.freeze(value);
}
