import assert from "node:assert/strict";
import test from "node:test";

import { initializeDeferredBuildDraft } from "../src/components/build/deferredBuildAuthoring.js";

test("closed Build studios defer draft construction until their surface opens", () => {
  let creations = 0;
  const createDraft = () => {
    creations += 1;
    return { status: "clean", value: { id: "draft" } };
  };

  const opened = initializeDeferredBuildDraft(null, createDraft);
  const reopened = initializeDeferredBuildDraft(opened, createDraft);

  assert.equal(creations, 1);
  assert.strictEqual(reopened, opened);
});
