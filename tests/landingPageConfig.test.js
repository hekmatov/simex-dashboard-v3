import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboard = JSON.parse(
  await readFile(new URL("../public/config/dashboard.json", import.meta.url), "utf8"),
);

test("Home defines concise Cloudflare-beta orientation content", () => {
  const home = dashboard.pages.find((page) => page.id === "home");
  assert.equal(home?.pageType, "landing");
  assert.equal(home?.landing?.hero?.headline, "SimEx Dashboard");
  assert.equal(home?.landing?.hero?.primaryAction?.label, "Open the dashboard");
  assert.equal(home?.landing?.capabilities?.length, 3);
  assert.deepEqual(home?.landing?.capabilities?.map(({ title }) => title), ["View", "Build", "Present"]);
  assert.equal(home?.landing?.resources?.repository?.destination, "https://github.com/hekmatov/simex-dashboard-v3");
  assert.equal(home?.landing?.deliveryStatus, undefined);
  assert.equal(home?.landing?.faq?.items?.length, 7);
  assert.ok(home.sections?.length > 0, "Home must retain analytical fallback sections");
});

test("the beta landing primary action has a valid target", () => {
  const pageIds = new Set(dashboard.pages.map((page) => page.id));
  const home = dashboard.pages.find((page) => page.id === "home");
  const targets = [
    home.landing.hero.primaryAction.pageId,
  ];
  targets.forEach((target) => assert.ok(pageIds.has(target), `Unknown page target: ${target}`));
});

test("the builder FAQ provides practical first-time orientation", () => {
  const home = dashboard.pages.find((page) => page.id === "home");
  const faqCopy = JSON.stringify(home.landing.faq).toLowerCase();
  assert.match(faqCopy, /add chart/);
  assert.match(faqCopy, /pages.*sections/);
  assert.match(faqCopy, /dashboard look/);
  assert.match(faqCopy, /qmd/);
  assert.match(faqCopy, /chrono studio/);
  assert.match(faqCopy, /audience display/);
  assert.match(faqCopy, /download package/);
});
