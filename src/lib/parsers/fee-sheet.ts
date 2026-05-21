import type {
  MoneyValue,
  SoldFact,
  SourceLayer,
  SourceName,
  SourceTraceRef
} from "../canon/types";
import type { ArchivedRawSourceRow } from "../source-archive/types";
import { createParserFactEvidence, createParserResult, createParserWarning } from "./shared";
import type { ParserFactEvidence, ParserResult, ParserWarning } from "./types";

const FEE_SHEET_SOURCE = "fee_sheet" satisfies SourceName;
const PARSER_NAME = "fee-sheet";
const DEFAULT_FX_CAPTURED_AT = "2026-05-20T00:00:00.000Z";

export type FeeSheetRowKind = "project_header" | "client_summary" | "v_tab" | "source_summary";

export type FeeSheetArchivedRowPayload = {
  readonly rowKind: FeeSheetRowKind;
  readonly jobNumber?: string;
  readonly client?: string;
  readonly projectName?: string;
  readonly office?: "LDN" | "USA" | "UCX" | "UNKNOWN";
  readonly feeSheetFloatId?: string;
  readonly month?: string;
  readonly department?: string;
  readonly role?: string;
  readonly soldFee?: number;
  readonly soldHours?: number;
  readonly currency?: MoneyValue["currencyOriginal"];
  readonly fxRateToGbp?: number;
  readonly fxCapturedAt?: string;
};

type FeeSheetSoldRowKind = Exclude<FeeSheetRowKind, "project_header">;
type FeeSheetSoldRowPayload = FeeSheetArchivedRowPayload & {
  readonly rowKind: FeeSheetSoldRowKind;
};

export type FeeSheetSoldFact = SoldFact & {
  readonly parserEvidence: ParserFactEvidence;
  readonly feeSheetRowKind: FeeSheetSoldRowKind;
};

type ProjectHeader = {
  readonly row: ArchivedRawSourceRow;
  readonly payload: FeeSheetArchivedRowPayload;
};

type ParsedRow = {
  readonly row: ArchivedRawSourceRow;
  readonly payload: FeeSheetSoldRowPayload;
};

export function parseArchivedFeeSheetRows(
  sourceRows: readonly ArchivedRawSourceRow[]
): ParserResult<FeeSheetSoldFact> {
  const feeSheetRows = sourceRows.filter((row) => row.source === FEE_SHEET_SOURCE);
  const headersByJob = new Map<string, ProjectHeader>();
  const parsedRows: ParsedRow[] = [];
  const warnings: ParserWarning[] = [];

  for (const row of feeSheetRows) {
    const payload = parsePayload(row);
    if (!payload) {
      warnings.push(
        createParserWarning({
          code: "UNSUPPORTED_FEE_SHEET_ROW_SHAPE",
          message: "Fee sheet raw row did not match the explicit archived fixture shape.",
          source: FEE_SHEET_SOURCE,
          sourceLayer: "fee_sheet_parser_summary",
          batchId: row.batchId,
          rawRowIds: [row.id],
          sourceRefs: sourceRefsFor(row, "fee_sheet_parser_summary"),
          severity: "PROCESS_WARN"
        })
      );
      continue;
    }

    if (payload.rowKind === "project_header" && payload.jobNumber) {
      headersByJob.set(payload.jobNumber, { row, payload });
      continue;
    }

    if (isSoldRowPayload(payload)) {
      parsedRows.push({ row, payload });
    }
  }

  const facts = parsedRows.map(({ row, payload }) => {
    const header = payload.jobNumber ? headersByJob.get(payload.jobNumber) : undefined;
    const fact = createSoldFact(row, payload, header);

    if (payload.soldFee === 0 && (payload.soldHours ?? 0) > 0) {
      warnings.push(
        createParserWarning({
          code: "ZERO_FEE_WITH_HOURS",
          message: "Fee sheet row has zero sold fee with nonzero sold hours.",
          source: FEE_SHEET_SOURCE,
          sourceLayer: "sold",
          batchId: row.batchId,
          rawRowIds: [row.id],
          sourceRefs: sourceRefsFor(row, "sold"),
          severity: "DATA_WARN"
        })
      );
    }

    return fact;
  });

  warnings.push(...clientSummaryVTabWarnings(parsedRows));
  warnings.push(...duplicateFeeTrackerJobWarnings(parsedRows));
  warnings.push(...crossOfficeDuplicateJobWarnings(parsedRows));

  return createParserResult({
    parserName: PARSER_NAME,
    source: FEE_SHEET_SOURCE,
    facts,
    warnings,
    capabilities: [
      {
        source: FEE_SHEET_SOURCE,
        capabilities: [
          { key: "project", status: "supported" },
          { key: "month", status: "supported" },
          { key: "office", status: "supported", reason: "Row-level office is used where present." },
          { key: "client", status: "supported" },
          { key: "department", status: "supported" },
          { key: "role", status: "partial", reason: "Role support depends on fee sheet row attribution." },
          { key: "person", status: "unsupported", reason: "Fee sheet rows do not identify people." }
        ]
      }
    ],
    sourceRowsRead: feeSheetRows.length,
    sourceRowsSkipped: 0
  });
}

