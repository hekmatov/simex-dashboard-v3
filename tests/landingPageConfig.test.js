import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboard = JSON.parse(
  await readFile(new URL("../public/config/dashboard.json", import.meta.url), "utf8"),
);

test("Home defines a complete showcase landing contract", () => {
  const home = dashboard.pages.find((page) => page.id === "home");
  assert.equal(home?.pageType, "landing");
  assert.equal(home?.landing?.hero?.headline, "From complex exercise data to shared situational awareness");
  assert.equal(home?.landing?.proofPoints?.length, 3);
  assert.equal(home?.landing?.capabilities?.length, 3);
  assert.equal(home?.landing?.domainRoutes?.length, 2);
  assert.equal(home?.landing?.tourItems?.length, 4);
  assert.equal(home?.landing?.deliveryStatus?.length, 3);
  assert.equal(home?.landing?.previewAsset?.src, "assets/showcase-dashboard-preview.png");
  assert.ok(home.sections?.length > 0, "Home must retain analytical fallback sections");
});

test("all configured landing page targets exist", () => {
  const pageIds = new Set(dashboard.pages.map((page) => page.id));
  const home = dashboard.pages.find((page) => page.id === "home");
  const targets = [
    home.landing.hero.primaryAction.pageId,
    ...home.landing.domainRoutes.map((route) => route.pageId),
  ];
  targets.forEach((target) => assert.ok(pageIds.has(target), `Unknown page target: ${target}`));
});

test("public status copy describes Quorum as ready, not connected", () => {
  const home = dashboard.pages.find((page) => page.id === "home");
  const statusCopy = JSON.stringify(home.landing.deliveryStatus).toLowerCase();
  assert.match(statusCopy, /integration-ready/);
  assert.doesNotMatch(statusCopy, /companion connected|actively connected|quorum connected/);
});
