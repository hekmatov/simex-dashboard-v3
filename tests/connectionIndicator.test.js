import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL(
  "../src/components/presentation/ConnectionIndicator.jsx",
  import.meta.url,
);

test("ConnectionIndicator renders connection status only through SimExIcon", async () => {
  const source = await readFile(componentUrl, "utf8");

  assert.match(source, /SimExIcon/);
  assert.match(source, /presentation\.connection-disconnected/);
  assert.match(source, /presentation\.connection-reconnecting/);
  assert.match(source, /decorative=\{false\}/);
  assert.match(source, /label=\{interaction\.label\}/);
  assert.doesNotMatch(source, /<svg|createElement\(\s*["']svg["']/);
});

test("ConnectionIndicator keeps status words accessible but not visibly duplicated", async () => {
  const source = await readFile(componentUrl, "utf8");

  assert.doesNotMatch(
    source,
    />\s*Audience display (?:disconnected|reconnecting)\s*</,
  );
});

test("PresentationController binds the indicator to the S8-2 session connection state", async () => {
  const source = await readFile(new URL(
    "../src/components/presentation/PresentationController.jsx",
    import.meta.url,
  ), "utf8");

  assert.match(source, /<ConnectionIndicator connection=\{session\.connection\} \/>/);
  assert.doesNotMatch(source, /ConnectionIndicator[^\n]*(?:onClick|button|control)/);
});

test("standalone connection comparison is complete, local, and explicitly non-production", async () => {
  const evidence = await readFile(new URL(
    "../docs/audits/2026-08-19-v3-connection-icon-comparison.html",
    import.meta.url,
  ), "utf8");

  assert.equal(matchCount(evidence, /data-state="disconnected"/g), 2);
  assert.equal(matchCount(evidence, /data-state="reconnecting"/g), 2);
  assert.equal(matchCount(evidence, /data-production-status="evidence-only"/g), 4);
  assert.match(
    evidence,
    /data-candidate="D2"[^>]*data-approval="approved-disconnected-choice"/,
  );
  assert.match(evidence, /Approved disconnected choice · D2 · evidence only/);
  assert.match(
    evidence,
    /data-candidate="R2"[^>]*data-approval="approved-reconnecting-choice"/,
  );
  assert.match(evidence, /Approved reconnecting choice · R2 · evidence only/);
  assert.equal(matchCount(evidence, /class="context light"/g), 4);
  assert.equal(matchCount(evidence, /class="context dark"/g), 4);
  for (const size of [16, 20, 24]) {
    assert.equal(
      matchCount(evidence, new RegExp(`style="--size:${size}px"`, "g")),
      8,
      `Every candidate needs ${size}px light and dark samples`,
    );
  }
  for (const reference of ["open", "close", "loop", "spinner"]) {
    assert.match(evidence, new RegExp(`data-reference-glyph="${reference}"`));
  }
  for (const [interactionId, accessibleName] of [
    ["presentation.connection-disconnected", "Audience display disconnected"],
    ["presentation.connection-reconnecting", "Audience display reconnecting"],
  ]) {
    assert.equal(matchCount(evidence, new RegExp(interactionId.replaceAll(".", "\\."), "g")), 2);
    assert.equal(matchCount(evidence, new RegExp(accessibleName, "g")), 2);
  }
  assert.match(evidence, /stroke-linecap:\s*round/);
  assert.match(evidence, /stroke-linejoin:\s*round/);
  assert.match(evidence, /stroke-width:\s*1\.8/);
  assert.doesNotMatch(evidence, /<(?:script|link|img)\b[^>]*(?:src|href)=|https?:\/\//i);
});

function matchCount(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}
