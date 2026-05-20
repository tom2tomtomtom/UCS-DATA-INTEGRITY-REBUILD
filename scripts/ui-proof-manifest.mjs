#!/usr/bin/env node

import { buildUiProofManifest } from "./lib/ui-proof-manifest.mjs";

const manifest = buildUiProofManifest({
  baseUrl: process.env.UI_PROOF_BASE_URL ?? "http://localhost:3030",
  capturedAt: process.env.UI_PROOF_CAPTURED_AT ?? new Date().toISOString(),
  artifactRoot: process.env.UI_PROOF_ARTIFACT_ROOT ?? "test-results/ui-proof/p8f",
  status: process.env.UI_PROOF_STATUS ?? "ready_for_capture"
});

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
