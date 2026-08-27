import assert from "node:assert/strict";
import test from "node:test";

import { resolveDestination } from "../src/charting/forms/chartDestination.js";

test("saved page and section identities resolve as an editable continuously named destination", () => {
  const dashboard = dashboardFixture();
  const before = structuredClone(dashboard);
  const result = resolveDestination({ pageId: "page-a", sectionId: "section-a" }, dashboard);

  assert.equal(result.status, "valid");
  assert.equal(result.editable, true);
  assert.equal(result.destination.pageId, "page-a");
  assert.equal(result.destination.sectionId, "section-a");
  assert.equal(result.destination.pageLabel, "Biomedical");
  assert.equal(result.destination.sectionLabel, "Surveillance");
  assert.equal(result.destination.orderedText, "Page: Biomedical. Section: Surveillance.");
  assert.equal(typeof result.revision, "string");
  assert.deepEqual(result.errors, []);
  assert.deepEqual(dashboard, before);
});

test("minimum structure proposals create only an initial section or a page with its initial section", () => {
  const dashboard = dashboardFixture();
  const proposedSection = resolveDestination({
    pageId: "page-a",
    sectionId: "new-section",
    proposedStructure: {
      section: { id: "new-section", title: "New evidence" },
    },
  }, dashboard);
  assert.equal(proposedSection.status, "valid");
  assert.equal(proposedSection.destination.source, "proposed-section");
  assert.equal(proposedSection.destination.pageLabel, "Biomedical");
  assert.equal(proposedSection.destination.sectionLabel, "New evidence");

  const proposedPage = resolveDestination({
    pageId: "new-page",
    sectionId: "initial",
    proposedStructure: {
      page: { id: "new-page", label: "Preparedness", pageType: "dashboard" },
      section: { id: "initial", title: "Overview" },
    },
  }, dashboard);
  assert.equal(proposedPage.status, "valid");
  assert.equal(proposedPage.destination.source, "proposed-page-and-section");
  assert.equal(proposedPage.destination.orderedText, "Page: Preparedness. Section: Overview.");
});

test("incomplete or colliding proposals fail without becoming nested structure editing", () => {
  const dashboard = dashboardFixture();
  const missingInitialSection = resolveDestination({
    pageId: "new-page",
    sectionId: "initial",
    proposedStructure: {
      page: { id: "new-page", label: "Preparedness", pageType: "dashboard" },
    },
  }, dashboard);
  assert.equal(missingInitialSection.status, "invalid");
  assert.equal(missingInitialSection.errors[0].code, "PROPOSED_SECTION_REQUIRED");

  const duplicatePage = resolveDestination({
    pageId: "page-a",
    sectionId: "other",
    proposedStructure: {
      page: { id: "page-a", label: "Duplicate", pageType: "dashboard" },
      section: { id: "other", title: "Other" },
    },
  }, dashboard);
  assert.equal(duplicatePage.status, "invalid");
  assert.equal(duplicatePage.errors[0].code, "PROPOSED_PAGE_ID_DUPLICATE");

  const duplicateSection = resolveDestination({
    pageId: "page-a",
    sectionId: "section-a",
    proposedStructure: { section: { id: "section-a", title: "Duplicate" } },
  }, dashboard);
  assert.equal(duplicateSection.status, "invalid");
  assert.equal(duplicateSection.errors[0].code, "PROPOSED_SECTION_ID_DUPLICATE");
});

test("missing, deleted, and unsupported destinations retain their exact invalid choice", () => {
  const dashboard = dashboardFixture();
  const missingPage = resolveDestination({ pageId: "deleted-page", sectionId: "section-a" }, dashboard);
  assert.equal(missingPage.status, "invalid");
  assert.equal(missingPage.destination.pageId, "deleted-page");
  assert.equal(missingPage.destination.sectionId, "section-a");
  assert.match(missingPage.destination.orderedText, /Missing page \(deleted-page\)/);
  assert.equal(missingPage.errors[0].code, "DESTINATION_PAGE_MISSING");

  const missingSection = resolveDestination({ pageId: "page-a", sectionId: "deleted-section" }, dashboard);
  assert.equal(missingSection.status, "invalid");
  assert.equal(missingSection.destination.sectionId, "deleted-section");
  assert.equal(missingSection.errors[0].code, "DESTINATION_SECTION_MISSING");

  const canonicalHome = resolveDestination({ pageId: "home", sectionId: "home-section" }, dashboard);
  assert.equal(canonicalHome.status, "invalid");
  assert.equal(canonicalHome.destination.pageId, "home");
  assert.equal(canonicalHome.errors[0].code, "DESTINATION_PAGE_MISSING");
});

test("a destination that becomes unsupported produces a new invalid revision and zero dashboard writes", () => {
  const dashboard = dashboardFixture();
  const first = resolveDestination({ pageId: "page-a", sectionId: "section-a" }, dashboard);
  const unsupportedDashboard = structuredClone(dashboard);
  unsupportedDashboard.pages[0].sections[0].supportsCanonicalPanels = false;
  const before = structuredClone(unsupportedDashboard);
  const second = resolveDestination({ pageId: "page-a", sectionId: "section-a" }, unsupportedDashboard);

  assert.equal(first.status, "valid");
  assert.equal(second.status, "invalid");
  assert.notEqual(second.revision, first.revision);
  assert.equal(second.errors[0].code, "DESTINATION_UNSUPPORTED");
  assert.deepEqual(unsupportedDashboard, before);
});

function dashboardFixture() {
  return {
    id: "dashboard-1",
    pages: [
      {
        id: "page-a",
        label: "Biomedical",
        pageType: "dashboard",
        sections: [
          {
            id: "section-a",
            title: "Surveillance",
            panels: [
              { id: "panel-alpha", chart: { id: "chart-alpha", title: "Cases", layout: { size: "standard" } } },
              { id: "panel-beta", chart: { id: "chart-beta", title: "Capacity", layout: { size: "standard" } } },
            ],
          },
          {
            id: "section-b",
            title: "Response",
            panels: [{ id: "panel-gamma", chart: { id: "chart-gamma", title: "Teams" } }],
          },
        ],
      },
    ],
  };
}
