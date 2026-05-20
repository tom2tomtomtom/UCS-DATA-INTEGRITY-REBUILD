import type {
  DashboardScope,
  SoldFact,
  SourceCapability,
  SourceWarning
} from "../canon/types";
import { createCanonQueryResult } from "./index";
import type { CanonQueryResult } from "./types";

export const SOLD_SOURCE_CAPABILITIES = [
  { key: "project", status: "supported" },
  { key: "month", status: "supported" },
  { key: "office", status: "supported", reason: "Row-level office is used where present." },
  { key: "client", status: "supported" },
  { key: "department", status: "supported" },
  { key: "role", status: "partial", reason: "Role support depends on fee sheet row attribution." },
  { key: "person", status: "unsupported", reason: "Fee sheet rows do not identify people." }
] as const satisfies readonly SourceCapability[];

export type SelectSoldFactsInput = {
  readonly scope: DashboardScope;
  readonly facts: readonly SoldFact[];
  readonly capabilities?: readonly SourceCapability[];
  readonly warnings?: readonly SourceWarning[];
};

export function selectSoldFacts(input: SelectSoldFactsInput): CanonQueryResult<SoldFact> {
  const queryInput = {
    source: "fee_sheet" as const,
    scope: input.scope,
    facts: input.facts,
    capabilities: input.capabilities ?? SOLD_SOURCE_CAPABILITIES
  };

  if (input.warnings === undefined) {
    return createCanonQueryResult(queryInput);
  }

  return createCanonQueryResult({
    ...queryInput,
    warnings: input.warnings
  });
}
