import type { ProductionRevenueFact } from "../canon/types";
import { createCanonQueryResult } from "./index";
import type { CanonQueryInput, CanonQueryResult } from "./types";

export type SelectProductionRevenueFactsInput = Omit<CanonQueryInput<ProductionRevenueFact>, "source">;

export function selectProductionRevenueFacts(
  input: SelectProductionRevenueFactsInput
): CanonQueryResult<ProductionRevenueFact> {
  return createCanonQueryResult({
    ...input,
    source: "production_revenue"
  });
}
