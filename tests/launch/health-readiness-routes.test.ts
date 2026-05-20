import { afterEach, describe, expect, test } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("P9-B health and readiness routes", () => {
  test("/api/health returns app status and commit metadata without secrets", async () => {
    process.env.APP_ENV = "test";
    process.env.RAILWAY_GIT_COMMIT_SHA = "abcdef123456";

    const { GET } = await import("../../app/api/health/route");
    const response = await GET();
    const body = await response.json();
    const text = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      app: "ucs-data-integrity-rebuild",
      environment: "test",
      commit: "abcdef123456"
    });
    expect(text).not.toContain("DATABASE_URL");
    expect(text).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(text).not.toContain("postgres://");
  });

  test("/api/readiness passes with new Supabase env and read-only mutation guard", async () => {
    setReadyEnv();

    const { GET } = await import("../../app/api/readiness/route");
    const response = await GET();
    const body = await response.json();
    const text = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.status).toBe("pass");
    expect(body.summary).toMatchObject({
      supabaseRef: "newprojectref",
      mutationGuard: "read_only",
      databaseHost: "db.newprojectref.supabase.co"
    });
    expect(body.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DATABASE_URL_NEW_SUPABASE", status: "pass" }),
        expect.objectContaining({ code: "MUTATION_GUARD_READ_ONLY", status: "pass" })
      ])
    );
    expect(text).not.toContain("service-secret");
    expect(text).not.toContain("postgres://");
    expect(text).not.toContain("anon-secret");
  });

  test("/api/readiness fails without exposing missing secret values or using legacy DB as truth", async () => {
    process.env.APP_ENV = "production";
    process.env.MUTATION_GUARD = "write_enabled";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://newprojectref.supabase.co";
    process.env.DATABASE_URL = "postgres://postgres:secret@db.legacyref.supabase.co:5432/postgres";
    process.env.LEGACY_DATABASE_URL = process.env.DATABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { GET } = await import("../../app/api/readiness/route");
    const response = await GET();
    const body = await response.json();
    const text = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(body.status).toBe("fail");
    expect(body.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MUTATION_GUARD_NOT_READ_ONLY" }),
        expect.objectContaining({ code: "DATABASE_URL_MATCHES_LEGACY" }),
        expect.objectContaining({ code: "DATABASE_URL_NOT_NEW_SUPABASE" }),
        expect.objectContaining({ code: "ENV_MISSING_NEXT_PUBLIC_SUPABASE_ANON_KEY" }),
        expect.objectContaining({ code: "ENV_MISSING_SUPABASE_SERVICE_ROLE_KEY" })
      ])
    );
    expect(text).not.toContain("secret");
    expect(text).not.toContain("postgres://");
  });
});

function setReadyEnv() {
  process.env.APP_ENV = "production";
  process.env.MUTATION_GUARD = "read_only";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://newprojectref.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-secret";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-secret";
  process.env.DATABASE_URL = "postgres://postgres:db-secret@db.newprojectref.supabase.co:5432/postgres";
  process.env.LEGACY_DATABASE_URL = "postgres://postgres:legacy-secret@db.legacyref.supabase.co:5432/postgres";
}
