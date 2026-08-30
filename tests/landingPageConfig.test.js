import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CANONICAL_HOME_CONTENT,
  CANONICAL_HOME_REPOSITORY_URL,
} from "../src/home/canonicalHomeContent.js";

const dashboard = JSON.parse(
  await readFile(new URL("../public/config/dashboard.json", import.meta.url), "utf8"),
);

test("canonical Home orientation content belongs to application source", () => {
  assert.equal(CANONICAL_HOME_CONTENT.hero.headline, "SimEx Dashboard");
  assert.equal(CANONICAL_HOME_CONTENT.hero.primaryAction.label, "Open the dashboard");
  assert.equal(CANONICAL_HOME_CONTENT.hero.primaryAction.mode, "view");
  assert.equal(CANONICAL_HOME_CONTENT.capabilities.length, 3);
  assert.deepEqual(CANONICAL_HOME_CONTENT.capabilities.map(({ title }) => title), ["View", "Build", "Present"]);
  assert.equal(CANONICAL_HOME_REPOSITORY_URL, "https://github.com/hekmatov/simex-dashboard-v3");
  assert.equal(CANONICAL_HOME_CONTENT.resources.repository.destination, CANONICAL_HOME_REPOSITORY_URL);
  assert.equal(CANONICAL_HOME_CONTENT.faq.items.length, 7);
});

test("dashboard package contains only the Home preference and ordinary Pages", () => {
  assert.deepEqual(dashboard.home, { enabled: true });
  assert.equal(dashboard.pages.some(({ id }) => id === "home"), false);
  assert.equal(dashboard.pages.some(({ id }) => id === "old-homepage-content"), false);
  assert.equal(dashboard.pages[0]?.id, "biomedical");
});

test("the builder FAQ provides practical first-time orientation", () => {
  const faqCopy = JSON.stringify(CANONICAL_HOME_CONTENT.faq).toLowerCase();
  assert.match(faqCopy, /add chart/);
  assert.match(faqCopy, /pages.*sections/);
  assert.match(faqCopy, /dashboard look/);
  assert.match(faqCopy, /qmd/);
  assert.match(faqCopy, /chrono studio/);
  assert.match(faqCopy, /audience display/);
  assert.match(faqCopy, /download package/);
});