function createSoldFact(
  row: ArchivedRawSourceRow,
  payload: FeeSheetSoldRowPayload,
  header: ProjectHeader | undefined
): FeeSheetSoldFact {
  const sourceLayer = sourceLayerFor(payload.rowKind);
  const headerRefs = header ? sourceRefsFor(header.row, "fee_sheet_parser_summary") : [];
  const rowRefs = metricSourceRefsFor(row, sourceLayer, [
    ...(payload.soldFee !== undefined ? ["soldFee" as const] : []),
    ...(payload.soldHours !== undefined ? ["soldHours" as const] : [])
  ]);
  const rawRowIds = header ? [header.row.id, row.id] : [row.id];
  const trace = [...headerRefs, ...rowRefs];
  const parserEvidence = createParserFactEvidence({
    batchId: row.batchId,
    rawRowIds,
    sourceRefs: trace,
    additiveStatus: additiveStatusFor(payload.rowKind)
  });
  const currency = payload.currency ?? header?.payload.currency ?? "UNKNOWN";
  const fxRateToGbp = payload.fxRateToGbp ?? header?.payload.fxRateToGbp ?? 1;
  const fee = payload.soldFee ?? 0;

  const fact: FeeSheetSoldFact = {
    id: `${FEE_SHEET_SOURCE}:${row.batchId}:${row.id}`,
    source: FEE_SHEET_SOURCE,
    sourceLayer,
    rawRowIds,
    batchId: row.batchId,
    amount: {
      kind: "money",
      value: {
        amountOriginal: fee,
        currencyOriginal: currency,
        amountGbp: fee * fxRateToGbp,
        fxRateToGbp,
        fxSource: "fee_sheet_fixture",
        fxCapturedAt: payload.fxCapturedAt ?? header?.payload.fxCapturedAt ?? DEFAULT_FX_CAPTURED_AT
      }
    },
    hours: {
      kind: "hours",
      value: payload.soldHours ?? 0,
      unit: "decimal_hours"
    },
    isAdditive: parserEvidence.isAdditive,
    confidence: "high",
    warnings: [],
    trace,
    parserEvidence,
    feeSheetRowKind: payload.rowKind
  };

  const jobNumber = payload.jobNumber ?? header?.payload.jobNumber;
  const feeSheetFloatId = header?.payload.feeSheetFloatId;
  const client = payload.client ?? header?.payload.client;
  const projectName = payload.projectName ?? header?.payload.projectName;
  const office = payload.office ?? header?.payload.office;

  if (jobNumber) {
    fact.jobNumber = jobNumber;
  }
  if (feeSheetFloatId) {
    fact.floatProjectId = feeSheetFloatId;
    fact.feeSheetFloatId = feeSheetFloatId;
  }
  if (client) {
    fact.client = client;
    fact.sourceClient = client;
  }
  if (projectName) {
    fact.projectName = projectName;
    fact.sourceProjectName = projectName;
  }
  if (office) {
    fact.office = office;
  }
  if (payload.month) {
    fact.month = payload.month;
  }
  if (payload.department) {
    fact.department = payload.department;
  }
  if (payload.role) {
    fact.role = payload.role;
  }

  return fact;
}

