import { validateEvidenceClaims, type ClaimGuardResult } from "./claim-guard";
import type { EvidencePack } from "./types";

export type EvidenceReport = {
  readonly text: string;
  readonly guard: ClaimGuardResult;
};

export function generateEvidenceReport(pack: EvidencePack): EvidenceReport {
  const lines = [
    `Playbook: ${pack.playbook}`,
    `Confidence: ${pack.confidence}`,
    `Sources checked: ${pack.sourceLayers.length === 0 ? "none" : pack.sourceLayers.join(", ")}`
  ];

  if (pack.facts.length > 0) {
    lines.push(`Evidence facts: ${pack.facts.map((fact) => `${fact.label} from ${fact.sourceLayer}`).join("; ")}`);
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
  }

  const text = lines.join("\n");

  return {
    text,
    guard: validateEvidenceClaims(pack, text)
  };
}
