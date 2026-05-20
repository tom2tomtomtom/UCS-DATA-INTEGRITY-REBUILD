import type {
  MoneyValue,
  ProductionRevenueFact,
  SourceCapability,
  SourceTraceRef,
  SourceWarning
} from "../canon/types";
import type { ArchivedRawSourceRow, SourceArchivePayload } from "../source-archive/types";
import { createParserFactEvidence, createParserResult, createParserWarning } from "./shared";
import type { ParserResult, ParserWarning } from "./types";

const SOURCE = "production_revenue" as const;
const SOURCE_LAYER = "production_revenue" as const;
const PARSER_NAME = "production-revenue";

type ProductionRevenueRawRecord = Readonly<Record<string, unknown>>;

type WarningPair = {
  readonly parserWarning: ParserWarning;
  readonly sourceWarning: SourceWarning;
};

type ParsedProductionRevenueRow = {
  readonly row: ArchivedRawSourceRow;
  readonly fact: ProductionRevenueFact;
  readonly parserWarnings: readonly ParserWarning[];
  readonly collisionKey: string;
};

type ProductionRevenueOffice = Exclude<ProductionRevenueFact["office"], undefined>;

const PRODUCTION_REVENUE_CAPABILITIES = [
  {
    key: "project",
    status: "partial",
    reason: "Supported when job or project evidence exists; no-job rows remain source-attributed."
  },
  {
    key: "month",
    status: "supported"
  },
  {
    key: "office",
    status: "partial",
    reason: "Production revenue rows may require office inference from source identity."
  },
  {
    key: "client",
    status: "supported"
  },
  {
    key: "department",
    status: "unsupported",
    reason: "Production revenue source rows do not support department attribution."
  },
  {
    key: "role",
    status: "unsupported",
    reason: "Production revenue source rows do not support role attribution."
  },
  {
    key: "person",
    status: "unsupported",
    reason: "Production revenue source rows do not support person attribution."
  }
] as const satisfies readonly SourceCapability[];

export function parseProductionRevenueRows(
  rows: readonly ArchivedRawSourceRow[]
): ParserResult<ProductionRevenueFact> {
  const productionRows = rows.filter((row) => row.source === SOURCE);
  const parsedRows = productionRows.map(parseProductionRevenueRow);
  const collisionWarnings = createStatusCollisionWarnings(parsedRows);
  const collisionWarningsByRawRowId = groupSourceWarningsByRawRowId(collisionWarnings);

  return createParserResult({
    parserName: PARSER_NAME,
    source: SOURCE,
    facts: parsedRows.map((parsedRow) => ({
      ...parsedRow.fact,
      warnings: [
        ...parsedRow.fact.warnings,
        ...(collisionWarningsByRawRowId.get(parsedRow.row.id) ?? [])
      ]
    })),
    warnings: [
      ...parsedRows.flatMap((parsedRow) => parsedRow.parserWarnings),
      ...collisionWarnings.map((warning) => warning.parserWarning)
    ],
    capabilities: [
      {
        source: SOURCE,
        capabilities: PRODUCTION_REVENUE_CAPABILITIES
      }
    ],
    sourceRowsRead: productionRows.length,
    sourceRowsSkipped: rows.length - productionRows.length
  });
}

