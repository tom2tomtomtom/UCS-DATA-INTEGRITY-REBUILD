import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import SyncWarningsPage from "../../app/dashboard/admin/sync-warnings/page";
import CapacityReducedPage from "../../app/dashboard/admin/timeoffs/page";
import SyncAuditPage from "../../app/dashboard/audit/page";
import UsersPage from "../../app/dashboard/users/page";

const scopedSearchParams = Promise.resolve({
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31",
  department: "Design"
});

describe("Phase 9.5 secondary route parity", () => {
  test("renders Sync Audit as a read-only evidence route with active nav and scope", async () => {
    const html = renderToStaticMarkup(await SyncAuditPage({ searchParams: scopedSearchParams }));

    expect(html).toContain("Sync Audit");
    expect(html).toContain("Read-only sync evidence");
    expect(html).toContain("Issue details");
    expect(html).toContain("Office: LDN");
    expect(html).toContain("Department: Design");
    expect(html).toContain("aria-current=\"page\"");
  });

  test("renders Sync Warnings without enabling dismiss or archive mutations", async () => {
    const html = renderToStaticMarkup(await SyncWarningsPage({ searchParams: scopedSearchParams }));

    expect(html).toContain("Sync Warnings");
    expect(html).toContain("Read-only warning review");
    expect(html).toContain("PCS00250_CACHE_WITHOUT_RAW");
    expect(html).toContain("FLOAT_VISIBLE_CACHE_MISSING_CACHE");
    expect(html).toContain("Yunni");
    expect(html).toContain("float / float_cache / Yunni");
    expect(html).toContain("Open evidence");
    expect(html).toContain("href=\"/dashboard/projects/UCS04787?office=LDN&amp;from=2026-01-01&amp;to=2026-03-31&amp;department=Design&amp;jobNumber=UCS04787&amp;floatProjectId=11413929\"");
    expect(html).toContain("MUTATION_GUARD is read_only");
    expect(html).not.toContain("Archive selected");
    expect(html).not.toContain("Dismiss selected");
  });

  test("renders Capacity Reduced separately from project booked hours", async () => {
    const html = renderToStaticMarkup(await CapacityReducedPage({ searchParams: scopedSearchParams }));

    expect(html).toContain("Capacity Reduced");
    expect(html).toContain("Time-off rows stay separate from booked project hours");
    expect(html).toContain("Latest batch awareness");
    expect(html).toContain("must not alter project totals");
  });

  test("renders Users as read-only access evidence", async () => {
    const html = renderToStaticMarkup(await UsersPage({ searchParams: scopedSearchParams }));

    expect(html).toContain("Users");
    expect(html).toContain("Read-only access surface");
    expect(html).toContain("Invite workflow");
    expect(html).toContain("Role management");
    expect(html).not.toContain("Send invite");
  });
});
