import type { SourceTraceRef } from "../canon/types";
import type { ArchivedRawSourceRow, SourceArchiveRecord, SourceArchivePayload } from "../source-archive/types";

type SheetCellRawRecord = Readonly<Record<string, unknown>> & {
  readonly cells?: readonly unknown[];
};

type PipelineSheetHeader = {
  readonly headerByIndex: ReadonlyMap<number, string>;
  readonly statusIndex: number;
  readonly clientIndex: number | undefined;
  readonly jobNumberIndex: number | undefined;
  readonly projectNameIndex: number | undefined;
  readonly officeIndex: number | undefined;
  readonly monthIndexes: readonly {
    readonly index: number;
    readonly label: string;
    readonly monthNumber: number;
  }[];
};

export type PipelineSheetCellShapingResult = {
  readonly records: readonly SourceArchiveRecord[];
  readonly sheetRowsSkipped: number;
};

const MONTHS: ReadonlyMap<string, number> = new Map([
  ["JAN", 1],
  ["JANUARY", 1],
  ["FEB", 2],
  ["FEBRUARY", 2],
  ["MAR", 3],
  ["MARCH", 3],
  ["APR", 4],
  ["APRIL", 4],
  ["MAY", 5],
  ["JUN", 6],
  ["JUNE", 6],
  ["JUL", 7],
  ["JULY", 7],
  ["AUG", 8],
  ["AUGUST", 8],
  ["SEP", 9],
  ["SEPT", 9],
  ["SEPTEMBER", 9],
  ["OCT", 10],
  ["OCTOBER", 10],
  ["NOV", 11],
  ["NOVEMBER", 11],
  ["DEC", 12],
  ["DECEMBER", 12]
] as const);

export function shapePipelineSheetCellRows(records: readonly SourceArchiveRecord[]): PipelineSheetCellShapingResult {
  const shapedRecords: SourceArchiveRecord[] = [];
  let latestHeader: PipelineSheetHeader | undefined;
  let sheetRowsSkipped = 0;

  for (const record of records) {
    if (record.kind !== "raw_source_row" || record.source !== "pipeline" || !isSheetCellRawRecord(record.raw)) {
      shapedRecords.push(record);
      continue;
    }

    const candidateHeader = parsePipelineSheetHeader(record.raw.cells);
    if (candidateHeader !== undefined) {
      latestHeader = candidateHeader;
      sheetRowsSkipped += 1;
      continue;
    }

    if (latestHeader === undefined) {
      shapedRecords.push(record);
      continue;
    }

    const shapedMonthRows = shapePipelineDataRow(record, latestHeader);
    if (shapedMonthRows.length === 0) {
      sheetRowsSkipped += 1;
      continue;
    }

    shapedRecords.push(...shapedMonthRows);
  }

  return {
    records: shapedRecords,
    sheetRowsSkipped
  };
}

function parsePipelineSheetHeader(cells: readonly unknown[]): PipelineSheetHeader | undefined {
  const headerByIndex = new Map<number, string>();
  const monthIndexes: {
    readonly index: number;
    readonly label: string;
    readonly monthNumber: number;
  }[] = [];

  cells.forEach((cell, index) => {
    const header = normalizeHeader(cell);
    if (header === undefined) {
      return;
    }

    headerByIndex.set(index, header);
    const monthNumber = MONTHS.get(header);
    if (monthNumber !== undefined) {
      monthIndexes.push({ index, label: header, monthNumber });
    }
  });

  const statusIndex = findIndex(headerByIndex, ["STATUS"]);
  if (monthIndexes.length === 0 || statusIndex === undefined) {
    return undefined;
  }

  return {
    headerByIndex,
    statusIndex,
    clientIndex: findIndex(headerByIndex, ["CLIENT", "CLIENT NAME"]),
    jobNumberIndex: findIndex(headerByIndex, ["JOB NO", "JOB NUMBER", "JOB #", "JOB"]),
    projectNameIndex: findIndex(headerByIndex, ["PROJECT", "PROJECT NAME", "PROJECT TITLE", "CAMPAIGN"]),
    officeIndex: findIndex(headerByIndex, ["OFFICE", "MARKET", "STUDIO"]),
    monthIndexes
  };
}