function parseProductionRevenueRow(row: ArchivedRawSourceRow): ParsedProductionRevenueRow {
  const raw = toRecord(row.raw);
  const sourceRefs = ensureSourceRefs(row);
  const evidence = createParserFactEvidence({
    batchId: row.batchId,
    rawRowIds: [row.id],
    sourceRefs,
    additiveStatus: "not_additive"
  });
  const warningPairs: WarningPair[] = [];

  const rawJobNumber = readString(raw, ["jobNumber", "job number", "jobNo", "job_no", "job"]);
  const jobNumber = nonEmptyString(rawJobNumber);
  const client = nonEmptyString(readString(raw, ["client", "clientName", "client_name"]));
  const projectName = nonEmptyString(
    readString(raw, ["projectName", "project", "project_name", "campaign"])
  );
  const month = nonEmptyString(readString(raw, ["month", "date", "productionMonth"]));
  const amountValue = readNumber(raw, ["amount", "revenue", "productionRevenue", "production_revenue"]);
  const productionStatusInput = readString(raw, ["status", "productionStatus", "production_status"]);
  const productionStatus = normalizeProductionStatus(productionStatusInput);
  const rowOffice = readOffice(raw, ["office", "market", "studio"]);
  const inferredOffice = rowOffice === undefined ? inferOffice(row) : undefined;
  const office = rowOffice ?? inferredOffice ?? "UNKNOWN";

  if (isBlank(productionStatusInput)) {
    warningPairs.push(
      createWarningPair({
        code: "BLANK_STATUS_UNKNOWN",
        message: "Production revenue row has a blank status and was preserved as UNKNOWN.",
        rows: [row],
        office,
        month
      })
    );
  }

  if (jobNumber === undefined) {
    warningPairs.push(
      createWarningPair({
        code: "NO_JOB_NUMBER",
        message: "Production revenue row has no job number and must remain source-attributed.",
        rows: [row],
        office,
        month
      })
    );
  }

  if (isArchivedProject(raw)) {
    warningPairs.push(
      createWarningPair({
        code: "ARCHIVED_PROJECT_REVENUE",
        message: "Archived production revenue remains visible and is not dropped by the parser.",
        rows: [row],
        office,
        month
      })
    );
  }

  if (rowOffice === undefined && inferredOffice !== undefined) {
    warningPairs.push(
      createWarningPair({
        code: "OFFICE_INFERRED",
        message: "Production revenue office was inferred from source identity instead of row data.",
        rows: [row],
        office,
        month
      })
    );
  }

  if (hasUsefulValue(raw.department)) {
    warningPairs.push(
      createWarningPair({
        code: "UNSUPPORTED_DEPARTMENT_ATTRIBUTION",
        message: "Production revenue department attribution is unsupported and was not parsed as a fact field.",
        rows: [row],
        office,
        month,
        severity: "PROCESS_WARN"
      })
    );
  }

  if (hasUsefulValue(raw.role)) {
    warningPairs.push(
      createWarningPair({
        code: "UNSUPPORTED_ROLE_ATTRIBUTION",
        message: "Production revenue role attribution is unsupported and was not parsed as a fact field.",
        rows: [row],
        office,
        month,
        severity: "PROCESS_WARN"
      })
    );
  }

  const fact: ProductionRevenueFact = {
    id: `${SOURCE}:${row.batchId}:${row.id}`,
    source: SOURCE,
    sourceLayer: SOURCE_LAYER,
    rawRowIds: [...evidence.rawRowIds],
    batchId: evidence.batchId,
    ...(jobNumber !== undefined ? { jobNumber } : {}),
    ...(client !== undefined ? { client, sourceClient: client } : {}),
    ...(projectName !== undefined ? { projectName, sourceProjectName: projectName } : {}),
    office,
    ...(month !== undefined ? { month } : {}),
    ...(amountValue !== undefined ? { amount: createMoneyMetric(raw, amountValue) } : {}),
    productionStatus,
    status: productionStatus,
    isAdditive: evidence.isAdditive,
    confidence: "medium",
    warnings: warningPairs.map((warningPair) => warningPair.sourceWarning),
    trace: [...evidence.sourceRefs]
  };

  return {
    row,
    fact,
    parserWarnings: warningPairs.map((warningPair) => warningPair.parserWarning),
    collisionKey: createCollisionKey(fact)
  };
}