function duplicateFeeTrackerJobWarnings(parsedRows: readonly ParsedRow[]): ParserWarning[] {
  const groups = new Map<string, ParsedRow[]>();

  for (const parsedRow of parsedRows.filter(({ payload }) => payload.rowKind === "v_tab")) {
    const key = [
      parsedRow.payload.jobNumber,
      parsedRow.payload.month,
      parsedRow.payload.department,
      parsedRow.payload.role
    ].join("|");

    if (!parsedRow.payload.jobNumber || !parsedRow.payload.month) {
      continue;
    }

    groups.set(key, [...(groups.get(key) ?? []), parsedRow]);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) =>
      createParserWarning({
        code: "DUPLICATE_FEE_TRACKER_JOB",
        message: "Fee tracker has duplicate rows for the same job evidence; all rows are preserved.",
        source: FEE_SHEET_SOURCE,
        sourceLayer: "sold",
        batchId: group[0]?.row.batchId ?? "",
        rawRowIds: group.map(({ row }) => row.id),
        sourceRefs: group.flatMap(({ row }) => sourceRefsFor(row, "sold")),
        severity: "DATA_WARN"
      })
    );
}

function crossOfficeDuplicateJobWarnings(parsedRows: readonly ParsedRow[]): ParserWarning[] {
  const groups = new Map<string, ParsedRow[]>();

  for (const parsedRow of parsedRows.filter(({ payload }) => payload.rowKind === "v_tab")) {
    if (!parsedRow.payload.jobNumber || !parsedRow.payload.month) {
      continue;
    }

    const key = [
      parsedRow.payload.jobNumber,
      parsedRow.payload.month,
      parsedRow.payload.department ?? "",
      parsedRow.payload.role ?? ""
    ].join("|");
    groups.set(key, [...(groups.get(key) ?? []), parsedRow]);
  }

  return [...groups.values()]
    .filter((group) => new Set(group.map(({ payload }) => payload.office ?? "UNKNOWN")).size > 1)
    .map((group) =>
      createParserWarning({
        code: "CROSS_OFFICE_DUPLICATE_JOB",
        message: "Fee tracker has the same job number in multiple offices; scopes stay separate until source evidence resolves it.",
        source: FEE_SHEET_SOURCE,
        sourceLayer: "sold",
        batchId: group[0]?.row.batchId ?? "",
        rawRowIds: group.map(({ row }) => row.id),
        sourceRefs: group.flatMap(({ row }) => sourceRefsFor(row, "sold")),
        severity: "DATA_WARN"
      })
    );
}

function clientSummaryVTabWarnings(parsedRows: readonly ParsedRow[]): ParserWarning[] {
  const clientSummaries = parsedRows.filter(({ payload }) => payload.rowKind === "client_summary");
  const sourceSummaries = parsedRows.filter(({ payload }) => payload.rowKind === "source_summary");
  const warnings: ParserWarning[] = [];

  for (const clientSummary of clientSummaries) {
    const match = sourceSummaries.find(
      ({ payload }) =>
        payload.jobNumber === clientSummary.payload.jobNumber &&
        payload.month === clientSummary.payload.month
    );

    if (!match) {
      continue;
    }

    const feeDisagrees = match.payload.soldFee !== clientSummary.payload.soldFee;
    const hoursDisagrees = match.payload.soldHours !== clientSummary.payload.soldHours;

    if (feeDisagrees || hoursDisagrees) {
      warnings.push(
        createParserWarning({
          code: "CLIENT_SUMMARY_VTAB_DISAGREE",
          message: "CLIENT SUMMARY and V-tab source summary values differ; both rows are preserved.",
          source: FEE_SHEET_SOURCE,
          sourceLayer: "sold",
          batchId: clientSummary.row.batchId,
          rawRowIds: [clientSummary.row.id, match.row.id],
          sourceRefs: [
            ...sourceRefsFor(clientSummary.row, "fee_sheet_parser_summary"),
            ...sourceRefsFor(match.row, "fee_sheet_parser_summary")
          ],
          severity: "DATA_WARN"
        })
      );
    }
  }

  return warnings;
}