function shapePipelineDataRow(record: ArchivedRawSourceRow, header: PipelineSheetHeader): ArchivedRawSourceRow[] {
  const raw = record.raw as SheetCellRawRecord;
  const year = sheetRowYear(record, raw);
  const sourceLabel = readString(raw.sourceLabel) ?? readString(raw.source);
  const shapedRows: ArchivedRawSourceRow[] = [];

  for (const monthHeader of header.monthIndexes) {
    const amountGbp = parseMoneyCell(raw.cells?.[monthHeader.index]);
    if (amountGbp === undefined) {
      continue;
    }

    const month = `${year}-${String(monthHeader.monthNumber).padStart(2, "0")}`;
    shapedRows.push({
      ...record,
      raw: {
        jobNumber: cellString(raw.cells?.[header.jobNumberIndex ?? -1]),
        client: cellString(raw.cells?.[header.clientIndex ?? -1]),
        projectName: cellString(raw.cells?.[header.projectNameIndex ?? -1]),
        month,
        amountGbp,
        status: cellString(raw.cells?.[header.statusIndex ?? -1]),
        office: cellString(raw.cells?.[header.officeIndex ?? -1]),
        sourceLabel,
        factIdSuffix: month
      },
      sourceRefs: sourceRefsForSheetCell(record, monthHeader.label)
    });
  }

  return shapedRows;
}

function isSheetCellRawRecord(raw: SourceArchivePayload): raw is SheetCellRawRecord & { readonly cells: readonly unknown[] } {
  return raw !== null && typeof raw === "object" && !Array.isArray(raw) && "cells" in raw && Array.isArray(raw.cells);
}

function normalizeHeader(value: unknown): string | undefined {
  const text = cellString(value)?.toUpperCase().replace(/\s+/g, " ");
  return text === "" ? undefined : text;
}

function findIndex(headers: ReadonlyMap<number, string>, names: readonly string[]): number | undefined {
  const accepted = new Set(names);
  for (const [index, header] of headers) {
    if (accepted.has(header)) {
      return index;
    }
  }
  return undefined;
}

function cellString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function readString(value: unknown): string | undefined {
  return cellString(value);
}

function parseMoneyCell(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  const isParenthesesNegative = /^\(.*\)$/.test(trimmed);
  const normalized = trimmed.replace(/,/g, "").replace(/[^0-9.-]/g, "");
  if (normalized === "" || normalized === "-" || normalized === ".") {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return isParenthesesNegative ? -Math.abs(parsed) : parsed;
}

function sheetRowYear(record: ArchivedRawSourceRow, raw: SheetCellRawRecord): number {
  const explicitYear = typeof raw.year === "number" && Number.isInteger(raw.year) ? raw.year : undefined;
  if (explicitYear !== undefined) {
    return explicitYear;
  }

  const observedYear = Number(record.observedAt.slice(0, 4));
  return Number.isInteger(observedYear) ? observedYear : new Date().getUTCFullYear();
}

function sourceRefsForSheetCell(record: ArchivedRawSourceRow, field: string): SourceTraceRef[] {
  const refs =
    record.sourceRefs.length > 0
      ? record.sourceRefs
      : [
          {
            source: "pipeline" as const,
            sourceLayer: "pipeline" as const,
            batchId: record.batchId,
            rawRowId: record.id,
            ...(record.identity.sourceDocumentId !== undefined
              ? { sourceDocumentId: record.identity.sourceDocumentId }
              : {}),
            ...(record.identity.sourceTab !== undefined ? { sourceTab: record.identity.sourceTab } : {}),
            ...(record.identity.sourceRowNumber !== undefined
              ? { sourceRowNumber: record.identity.sourceRowNumber }
              : {}),
            ...(record.identity.sourceObjectId !== undefined ? { sourceObjectId: record.identity.sourceObjectId } : {})
          }
        ];

  return refs.map((sourceRef) => ({ ...sourceRef, field }));
}