function createStatusCollisionWarnings(
  parsedRows: readonly ParsedProductionRevenueRow[]
): readonly WarningPair[] {
  const groups = new Map<string, ParsedProductionRevenueRow[]>();

  for (const parsedRow of parsedRows) {
    if (parsedRow.fact.jobNumber === undefined) {
      continue;
    }

    const existing = groups.get(parsedRow.collisionKey);
    if (existing === undefined) {
      groups.set(parsedRow.collisionKey, [parsedRow]);
      continue;
    }

    existing.push(parsedRow);
  }

  const warnings: WarningPair[] = [];
  for (const group of groups.values()) {
    const statuses = new Set(group.map((parsedRow) => parsedRow.fact.productionStatus));
    if (statuses.size <= 1) {
      continue;
    }

    const first = group[0];
    if (first === undefined) {
      continue;
    }

    warnings.push(
      createWarningPair({
        code: "STATUS_COLLISION",
        message: "Production revenue has multiple statuses for the same job evidence; all rows were preserved.",
        rows: group.map((parsedRow) => parsedRow.row),
        office: first.fact.office ?? "UNKNOWN",
        month: first.fact.month
      })
    );
  }

  return warnings;
}

function groupSourceWarningsByRawRowId(warnings: readonly WarningPair[]): Map<string, SourceWarning[]> {
  const warningsByRawRowId = new Map<string, SourceWarning[]>();

  for (const warning of warnings) {
    for (const rawRowId of warning.parserWarning.rawRowIds) {
      const existing = warningsByRawRowId.get(rawRowId);
      if (existing === undefined) {
        warningsByRawRowId.set(rawRowId, [warning.sourceWarning]);
        continue;
      }

      existing.push(warning.sourceWarning);
    }
  }

  return warningsByRawRowId;
}

function createWarningPair(input: {
  readonly code: string;
  readonly message: string;
  readonly rows: readonly ArchivedRawSourceRow[];
  readonly office: ProductionRevenueOffice;
  readonly month: string | undefined;
  readonly severity?: ParserWarning["severity"];
}): WarningPair {
  const firstRow = input.rows[0];
  if (firstRow === undefined) {
    throw new Error("Production revenue parser warnings require at least one source row.");
  }

  const rawRowIds = input.rows.map((row) => row.id);
  const sourceRefs = input.rows.flatMap((row) => ensureSourceRefs(row));
  const parserWarning = createParserWarning({
    code: input.code,
    message: input.message,
    source: SOURCE,
    sourceLayer: SOURCE_LAYER,
    batchId: firstRow.batchId,
    rawRowIds,
    sourceRefs,
    severity: input.severity ?? "DATA_WARN"
  });

  return {
    parserWarning,
    sourceWarning: {
      id: `${PARSER_NAME}:${input.code}:${rawRowIds.join("+")}`,
      status: parserWarning.severity,
      lifecycleState: "open",
      source: SOURCE,
      sourceLayer: SOURCE_LAYER,
      code: input.code,
      message: input.message,
      scope: {
        office: input.office === "UNKNOWN" ? "ALL" : input.office,
        from: input.month ?? "",
        to: input.month ?? ""
      },
      owner: "Production",
      sourceRefs,
      firstSeenAt: firstRow.observedAt,
      lastSeenAt: firstRow.observedAt
    }
  };
}

function createCollisionKey(fact: ProductionRevenueFact): string {
  return [
    normalizeKeyPart(fact.jobNumber),
    normalizeKeyPart(fact.client),
    normalizeKeyPart(fact.projectName),
    normalizeKeyPart(fact.month),
    fact.amount?.kind === "money" ? String(fact.amount.value.amountGbp) : ""
  ].join("|");
}

function createMoneyMetric(raw: ProductionRevenueRawRecord, amount: number): { kind: "money"; value: MoneyValue } {
  const currencyOriginal = readCurrency(raw);
  const amountGbp = readNumber(raw, ["amountGbp", "amountGBP", "amount_gbp"]) ?? amount;

  return {
    kind: "money",
    value: {
      amountOriginal: amount,
      currencyOriginal,
      amountGbp,
      fxRateToGbp: currencyOriginal === "GBP" ? 1 : 1,
      fxSource: currencyOriginal === "GBP" ? "source_gbp" : "source_row_without_fx_conversion",
      fxCapturedAt: ""
    }
  };
}

