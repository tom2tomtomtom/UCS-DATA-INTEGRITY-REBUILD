import { describe, test } from "vitest";

describe("Law 1: every real source row surfaces", () => {
  test.todo("preserves unmatched source rows as source-only evidence");
  test.todo("surfaces archived rows instead of dropping them");
  test.todo("preserves TBC pipeline rows with distinct source identity");
  test.todo("surfaces inactive rows with warning state");
  test.todo("keeps zero-fee nonzero-hour rows visible");
  test.todo("records allowed no-job drops with explicit skipped-row evidence");
  test.todo("keeps duplicate rows visible until a source conflict is resolved");
});
