#!/usr/bin/env node

import fs from "node:fs";

import { buildLaunchReadinessReport } from "./lib/launch-readiness-report.mjs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const envExample = fs.readFileSync(".env.example", "utf8");
const routeFiles = ["app/api/health/route.ts", "app/api/readiness/route.ts"].filter((file) => fs.existsSync(file));

const report = buildLaunchReadinessReport({
  packageScripts: pkg.scripts ?? {},
  envExample,
  routeFiles,
  railwayMutatingCommandsRun: []
});

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
