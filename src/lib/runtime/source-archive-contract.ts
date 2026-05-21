import { buildSourceFactSetFromParserResults } from "../canon-queries/source-fact-set";
import type { DashboardDisplayContract, DashboardScope, SourceFactSet } from "../index";
import { buildDashboardDisplayContract } from "../index";
import { parseArchivedFeeSheetRows } from "../parsers/fee-sheet";
import { parseArchivedFloatRows } from "../parsers/float";
import { parsePipelineRows } from "../parsers/pipeline";
import { parseProductionRevenueRows } from "../parsers/production-revenue";
import type { ArchivedRawSourceRow, SourceArchiveRecord } from "../source-archive/types";

export type SourceArchiveContractInput = {
  readonly rows: readonly SourceArchiveRecord[];
  readonly scope: DashboardScope;
  readonly generatedAt: string;
};

export function buildSourceFactSetFromArchiveRows(
  rows: readonly SourceArchiveRecord[],
  generatedAt: string
): SourceFactSet {
  const rawRows = rows.filter((row): row is ArchivedRawSourceRow => row.kind === "raw_source_row");
  const rawRowsBySource = {
    feeSheet: rawRows.filter((row) => row.source === "fee_sheet"),
    productionRevenue: rawRows.filter((row) => row.source === "production_revenue"),
    float: rawRows.filter((row) => row.source === "float")
  };
  const pipelineRows = rows.filter((row) => row.source === "pipeline");

  return buildSourceFactSetFromParserResults(
    [
      parseArchivedFeeSheetRows(rawRowsBySource.feeSheet),
      parsePipelineRows(pipelineRows),
      parseProductionRevenueRows(rawRowsBySource.productionRevenue),
      parseArchivedFloatRows(rawRowsBySource.float)
    ],
    { warningObservedAt: generatedAt }
  );
}

export function buildDashboardContractFromArchiveRows(
  input: SourceArchiveContractInput
): DashboardDisplayContract {
  return buildDashboardDisplayContract({
    ...buildSourceFactSetFromArchiveRows(input.rows, input.generatedAt),
    scope: input.scope,
    generatedAt: input.generatedAt
  });
}
