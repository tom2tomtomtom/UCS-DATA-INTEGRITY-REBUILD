import { createHash } from "node:crypto";

const legacyCacheTables = new Set([
  "float_allocations",
  "float_tasks_canon",
  "pipeline_data",
  "sold_monthly",
  "production_revenue",
  "projects_cache",
  "dashboard_cache",
  "fee_sheet_cache"
]);

const sourceLayerBySource = {
  fee_sheet: "sold",
  pipeline: "pipeline",
  production_revenue: "production_revenue",
  float: "float_raw",
  read_only_sql: "read_only_sql",
  sync_log: "sync_log"
};

export function buildSourceSnapshotImportPlan(snapshot) {
  if (snapshot.readOnly !== true) {
    throw new Error("Snapshot imports must be explicitly read-only.");
  }

  const snapshotKey = safeId(snapshot.snapshotId);
  const batches = [];
  const rawRows = [];
  const skippedRows = [];
  const bySource = {};
  const warnings = new Set();
  let cacheEvidenceRows = 0;

  (snapshot.sources ?? []).forEach((sourceSnapshot, sourceIndex) => {
    const batchId = deterministicUuid(`batch:${snapshotKey}:${sourceSnapshot.source}:${sourceIndex}`);
    const batchWarnings = [];
    const sourceReport = reportForSource(bySource, sourceSnapshot.source);
    batches.push({
      id: batchId,
      source: sourceSnapshot.source,
      status: "success",
      mode: sourceSnapshot.mode,
      startedAt: snapshot.capturedAt,
      completedAt: snapshot.capturedAt,
      sourceLabel: sourceSnapshot.sourceLabel,
      sourceVersion: sourceSnapshot.sourceVersion,
      readOnly: true,
      warnings: batchWarnings,
      metadata: {
        snapshotId: snapshot.snapshotId,
        importedAsTruth: false
      }
    });

    (sourceSnapshot.rows ?? []).forEach((row, rowIndex) => {
      assertValidRowIdentity(sourceSnapshot.source, row.identity);
      sourceReport.totalRows += 1;
      const rawRowId = deterministicUuid(`raw:${snapshotKey}:${sourceSnapshot.source}:${sourceIndex}:${rowIndex}:${row.identity.stableSourceRowKey}`);
      const raw = structuredClone(row.raw);
      const contentHash = hashPayload({
        identity: row.identity,
        raw
      });
      const legacyCacheEvidence = isLegacyCacheEvidence(sourceSnapshot, row);
      const sourceRefs = createSourceRefs({
        source: sourceSnapshot.source,
        batchId,
        rawRowId,
        identity: row.identity,
        legacyCacheEvidence
      });

      if (isLiterallyEmpty(raw, row.identity)) {
        skippedRows.push({
          id: rawRowId,
          batchId,
          source: sourceSnapshot.source,
          identity: row.identity,
          observedAt: snapshot.capturedAt,
          raw,
          contentHash,
          sourceRefs,
          skip: {
            allowedByLaw: true,
            classification: "literally_empty",
            reason: "No job, project, client, date, amount, hours, or useful source identifier.",
            evidence: {
              hasJobNumber: false,
              hasProjectName: false,
              hasClient: false,
              hasDate: false,
              hasAmount: false,
              hasHours: false,
              hasUsefulSourceIdentifier: false
            }
          }
        });
        sourceReport.skippedRows += 1;
        return;
      }

      if (legacyCacheEvidence) {
        cacheEvidenceRows += 1;
        sourceReport.cacheEvidenceRows += 1;
        warnings.add("legacy_cache_imported_as_evidence_only");
        batchWarnings.push("legacy_cache_imported_as_evidence_only");
      }

      rawRows.push({
        id: rawRowId,
        batchId,
        source: sourceSnapshot.source,
        identity: row.identity,
        raw,
        contentHash,
        observedAt: snapshot.capturedAt,
        sourceRefs
      });
      sourceReport.rawRows += 1;
    });
  });

  const reportWarnings = [...warnings].sort();
  return {
    batches,
    rawRows,
    skippedRows,
    report: {
      status: reportWarnings.length > 0 ? "warn" : "pass",
      snapshotId: snapshot.snapshotId,
      capturedAt: snapshot.capturedAt,
      totalRows: rawRows.length + skippedRows.length,
      rawRows: rawRows.length,
      skippedRows: skippedRows.length,
      cacheEvidenceRows,
      bySource,
      warnings: reportWarnings
    }
  };
}

function reportForSource(reports, source) {
  if (reports[source] !== undefined) return reports[source];

  reports[source] = {
    totalRows: 0,
    rawRows: 0,
    skippedRows: 0,
    cacheEvidenceRows: 0
  };
  return reports[source];
}

function assertValidRowIdentity(source, identity) {
  if (typeof identity?.stableSourceRowKey !== "string" || identity.stableSourceRowKey.trim() === "") {
    throw new Error("Source row is missing stableSourceRowKey.");
  }

  if (
    (source === "fee_sheet" || source === "pipeline" || source === "production_revenue") &&
    (typeof identity.sourceDocumentId !== "string" ||
      identity.sourceDocumentId.trim() === "" ||
      typeof identity.sourceTab !== "string" ||
      identity.sourceTab.trim() === "" ||
      typeof identity.sourceRowNumber !== "number")
  ) {
    throw new Error(`${source} snapshot rows require sourceDocumentId, sourceTab, and sourceRowNumber.`);
  }

  if (source === "float" && (typeof identity.sourceObjectId !== "string" || identity.sourceObjectId.trim() === "")) {
    throw new Error("float snapshot rows require sourceObjectId.");
  }
}

function createSourceRefs(input) {
  return [
    {
      source: input.source,
      sourceLayer: sourceLayerBySource[input.source],
      batchId: input.batchId,
      rawRowId: input.rawRowId,
      sourceDocumentId: input.identity.sourceDocumentId,
      sourceTab: input.identity.sourceTab,
      sourceRowNumber: input.identity.sourceRowNumber,
      sourceObjectId: input.identity.sourceObjectId,
      ...(input.legacyCacheEvidence ? { field: "legacy_cache_evidence_only" } : {})
    }
  ];
}

function isLiterallyEmpty(raw, identity) {
  if (typeof identity.sourceObjectId === "string" && identity.sourceObjectId.trim() !== "") {
    return false;
  }

  return !hasNonEmptyValue(raw);
}

function hasNonEmptyValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasNonEmptyValue);
  if (typeof value === "object") return Object.values(value).some(hasNonEmptyValue);
  return false;
}

function isLegacyCacheEvidence(sourceSnapshot, row) {
  if (sourceSnapshot.mode !== "legacy_import" && sourceSnapshot.source !== "read_only_sql") {
    return false;
  }

  const tableName = tableNameFromRaw(row.raw);
  if (tableName !== undefined && legacyCacheTables.has(tableName)) return true;

  const identityText = [
    row.identity.stableSourceRowKey,
    row.identity.sourceObjectId,
    row.identity.sourceDocumentId,
    row.identity.sourceTab
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return [...legacyCacheTables].some((table) => identityText.includes(table));
}

function tableNameFromRaw(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const value = raw.table ?? raw.tableName ?? raw.sourceTable;
  return typeof value === "string" ? value.trim().toLowerCase() : undefined;
}

function hashPayload(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function deterministicUuid(seed) {
  const hash = createHash("sha256").update(seed).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0")}${hash.slice(18, 20)}`,
    hash.slice(20, 32)
  ].join("-");
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function safeId(value) {
  const safe = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (safe === "") throw new Error("Snapshot import identifiers cannot be blank.");
  return safe;
}
