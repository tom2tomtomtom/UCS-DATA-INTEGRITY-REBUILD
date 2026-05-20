#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";

import { buildRailwayTargetReport } from "./lib/railway-readiness-report.mjs";

const expected = {
  projectName: "UCS Data Integrity Rebuild",
  serviceName: "ucs-data-integrity-rebuild",
  rebuildSupabaseRef: "nxrzhwqsswhjgeouxsyr",
  forbiddenTargetNeedles: ["ucs-commercial-dashboard", "old ucs dashboard"]
};

const env = {
  ...readEnvFile(".env.local"),
  ...process.env
};

const report = buildRailwayTargetReport({
  expected,
  railway: inspectRailwayStatus(),
  envPlan: {
    databaseUrl: env.DATABASE_URL,
    legacyDatabaseUrl: env.LEGACY_DATABASE_URL,
    nextPublicSupabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    intendedDomainAction: "railway_generated",
    productionDomainCutoverApproved: false
  },
  railwayMutatingCommandsRun: []
});

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

function inspectRailwayStatus() {
  try {
    const stdout = execFileSync("railway", ["status", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 8000
    });
    const parsed = JSON.parse(stdout);

    return {
      statusInspected: true,
      linked: true,
      projectName: firstString(parsed.project?.name, parsed.projectName, parsed.project),
      serviceName: firstString(parsed.service?.name, parsed.serviceName, parsed.service),
      environmentName: firstString(parsed.environment?.name, parsed.environmentName, parsed.environment)
    };
  } catch (error) {
    return {
      statusInspected: true,
      linked: false,
      statusMessage: sanitizedError(error)
    };
  }
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const text = fs.readFileSync(filePath, "utf8");

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const name = trimmed.slice(0, equalsIndex);
    const value = trimmed.slice(equalsIndex + 1);
    env[name] = unquote(value);
  }

  return env;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function sanitizedError(error) {
  const candidate = error?.stderr?.toString?.() || error?.stdout?.toString?.() || error?.message || "railway status failed";
  return candidate.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted-database-url]").trim();
}

function unquote(value) {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
