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
  readonly sourceFactSuffix?: string;
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
    const payload = parsePayload(row) ?? parseLinkedFirstTabHeader(row) ?? parseFeeTrackerProjectIdentity(row);
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
  parsedRows.push(...parseLinkedMainVTabSubtotalRows(feeSheetRows));

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

function parseLinkedFirstTabHeader(row: ArchivedRawSourceRow): FeeSheetArchivedRowPayload | undefined {
  if (!isRecord(row.raw)) {
    return undefined;
  }

  const cells = Array.isArray(row.raw.cells) ? row.raw.cells.map((cell) => String(cell ?? "").trim()) : [];
  const linkedFeeSheet = isRecord(row.raw.linkedFeeSheet) ? row.raw.linkedFeeSheet : undefined;
  const labelIndex = cells.findIndex((cell) => normaliseLabel(cell) === "FLOAT PROJECT ID");
  const feeSheetFloatId = labelIndex >= 0 ? firstNumericId(cells[labelIndex + 1]) : undefined;

  if (!linkedFeeSheet || !feeSheetFloatId) {
    return undefined;
  }

  const jobNumber = asString(linkedFeeSheet.feeTrackerJobNumber);

  if (!jobNumber) {
    return undefined;
  }

  const client = asString(linkedFeeSheet.feeTrackerClient);
  const projectName = asString(linkedFeeSheet.feeTrackerProjectName);
  const office = asOffice(linkedFeeSheet.feeTrackerOffice);

  return {
    rowKind: "project_header",
    jobNumber,
    ...(client ? { client } : {}),
    ...(projectName ? { projectName } : {}),
    ...(office ? { office } : {}),
    feeSheetFloatId
  };
}

