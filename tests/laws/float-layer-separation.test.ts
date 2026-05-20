import { describe, test } from "vitest";

describe("Law 7: raw, cache, and visible must reconcile or warn", () => {
  test.todo("classifies BT raw Float rows without cache allocation as FAIL");
  test.todo("classifies PCS00250 cache hours without raw task rows as WARN");
  test.todo("classifies raw/cache non-trivial deltas as at least WARN");
  test.todo("classifies inactive Float hours contributing visibly as FAIL");
  test.todo("preserves multi-person Float task split evidence");
  test.todo("keeps UCS04787 raw, cache, visible, and export layers separately inspectable");
});