function parsePayload(row: ArchivedRawSourceRow): FeeSheetArchivedRowPayload | undefined {
  if (!isRecord(row.raw)) {
    return undefined;
  }

  const rowKind = asRowKind(row.raw.rowKind);
  if (!rowKind) {
    return undefined;
  }

  const jobNumber = asString(row.raw.jobNumber);
  const client = asString(row.raw.client);
  const projectName = asString(row.raw.projectName);
  const office = asOffice(row.raw.office);
  const feeSheetFloatId = asString(row.raw.feeSheetFloatId);
  const month = asString(row.raw.month);
  const department = asString(row.raw.department);
  const role = asString(row.raw.role);
  const soldFee = asNumber(row.raw.soldFee);
  const soldHours = asNumber(row.raw.soldHours);
  const currency = asCurrency(row.raw.currency);
  const fxRateToGbp = asNumber(row.raw.fxRateToGbp);
  const fxCapturedAt = asString(row.raw.fxCapturedAt);

  return {
    rowKind,
    ...(jobNumber ? { jobNumber } : {}),
    ...(client ? { client } : {}),
    ...(projectName ? { projectName } : {}),
    ...(office ? { office } : {}),
    ...(feeSheetFloatId ? { feeSheetFloatId } : {}),
    ...(month ? { month } : {}),
    ...(department ? { department } : {}),
    ...(role ? { role } : {}),
    ...(soldFee !== undefined ? { soldFee } : {}),
    ...(soldHours !== undefined ? { soldHours } : {}),
    ...(currency ? { currency } : {}),
    ...(fxRateToGbp !== undefined ? { fxRateToGbp } : {}),
    ...(fxCapturedAt ? { fxCapturedAt } : {})
  };
}

function sourceLayerFor(rowKind: FeeSheetSoldRowKind): SoldFact["sourceLayer"] {
  return rowKind === "v_tab" ? "sold" : "fee_sheet_parser_summary";
}

function additiveStatusFor(rowKind: FeeSheetSoldRowKind): ParserFactEvidence["additiveStatus"] {
  return rowKind === "v_tab" ? "additive" : "source_summary";
}

function sourceRefsFor(row: ArchivedRawSourceRow, sourceLayer: SourceLayer): SourceTraceRef[] {
  if (row.sourceRefs.length > 0) {
    return row.sourceRefs.map((sourceRef) => ({
      ...sourceRef,
      batchId: sourceRef.batchId ?? row.batchId,
      rawRowId: sourceRef.rawRowId ?? row.id
    }));
  }

  const sourceRef: SourceTraceRef = {
    source: FEE_SHEET_SOURCE,
    sourceLayer,
    batchId: row.batchId,
    rawRowId: row.id
  };

  if (row.identity.sourceDocumentId) {
    sourceRef.sourceDocumentId = row.identity.sourceDocumentId;
  }
  if (row.identity.sourceTab) {
    sourceRef.sourceTab = row.identity.sourceTab;
  }
  if (row.identity.sourceRowNumber !== undefined) {
    sourceRef.sourceRowNumber = row.identity.sourceRowNumber;
  }
  if (row.identity.sourceObjectId) {
    sourceRef.sourceObjectId = row.identity.sourceObjectId;
  }

  return [sourceRef];
}

function metricSourceRefsFor(
  row: ArchivedRawSourceRow,
  sourceLayer: SourceLayer,
  fields: readonly ("soldFee" | "soldHours")[]
): SourceTraceRef[] {
  const refs = sourceRefsFor(row, sourceLayer);
  if (fields.length === 0) return refs;

  return fields.flatMap((field) => refs.map((ref) => ({ ...ref, field })));
}

function isSoldRowPayload(payload: FeeSheetArchivedRowPayload): payload is FeeSheetSoldRowPayload {
  return payload.rowKind !== "project_header";
}

function asRowKind(value: unknown): FeeSheetRowKind | undefined {
  if (
    value === "project_header" ||
    value === "client_summary" ||
    value === "v_tab" ||
    value === "source_summary"
  ) {
    return value;
  }

  return undefined;
}

function asOffice(value: unknown): FeeSheetArchivedRowPayload["office"] | undefined {
  if (value === "LDN" || value === "USA" || value === "UCX" || value === "UNKNOWN") {
    return value;
  }

  return undefined;
}

function asCurrency(value: unknown): MoneyValue["currencyOriginal"] | undefined {
  if (value === "GBP" || value === "USD" || value === "EUR" || value === "SEK" || value === "UNKNOWN") {
    return value;
  }

  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
