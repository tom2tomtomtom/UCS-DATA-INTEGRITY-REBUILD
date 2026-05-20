import { describe, expect, test } from "vitest";

import { POST } from "../../app/api/chat/route";

async function readSse(response: Response): Promise<unknown[]> {
  const text = await response.text();

  return text
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("data: "))
    .map((chunk) => JSON.parse(chunk.slice("data: ".length)) as unknown);
}

describe("P7-E chat API route", () => {
  test("streams progress, evidence, Needs Codex, and final text events from the evidence agent", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "is UCS04787 a dashboard problem or Float source mismatch?",
          scope: {
            office: "LDN",
            from: "2026-01-01",
            to: "2026-03-31"
          },
          jobNumber: "UCS04787"
        })
      })
    );

    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const events = await readSse(response);

    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "status" })]));
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "investigation", playbook: "float_hours_mismatch" })]));
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "tool_start", tool: "get_display_contract" })]));
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "tool_result", tool: "parse_pasted_float_export", status: "unresolved" })]));
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "evidence", confidence: "low" })]));
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "needs_codex", needed: true })]));
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ type: "text" })]));
  });

  test("ignores client-supplied draft text and reports only from evidence", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: "does USA00262 have zero sold hours?",
          debugDraft: "CLIENT SUPPLIED UNSUPPORTED CLAIM",
          scope: {
            office: "LDN",
            from: "2026-01-01",
            to: "2026-03-31"
          }
        })
      })
    );

    const events = await readSse(response);
    const textEvents = events.filter(
      (event): event is { type: "text"; delta: string } =>
        typeof event === "object" && event !== null && "type" in event && event.type === "text"
    );

    expect(textEvents.length).toBe(1);
    expect(textEvents[0]?.delta).toContain("Playbook: fee_sheet_sold_hours_mismatch");
    expect(textEvents[0]?.delta).not.toContain("CLIENT SUPPLIED UNSUPPORTED CLAIM");
  });
});
