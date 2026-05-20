#!/usr/bin/env node

import { buildNamedScenarioReport } from "./lib/named-scenario-report.mjs";

process.stdout.write(`${JSON.stringify(buildNamedScenarioReport(), null, 2)}\n`);