function parseFeeTrackerProjectIdentity(row: ArchivedRawSourceRow): FeeSheetSoldRowPayload | undefined {
  if (!isRecord(row.raw) || isRecord(row.raw.linkedFeeSheet)) {
    return undefined;
  }

  const cells = Array.isArray(row.raw.cells) ? row.raw.cells.map((cell) => String(cell ?? "").trim()) : [];
  const client = cells[1];
  const jobNumber = cells[2]?.toUpperCase();
  const projectName = cells[3];
  const office = officeFromFeeTrackerRow(row);

  if (!isFeeTrackerJobNumber(jobNumber)) {
    return undefined;
  }

  return {
    rowKind: "source_summary",
    sourceFactSuffix: "fee-tracker-project",
    jobNumber,
    ...(client ? { client } : {}),
    ...(projectName ? { projectName } : {}),
    ...(office ? { office } : {})
  };
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

  const fact: FeeSheetSoldFact = {
    id: `${FEE_SHEET_SOURCE}:${row.batchId}:${row.id}${payload.sourceFactSuffix ? `:${payload.sourceFactSuffix}` : ""}`,
    source: FEE_SHEET_SOURCE,
    sourceLayer,
    rawRowIds,
    batchId: row.batchId,
    isAdditive: parserEvidence.isAdditive,
    confidence: "high",
    warnings: [],
    trace,
    parserEvidence,
    feeSheetRowKind: payload.rowKind
  };

  if (payload.soldFee !== undefined) {
    fact.amount = {
      kind: "money",
      value: {
        amountOriginal: payload.soldFee,
        currencyOriginal: currency,
        amountGbp: payload.soldFee * fxRateToGbp,
        fxRateToGbp,
        fxSource: "fee_sheet_fixture",
        fxCapturedAt: payload.fxCapturedAt ?? header?.payload.fxCapturedAt ?? DEFAULT_FX_CAPTURED_AT
      }
    };
  }

  if (payload.soldHours !== undefined) {
    fact.hours = {
      kind: "hours",
      value: payload.soldHours,
      unit: "decimal_hours"
    };
  }

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

function parseLinkedMainVTabSubtotalRows(sourceRows: readonly ArchivedRawSourceRow[]): ParsedRow[] {
  const linkedRows = sourceRows.filter(isLinkedFeeSheetCellRow);
  const rowsByDocumentAndTab = new Map<string, ArchivedRawSourceRow[]>();
  const parsedRows: ParsedRow[] = [];

  for (const row of linkedRows) {
    const documentId = row.identity.sourceDocumentId;
    const tab = row.identity.sourceTab;
    if (!documentId || !tab || !/^V\d+/i.test(tab)) {
      continue;
    }

    const key = `${documentId}::${tab}`;
    rowsByDocumentAndTab.set(key, [...(rowsByDocumentAndTab.get(key) ?? []), row]);
  }

  for (const rows of rowsByDocumentAndTab.values()) {
    const sortedRows = [...rows].sort((left, right) => (left.identity.sourceRowNumber ?? 0) - (right.identity.sourceRowNumber ?? 0));
    if (!isMainVTab(sortedRows)) {
      continue;
    }

    const groupRow = cellsForSourceRow(sortedRows, 9);
    const monthRow = cellsForSourceRow(sortedRows, 10);
    const headerRow = cellsForSourceRow(sortedRows, 11);
    if (!groupRow || !monthRow || !headerRow) {
      continue;
    }

    const soldMonthColumns = soldVTabMonthColumns(groupRow, monthRow, headerRow);
    for (const row of sortedRows) {
      const cells = cellsForRow(row);
      const department = departmentFromSubtotalLabel(cells[0]);
      const linkedFeeSheet = linkedFeeSheetMeta(row);
      const jobNumber = asString(linkedFeeSheet?.feeTrackerJobNumber);
      const client = asString(linkedFeeSheet?.feeTrackerClient);
      const projectName = asString(linkedFeeSheet?.feeTrackerProjectName);
      const office = asOffice(linkedFeeSheet?.feeTrackerOffice);

      if (!department || !linkedFeeSheet || !jobNumber) {
        continue;
      }

      for (const monthColumn of soldMonthColumns) {
        const soldFee = numericCell(row, monthColumn.feeColumnIndex);
        const soldHours = numericCell(row, monthColumn.hoursColumnIndex);

        if (soldFee === undefined && soldHours === undefined) {
          continue;
        }

        parsedRows.push({
          row,
          payload: {
            rowKind: "v_tab",
            sourceFactSuffix: `${monthColumn.month}:${department}`,
            jobNumber,
            ...(client ? { client } : {}),
            ...(projectName ? { projectName } : {}),
            ...(office ? { office } : {}),
            month: monthColumn.month,
            department,
            ...(soldFee !== undefined ? { soldFee } : {}),
            ...(soldHours !== undefined ? { soldHours } : {})
          }
        });
      }
    }
  }

  return parsedRows;
}

function isLinkedFeeSheetCellRow(row: ArchivedRawSourceRow): boolean {
  return isRecord(row.raw) && isRecord(row.raw.linkedFeeSheet) && Array.isArray(row.raw.cells);
}

function isMainVTab(rows: readonly ArchivedRawSourceRow[]): boolean {
  const titleRow = cellsForSourceRow(rows, 3)?.join(" ").toUpperCase() ?? "";

  return titleRow.includes("MAIN FEE SHEET") && !titleRow.includes("ASSIGN AS MAIN FEE SHEET");
}

function soldVTabMonthColumns(
  groupRow: readonly string[],
  monthRow: readonly string[],
  headerRow: readonly string[]
): Array<{ month: string; feeColumnIndex: number; hoursColumnIndex: number }> {
  const columns: Array<{ month: string; feeColumnIndex: number; hoursColumnIndex: number }> = [];

  for (let index = 0; index < headerRow.length; index += 1) {
    if (normaliseLabel(groupRow[index] ?? "") !== "SOLD") {
      continue;
    }

    const month = parseFeeSheetMonth(monthRow[index]);
    if (!month) {
      continue;
    }

    const feeColumnIndex = findHeaderColumn(headerRow, index, "FEE P/M");
    const hoursColumnIndex = findHeaderColumn(headerRow, index, "HOURS");
    if (feeColumnIndex === undefined && hoursColumnIndex === undefined) {
      continue;
    }

    columns.push({
      month,
      feeColumnIndex: feeColumnIndex ?? index,
      hoursColumnIndex: hoursColumnIndex ?? index
    });
  }

  return columns;
}

function findHeaderColumn(headerRow: readonly string[], startIndex: number, label: string): number | undefined {
  const wanted = normaliseLabel(label);
  for (let index = startIndex; index < Math.min(headerRow.length, startIndex + 3); index += 1) {
    if (normaliseLabel(headerRow[index] ?? "") === wanted) {
      return index;
    }
  }

  return undefined;
}

function cellsForSourceRow(rows: readonly ArchivedRawSourceRow[], sourceRowNumber: number): readonly string[] | undefined {
  const row = rows.find((candidate) => candidate.identity.sourceRowNumber === sourceRowNumber);
  return row ? cellsForRow(row) : undefined;
}

function cellsForRow(row: ArchivedRawSourceRow): readonly string[] {
  return isRecord(row.raw) && Array.isArray(row.raw.cells)
    ? row.raw.cells.map((cell) => String(cell ?? ""))
    : [];
}

function linkedFeeSheetMeta(row: ArchivedRawSourceRow): Readonly<Record<string, unknown>> | undefined {
  return isRecord(row.raw) && isRecord(row.raw.linkedFeeSheet) ? row.raw.linkedFeeSheet : undefined;
}

function departmentFromSubtotalLabel(value: unknown): string | undefined {
  const text = normaliseLabel(String(value ?? ""));
  if (!text.startsWith("SUB-TOTAL")) {
    return undefined;
  }

  const stripped = text.replace(/^SUB-TOTAL\s+\d+\s+/, "");
  const departments: Record<string, string> = {
    "STRATEGY": "Strategy",
    "AC MGT": "Account Management",
    "CREATIVE": "Creative",
    "DESIGN": "Design",
    "PRODUCTION": "Production",
    "MAKERS": "Makers",
    "PR": "PR",
    "UX": "UX",
    "DATA": "Data",
    "BUSINESS AFFAIRS": "Business Affairs"
  };

  return departments[stripped] ?? titleCase(stripped);
}

function numericCell(row: ArchivedRawSourceRow, zeroBasedColumnIndex: number): number | undefined {
  const raw = isRecord(row.raw) ? row.raw : {};
  const cellData = Array.isArray(raw.cellData) ? raw.cellData.map((cell) => isRecord(cell) ? cell : {}) : [];
  const columnCell = cellData.find((cell) => cell.columnIndex === zeroBasedColumnIndex + 1);
  const value = columnCell?.effectiveValue ?? cellsForRow(row)[zeroBasedColumnIndex];

  return asNumber(value);
}

function parseFeeSheetMonth(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  const match = text.match(/^(?:\d{1,2}[-/ ])?([A-Za-z]{3,})[-/ ](\d{2}|\d{4})$/);
  if (!match) {
    return undefined;
  }

  const monthName = match[1];
  if (!monthName) {
    return undefined;
  }

  const month = monthNumber(monthName);
  if (!month) {
    return undefined;
  }

  const rawYear = match[2] ?? "";
  const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
  if (!Number.isInteger(year)) {
    return undefined;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
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

function officeFromFeeTrackerRow(row: ArchivedRawSourceRow): FeeSheetArchivedRowPayload["office"] | undefined {
  return asOfficeLabel(row.identity.sourceTab) ?? asOfficeLabel(cellsForRow(row)[0]);
}

function asOfficeLabel(value: unknown): FeeSheetArchivedRowPayload["office"] | undefined {
  const label = normaliseLabel(String(value ?? ""));
  if (label === "LDN" || label === "LONDON") return "LDN";
  if (label === "USA" || label === "US" || label === "NEW YORK") return "USA";
  if (label === "UCX") return "UCX";
  return undefined;
}

function isFeeTrackerJobNumber(value: string | undefined): value is string {
  return value !== undefined && /^(UCS|USA|PCS|UCX|UCG)\d{3,}$/i.test(value.trim());
}

function asCurrency(value: unknown): MoneyValue["currencyOriginal"] | undefined {
  if (value === "GBP" || value === "USD" || value === "EUR" || value === "SEK" || value === "UNKNOWN") {
    return value;
  }

  return undefined;
}

function normaliseLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function firstNumericId(value: unknown): string | undefined {
  const match = String(value ?? "").match(/\d{4,}/);

  return match?.[0];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("=") || trimmed.startsWith("#")) {
    return undefined;
  }

  const negative = /^\(.*\)$/.test(trimmed);
  const normalised = trimmed.replace(/[£$€,]/g, "").replace(/[()]/g, "").replace(/%$/, "");
  const parsed = Number(normalised);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return negative ? -parsed : parsed;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function monthNumber(value: string): number | undefined {
  const month = value.slice(0, 3).toLowerCase();
  return {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12
  }[month];
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
