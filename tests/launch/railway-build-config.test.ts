import fs from "node:fs";

import { describe, expect, test } from "vitest";

type RailwayConfig = {
  readonly $schema?: string;
  readonly build?: {
    readonly builder?: string;
    readonly buildCommand?: string;
    readonly dockerfilePath?: string | null;
  };
  readonly deploy?: {
    readonly startCommand?: string;
    readonly healthcheckPath?: string;
    readonly healthcheckTimeout?: number;
    readonly restartPolicyType?: string;
    readonly restartPolicyMaxRetries?: number;
    readonly preDeployCommand?: string | null;
    readonly cronSchedule?: string | null;
  };
};

describe("P9-D Railway build configuration", () => {
  test("package pins Node and exposes production start without bypassing build gates", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      engines?: Record<string, string>;
      scripts?: Record<string, string>;
    };

    expect(pkg.engines?.node).toBe("20.x");
    expect(pkg.scripts?.build).toBe("npm run verify:phase8");
    expect(pkg.scripts?.["verify:phase9"]).toBe("npm run build && node scripts/verify-phase9.mjs");
    expect(pkg.scripts?.start).toBe("next start");
  });

  test("Railway config uses Railpack with explicit gated build start and health commands", () => {
    const config = JSON.parse(fs.readFileSync("railway.json", "utf8")) as RailwayConfig;

    expect(config.$schema).toBe("https://railway.com/railway.schema.json");
    expect(config.build?.builder).toBe("RAILPACK");
    expect(config.build?.buildCommand).toBe("npm run build");
    expect(config.build?.dockerfilePath ?? null).toBeNull();
    expect(config.deploy?.startCommand).toBe("npm run start");
    expect(config.deploy?.healthcheckPath).toBe("/api/health");
    expect(config.deploy?.healthcheckTimeout).toBe(120);
    expect(config.deploy?.restartPolicyType).toBe("ON_FAILURE");
    expect(config.deploy?.restartPolicyMaxRetries).toBe(3);
    expect(config.deploy?.preDeployCommand ?? null).toBeNull();
    expect(config.deploy?.cronSchedule ?? null).toBeNull();
  });

  test("Railway config does not copy old service names secrets migrations or scheduled syncs", () => {
    const configText = fs.readFileSync("railway.json", "utf8");

    expect(configText).not.toContain("ucs-commercial-dashboard");
    expect(configText).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(configText).not.toContain("DATABASE_URL=");
    expect(configText).not.toContain("supabase db push");
    expect(configText).not.toContain("migration");
    expect(configText).not.toContain("sync");
    expect(configText).not.toContain("cronSchedule");
    expect(fs.existsSync("Dockerfile")).toBe(false);
  });
});
