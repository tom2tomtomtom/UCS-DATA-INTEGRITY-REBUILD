import { validateEvidenceClaims, type ClaimGuardResult } from "./claim-guard";
import type { EvidencePack } from "./types";
import type { MetricValue } from "../index";

export type EvidenceReport = {
  readonly text: string;
  readonly guard: ClaimGuardResult;
};

const chatCanDo = [
  "explain the current EvidencePack",
  "list sources checked",
  "show warnings and unresolved checks",
  "suggest the next Codex investigation task"
] as const;

const chatCannotDo = [
  "sync source systems",
  "archive projects",
  "deploy",
  "mutate source data",
  "write code",
  "inspect live browser or repo state beyond read-only tools"
] as const;

export function generateEvidenceReport(pack: EvidencePack): EvidenceReport {
  const lines = [
    `Playbook: ${pack.playbook}`,
    `Confidence: ${pack.confidence}`,
    `Sources checked: ${pack.sourceLayers.length === 0 ? "none" : pack.sourceLayers.join(", ")}`
  ];

  if (pack.facts.length > 0) {
    lines.push(`Evidence facts: ${pack.facts.map(formatFact).join("; ")}`);
  }

  if (pack.checks.length > 0) {
    lines.push(`Checks: ${pack.checks.map((check) => `${check.status} ${check.label}`).join("; ")}`);
  }

  if (pack.unsupported.length > 0) {
    lines.push(`Unsupported: ${pack.unsupported.map((unsupported) => unsupported.metric).join(", ")}`);
  }

  if (pack.warnings.length > 0) {
    lines.push(`Warnings: ${pack.warnings.join(" | ")}`);
  }

  if (pack.unresolved.length > 0) {
    lines.push(
      `Unresolved: ${pack.unresolved
        .map((unresolved) => `${unresolved.code} (${unresolved.reason})`)
        .join(" | ")}`
    );
  }

  if (pack.needsCodex.needed) {
    lines.push(`Needs Codex: ${pack.needsCodex.reason}`);
    lines.push(`Chat can do: ${chatCanDo.join("; ")}`);
    lines.push(`Chat cannot do: ${chatCannotDo.join("; ")}`);
  }

  const text = lines.join("\n");

  return {
    text,
    guard: validateEvidenceClaims(pack, text)
  };
}

function formatFact(fact: EvidencePack["facts"][number]): string {
  const value = fact.value === undefined ? "" : ` = ${formatMetricValue(fact.value)}`;

  return `${fact.label}${value} from ${fact.sourceLayer}`;
}

function formatMetricValue(value: MetricValue): string {
  if (value.kind === "hours") return `${value.value} ${value.unit}`;
  if (value.kind === "count") return `${value.value}`;
  if (value.kind === "money") return `${value.value.amountGbp} GBP`;

  return `${value.displayLabel} ${value.metric}`;
}