function normalizeProductionStatus(value: string | undefined): ProductionRevenueFact["productionStatus"] {
  const normalized = nonEmptyString(value)?.toUpperCase().replace(/\s+/g, "_");
  return normalized ?? "UNKNOWN";
}

function readOffice(raw: ProductionRevenueRawRecord, fieldNames: readonly string[]): ProductionRevenueOffice | undefined {
  const value = nonEmptyString(readString(raw, fieldNames))?.toUpperCase();
  if (value === "LDN" || value === "LONDON") {
    return "LDN";
  }
  if (value === "USA" || value === "US") {
    return "USA";
  }
  if (value === "UCX") {
    return "UCX";
  }
  if (value === "UNKNOWN") {
    return "UNKNOWN";
  }
  return undefined;
}

function inferOffice(row: ArchivedRawSourceRow): ProductionRevenueOffice | undefined {
  const identityText = [
    row.identity.sourceTab,
    row.identity.sourceDocumentId,
    row.identity.sourceObjectId,
    row.identity.stableSourceRowKey,
    readString(toRecord(row.raw), ["jobNumber", "job number", "jobNo", "job_no", "job"])
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ")
    .toUpperCase();

  if (identityText.includes("USA") || identityText.includes("US ")) {
    return "USA";
  }
  if (identityText.includes("UCX")) {
    return "UCX";
  }
  if (identityText.includes("LDN") || identityText.includes("LONDON")) {
    return "LDN";
  }

  return undefined;
}

function isArchivedProject(raw: ProductionRevenueRawRecord): boolean {
  if (raw.archived === true || raw.isArchived === true) {
    return true;
  }

  return [
    readString(raw, ["projectArchiveState"]),
    readString(raw, ["archiveState"]),
    readString(raw, ["projectStatus"])
  ].some((value) => value?.toLowerCase().includes("archived") ?? false);
}

function readCurrency(raw: ProductionRevenueRawRecord): MoneyValue["currencyOriginal"] {
  const currency = nonEmptyString(readString(raw, ["currency", "currencyOriginal"]))?.toUpperCase();
  if (currency === "GBP" || currency === "USD" || currency === "EUR" || currency === "SEK") {
    return currency;
  }
  return "UNKNOWN";
}

function ensureSourceRefs(row: ArchivedRawSourceRow): readonly SourceTraceRef[] {
  if (row.sourceRefs.length > 0) {
    return row.sourceRefs;
  }

  return [
    {
      source: SOURCE,
      sourceLayer: SOURCE_LAYER,
      batchId: row.batchId,
      rawRowId: row.id,
      ...(row.identity.sourceDocumentId !== undefined
        ? { sourceDocumentId: row.identity.sourceDocumentId }
        : {}),
      ...(row.identity.sourceTab !== undefined ? { sourceTab: row.identity.sourceTab } : {}),
      ...(row.identity.sourceRowNumber !== undefined
        ? { sourceRowNumber: row.identity.sourceRowNumber }
        : {}),
      ...(row.identity.sourceObjectId !== undefined
        ? { sourceObjectId: row.identity.sourceObjectId }
        : {})
    }
  ];
}

function readString(raw: ProductionRevenueRawRecord, fieldNames: readonly string[]): string | undefined {
  for (const fieldName of fieldNames) {
    const value = raw[fieldName];
    if (typeof value === "string") {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function readNumber(raw: ProductionRevenueRawRecord, fieldNames: readonly string[]): number | undefined {
  for (const fieldName of fieldNames) {
    const value = raw[fieldName];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function toRecord(raw: SourceArchivePayload): ProductionRevenueRawRecord {
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as ProductionRevenueRawRecord;
  }
  return {};
}

function nonEmptyString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

function hasUsefulValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim() !== "";
  }
  return value !== null && value !== undefined;
}

function normalizeKeyPart(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}
