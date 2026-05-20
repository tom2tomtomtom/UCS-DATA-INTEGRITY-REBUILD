import type { EvidencePack } from "./types";

export type BlockedClaim = {
  readonly code: string;
  readonly message: string;
};

export type ClaimGuardResult = {
  readonly status: "pass" | "blocked";
  readonly blockedClaims: readonly BlockedClaim[];
};

export function validateEvidenceClaims(pack: EvidencePack, draft: string): ClaimGuardResult {
  const normalised = draft.toLowerCase();
  const blockedClaims: BlockedClaim[] = [];

  if (normalised.includes("zero") && normalised.includes("hours") && hasNonzeroHoursEvidence(pack)) {
    blockedClaims.push({
      code: "zero_hours_when_source_or_contract_nonzero",
      message: "The draft claims zero hours, but the evidence pack contains nonzero hour evidence."
    });
  }

  if (
    matchesAny(normalised, ["dashboard bug", "dashboard error"]) &&
    !pack.checks.some((check) => check.status === "fail")
  ) {
    blockedClaims.push({
      code: "dashboard_bug_without_failed_check",
      message: "The draft claims a dashboard bug without a failed evidence check."
    });
  }

  if (
    matchesAny(normalised, ["confirmed float mismatch", "float mismatch is confirmed"]) &&
    (pack.unresolved.length > 0 || !hasAllFloatMismatchLayers(pack))
  ) {
    blockedClaims.push({
      code: "float_mismatch_without_all_layers",
      message: "The draft confirms a Float mismatch before all required Float evidence layers are present."
    });
  }

  if (matchesAny(normalised, ["raw parser total", "summed raw parser rows"])) {
    blockedClaims.push({
      code: "raw_parser_total_without_additive_proof",
      message: "Raw parser rows cannot be treated as final totals without additive proof."
    });
  }

  return {
    status: blockedClaims.length > 0 ? "blocked" : "pass",
    blockedClaims
  };
}

function hasNonzeroHoursEvidence(pack: EvidencePack): boolean {
  if (
    pack.facts.some((fact) => fact.value?.kind === "hours" && fact.value.value > 0) ||
    pack.contractRows.some((row) =>
      [row.totals.soldHours, row.totals.floatHours].some((metric) => metric.kind === "hours" && metric.value > 0)
    )
  ) {
    return true;
  }

  return pack.checks.some((check) =>
    [check.expected, check.actual].some((metric) => metric?.kind === "hours" && metric.value > 0)
  );
}

function hasAllFloatMismatchLayers(pack: EvidencePack): boolean {
  return ["float_raw", "float_cache", "float_visible", "float_export"].every((sourceLayer) =>
    pack.sourceLayers.includes(sourceLayer as (typeof pack.sourceLayers)[number])
  );
}

function matchesAny(value: string, needles: readonly string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}
