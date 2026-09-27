import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  buildChartCatalogue,
  buildChartCatalogueSnapshot,
  canonicalDashboardSemanticsBytes,
  catalogueMatchesDashboardSnapshot,
} from "../src/lib/quorumCatalogue.js";
import {
  validateDashboardConfig,
} from "../src/charting/config/dashboardBundleV3.js";
import {
  createChartDraft,
} from "../src/charting/config/chartConfigV3.js";
import {
  loadDashboardConfig,
  normalizeDashboardSource,
} from "../src/lib/loadDashboard.js";

const CURRENT_STRUCTURE_INVENTORY = Object.freeze({
  root: [
    "chronoGroups",
    "configVersion",
    "contentLibrary",
    "dataSources",
    "datasetProfiles",
    "description",
    "globalStyles",
    "home",
    "id",
    "lastUpdated",
    "layout",
    "pages",
    "programLabel",
    "scenarioLabel",
    "scenes",
    "timezone",
    "title",
  ],
  home: ["enabled"],
  page: [
    "description",
    "id",
    "label",
    "sections",
    "title",
  ],
  section: [
    "description",
    "id",
    "panels",
    "title",
  ],
  landing: [],
  hero: [],
  heroAction: [],
  capability: [],
  faq: [],
  faqItem: [],
  resources: [],
  repository: [],
  globalStyles: [
    "accessibility",
    "chartColorMode",
    "dashboardColorProfile",
    "dashboardStyle",
    "panelColors",
  ],
  accessibility: ["enabled"],
  panelColors: [
    "chartAreaBorderColor",
    "chartAreaColor",
    "editHighlightColor",
    "multiSelectHighlightColor",
    "panelBackgroundColor",
    "panelBorderColor",
  ],
});

test("the strict semantic boundary covers the current showcase structure exactly", async () => {
  const { dashboard, aliases } = await trackedInputs();

  assert.deepEqual(structureInventory(dashboard), CURRENT_STRUCTURE_INVENTORY);
  assert.doesNotThrow(() => buildChartCatalogue(dashboard, aliases));

  const semanticDocument = JSON.parse(
    new TextDecoder().decode(
      canonicalDashboardSemanticsBytes(dashboard, aliases),
    ),
  );
  const { datasetProfiles: _runtimeProfiles, ...semanticDashboard } = dashboard;
  assert.deepEqual(semanticDocument, {
    aliases,
    dashboard: semanticDashboard,
  });
});

test("runtime profiles are accepted without changing packaged catalogue identity", async () => {
  const { dashboard, aliases, profiles } = await trackedInputs();
  const persisted = await readJson("public/integration/quorum-chart-catalogue.json");
  const { datasetProfiles: _runtimeProfiles, ...semanticDashboard } = dashboard;
  assert.ok(Object.keys(profiles).length > 0);
  assert.deepEqual(dashboard.datasetProfiles, profiles);
  const semanticDigest = nodeSha256(
    canonicalDashboardSemanticsBytes(semanticDashboard, aliases),
  );
  assert.equal(
    nodeSha256(canonicalDashboardSemanticsBytes(dashboard, aliases)),
    semanticDigest,
  );
  const changedProfiles = structuredClone(dashboard);
  changedProfiles.datasetProfiles = { ...profiles, fixture: { fingerprint: "runtime-only" } };
  assert.equal(
    nodeSha256(canonicalDashboardSemanticsBytes(changedProfiles, aliases)),
    semanticDigest,
  );
  assert.deepEqual(
    await buildChartCatalogueSnapshot(dashboard, aliases, nodeSha256),
    await buildChartCatalogueSnapshot(semanticDashboard, aliases, nodeSha256),
  );
  assert.equal(
    await catalogueMatchesDashboardSnapshot(semanticDashboard, aliases, persisted, nodeSha256),
    true,
  );
});

test("every packaged dashboard structure family participates in the digest and stale match", async (t) => {
  const { dashboard, aliases } = await trackedInputs();
  addAuthoredLandingFixture(dashboard);
  const { chartId, sourceId } = addAuthoredChronoFixture(dashboard);
  assert.doesNotThrow(() => buildChartCatalogue(dashboard, aliases));
  const originalBytes = Buffer.from(
    canonicalDashboardSemanticsBytes(dashboard, aliases),
  );
  const snapshot = await buildChartCatalogueSnapshot(
    dashboard,
    aliases,
    nodeSha256,
  );

  const mutations = {
    "root identity": (value) => {
      value.dashboard.id = `${value.dashboard.id}-alternate`;
    },
    "root title": (value) => {
      value.dashboard.title = `${value.dashboard.title} alternate`;
    },
    "root description": (value) => {
      value.dashboard.description = `${value.dashboard.description} Alternate.`;
    },
    "root revision": (value) => {
      value.dashboard.lastUpdated = "2027-04-19";
    },
    "root layout": (value) => {
      value.dashboard.layout = "single-column";
    },
    "program label": (value) => {
      value.dashboard.programLabel = "Alternate exercise";
    },
    "scenario label": (value) => {
      value.dashboard.scenarioLabel = "Alternate scenario";
    },
    "global panel colors": (value) => {
      value.dashboard.globalStyles.panelColors.panelBackgroundColor = "#123456";
    },
    "page identity": (value) => {
      const page = pageById(value.dashboard, "socio_economic");
      page.id = "socio_economic_alternate";
    },
    "page labels": (value) => {
      pageById(value.dashboard, "biomedical").label = "Biomedical alternate";
    },
    "page title": (value) => {
      pageById(value.dashboard, "biomedical").title = "Biomedical alternate";
    },
    "page description": (value) => {
      pageById(value.dashboard, "biomedical").description += " Alternate.";
    },
    "explicit dashboard page type": (value) => {
      pageById(value.dashboard, "biomedical").pageType = "dashboard";
    },
    "page order": (value) => {
      [value.dashboard.pages[0], value.dashboard.pages[1]] =
        [value.dashboard.pages[1], value.dashboard.pages[0]];
    },
    "section identity": (value) => {
      pageById(value.dashboard, "biomedical").sections[0].id += "_alternate";
    },
    "section title": (value) => {
      pageById(value.dashboard, "biomedical").sections[0].title += " alternate";
    },
    "section description": (value) => {
      pageById(value.dashboard, "biomedical").sections[0].description +=
        " Alternate.";
    },
    "section layout": (value) => {
      pageById(value.dashboard, "biomedical").sections[0].layout =
        "single-column";
    },
    "section order": (value) => {
      const sections = pageById(value.dashboard, "biomedical").sections;
      [sections[0], sections[1]] = [sections[1], sections[0]];
    },
    "panel order": (value) => {
      const panels = pageById(value.dashboard, "biomedical")
        .sections.find(({ panels }) => panels.length > 1).panels;
      [panels[0], panels[1]] = [panels[1], panels[0]];
    },
    "landing hero text": (value) => {
      landing(value.dashboard).hero.headline += " alternate";
    },
    "landing primary action label": (value) => {
      landing(value.dashboard).hero.primaryAction.label = "Open alternate";
    },
    "landing primary action page": (value) => {
      landing(value.dashboard).hero.primaryAction.pageId = "socio_economic";
    },
    "landing capability": (value) => {
      landing(value.dashboard).capabilities[0].number = "99";
    },
    "landing FAQ": (value) => {
      landing(value.dashboard).faq.items[0].answer += " Alternate.";
    },
    "landing repository": (value) => {
      landing(value.dashboard).resources.repository.destination =
        "https://example.test/simex-dashboard-v3";
    },
    "data source descriptor": (value) => {
      value.dashboard.dataSources[sourceId].path =
        "data/revised-cases.csv";
    },
    "time synchronization": (value) => {
      value.dashboard.chronoGroups[0].name += " alternate";
    },
    "chart semantics": (value) => {
      configuredChart(value.dashboard, chartId).title +=
        " alternate";
    },
    "alias semantics": (value) => {
      value.aliases[chartId].aliases[0] += " alternate";
    },
  };

  for (const [name, mutate] of Object.entries(mutations)) {
    await t.test(name, async () => {
      const changed = {
        dashboard: structuredClone(dashboard),
        aliases: structuredClone(aliases),
      };
      mutate(changed);
      assert.notDeepEqual(
        Buffer.from(
          canonicalDashboardSemanticsBytes(
            changed.dashboard,
            changed.aliases,
          ),
        ),
        originalBytes,
      );
      assert.equal(
        await catalogueMatchesDashboardSnapshot(
          changed.dashboard,
          changed.aliases,
          snapshot,
          nodeSha256,
        ),
        false,
      );
    });
  }
});

test("the producer rejects unknown structural fields, wrong types, cycles, and accessors", async (t) => {
  const { dashboard, aliases } = await trackedInputs();
  addAuthoredLandingFixture(dashboard);
  assert.doesNotThrow(() => buildChartCatalogue(dashboard, aliases));
  const cases = {
    "unknown root field": (value) => {
      value.legacyDashboard = {};
    },
    "runtime loaded data at semantic root": (value) => {
      value.loadedData = {};
    },
    "runtime preview state at semantic root": (value) => {
      value.previewState = {};
    },
    "unknown page field": (value) => {
      value.pages[0].legacyPage = {};
    },
    "unknown section field": (value) => {
      value.pages[0].sections[0].legacySection = {};
    },
    "unknown landing field": (value) => {
      landing(value).legacyLanding = {};
    },
    "unknown landing hero field": (value) => {
      landing(value).hero.legacyHero = {};
    },
    "unknown landing action field": (value) => {
      landing(value).hero.primaryAction.legacyAction = {};
    },
    "unknown global style field": (value) => {
      value.globalStyles.legacyStyles = {};
    },
    "unknown panel color field": (value) => {
      value.globalStyles.panelColors.legacyColor = "#000000";
    },
    "retired Vanta field": (value) => {
      value.vantaBackground = {};
    },
    "wrong page field type": (value) => {
      value.pages[0].label = 42;
    },
    "wrong section field type": (value) => {
      value.pages[0].sections[0].layout = [];
    },
    "wrong landing field type": (value) => {
      landing(value).faq.items = {};
    },
    "cyclic landing data": (value) => {
      landing(value).hero = landing(value);
    },
    "page accessor": (value) => {
      Object.defineProperty(value.pages[0], "title", {
        enumerable: true,
        get() {
          throw new Error("must not execute");
        },
      });
    },
    "nested runtime-named accessor": (value) => {
      value.datasetProfiles.loadedData = {};
      Object.defineProperty(value.datasetProfiles.loadedData, "poison", {
        enumerable: true,
        get() { throw new Error("must not execute"); },
      });
    },
    "nested runtime-named cycle": (value) => {
      value.datasetProfiles.loadedData = {};
      value.datasetProfiles.loadedData.self = value.datasetProfiles.loadedData;
    },
  };
  const expectedErrors = {
    "unknown root field": /legacyDashboard/,
    "runtime loaded data at semantic root": /loadedData/,
    "runtime preview state at semantic root": /previewState/,
    "unknown page field": /legacyPage/,
    "unknown section field": /legacySection/,
    "unknown landing field": /legacyLanding/,
    "unknown landing hero field": /legacyHero/,
    "unknown landing action field": /legacyAction/,
    "unknown global style field": /legacyStyles/,
    "unknown panel color field": /legacyColor/,
    "retired Vanta field": /vantaBackground/,
    "wrong page field type": /label/,
    "wrong section field type": /layout/,
    "wrong landing field type": /FAQ.*items|items.*FAQ/i,
    "cyclic landing data": /cyclic structural reference/i,
    "page accessor": /title.*data property|data property.*title/i,
    "nested runtime-named accessor": /poison.*data property/i,
    "nested runtime-named cycle": /cyclic structural reference/i,
  };

  for (const [name, mutate] of Object.entries(cases)) {
    await t.test(name, () => {
      const changed = structuredClone(dashboard);
      mutate(changed);
      assert.throws(
        () => buildChartCatalogue(changed, aliases),
        expectedErrors[name],
        name,
      );
    });
  }
});

test("the producer rejects duplicate structural identities and broken landing references", async (t) => {
  const { dashboard, aliases } = await trackedInputs();
  addAuthoredLandingFixture(dashboard);
  assert.doesNotThrow(() => buildChartCatalogue(dashboard, aliases));
  const lineIds = dashboard.pages
    .flatMap((page) => page.sections)
    .flatMap((section) => section.panels)
    .map((panel) => panel.chart ?? panel)
    .filter(({ typeId }) => typeId === "line")
    .map(({ id }) => id);
  assert.ok(lineIds.length >= 2);
  const cases = {
    "duplicate page ID": (value) => {
      value.pages[1].id = value.pages[0].id;
    },
    "duplicate section ID in a page": (value) => {
      value.pages[1].sections[1].id = value.pages[1].sections[0].id;
    },
    "duplicate chart ID": (value) => {
      const section = value.pages.flatMap((page) => page.sections)
        .find(({ panels }) => panels.some((panel) => (
          (panel.chart ?? panel).id === lineIds[1]
        )));
      const index = section.panels.findIndex((panel) => (
        (panel.chart ?? panel).id === lineIds[1]
      ));
      const chart = structuredClone(section.panels[index].chart ?? section.panels[index]);
      chart.id = lineIds[0];
      section.panels[index] = { id: "fixture-duplicate-chart-wrapper", chart };
    },
    "duplicate wrapper panel ID": (value) => {
      const panels = value.pages[1].sections
        .find((section) => section.panels.length > 1).panels;
      panels[0] = { id: "repeated-panel", chart: panels[0] };
      panels[1] = { id: "repeated-panel", chart: panels[1] };
    },
    "broken primary page reference": (value) => {
      landing(value).hero.primaryAction.pageId = "missing-page";
    },
  };
  const expectedErrors = {
    "duplicate page ID": /duplicate.*page.*id/i,
    "duplicate section ID in a page": /duplicate.*section.*id/i,
    "duplicate chart ID": /duplicate.*chart.*id/i,
    "duplicate wrapper panel ID": /duplicate.*panel.*id/i,
    "broken primary page reference": /missing-page/,
  };

  for (const [name, mutate] of Object.entries(cases)) {
    await t.test(name, () => {
      const changed = structuredClone(dashboard);
      mutate(changed);
      assert.throws(
        () => buildChartCatalogue(changed, aliases),
        expectedErrors[name],
        name,
      );
    });
  }
});

test("bundle validation and runtime loading enforce the same dashboard structure boundary", async (t) => {
  const { dashboard, profiles } = await trackedInputs();
  addAuthoredLandingFixture(dashboard);
  const cases = {
    "unknown page field": {
      mutate(value) {
        value.pages[0].legacyPage = {};
      },
      error: /Unknown dashboard page property "legacyPage"\./,
    },
    "wrong page field type": {
      mutate(value) {
        value.pages[0].label = 42;
      },
      error: /Dashboard page "scenario" label must be non-empty text\./,
    },
    "page accessor": {
      mutate(value) {
        Object.defineProperty(value.pages[0], "title", {
          enumerable: true,
          get() { throw new Error("must not execute"); },
        });
      },
      error: /title.*enumerable data property/i,
    },
    "duplicate page ID": {
      mutate(value) {
        value.pages[1].id = value.pages[0].id;
      },
      error: (value) => ({
        message: `Duplicate dashboard page id "${value.pages[0].id}".`,
      }),
    },
    "broken landing primary action reference": {
      mutate(value) {
        landing(value).hero.primaryAction.pageId = "missing-page";
      },
      error: /Landing primary action for page "socio_economic" references unknown page "missing-page"\./,
    },
    "cyclic landing data": {
      mutate(value) {
        landing(value).hero = landing(value);
      },
      error: /Dashboard configuration property "pages" \d+ property "landing" property "hero" contains a cyclic structural reference\./,
    },
  };

  for (const [name, { mutate, error }] of Object.entries(cases)) {
    await t.test(name, async () => {
      const changed = structuredClone(dashboard);
      mutate(changed);
      const expectedError = typeof error === "function" ? error(changed) : error;
      assert.throws(
        () => validateDashboardConfig(changed),
        expectedError,
        `${name} at bundle boundary`,
      );
      await assert.rejects(
        loadDashboardConfig(changed, profiles),
        expectedError,
        `${name} at runtime loader boundary`,
      );
    });
  }
});

test("structural cycle guards allow shared non-cyclic references", async () => {
  const { dashboard, aliases, profiles } = await trackedInputs();
  addAuthoredLandingFixture(dashboard);
  const sharedFaqItem = landing(dashboard).faq.items[0];
  landing(dashboard).faq.items[1] = sharedFaqItem;
  dashboard.datasetProfiles = profiles;
  const before = structuredClone(dashboard);

  assert.doesNotThrow(() => validateDashboardConfig(dashboard));
  assert.doesNotThrow(() => normalizeDashboardSource(dashboard, profiles));
  assert.doesNotThrow(() => buildChartCatalogue(dashboard, aliases));
  assert.deepEqual(dashboard, before);
});

test("runtime loading rejects a dashboard without a migratable version", async () => {
  await assert.rejects(
    loadDashboardConfig({}, {}),
    /dashboard configuration version 5 or 6 is required/i,
  );
});

test("runtime loading requires configured pages instead of synthesizing a legacy page", async () => {
  const missingPages = {
    configVersion: 6,
    contentLibrary: { mediaItems: {}, sourceEntries: {} },
    dataSources: {},
    home: { enabled: true },
    id: "missing-pages-dashboard",
    title: "Missing pages dashboard",
    timezone: "UTC",
  };
  await assert.rejects(
    loadDashboardConfig(missingPages, {}),
    /dashboard configuration property "pages" is required/i,
  );
});

test("runtime loading rejects broken chart, source, and time references", async (t) => {
  const cases = {
    "chart source": {
      mutate(value) {
        value.pages[0].sections[0].panels[0].sourceId = "missing-source";
      },
      error: /Chart "runtime-line" references unknown source "missing-source"\./,
    },
    "chrono group period": {
      mutate(value) {
        value.chronoGroups[0].period.end = "2027-04-30";
      },
      error: /Chrono Group "runtime-clock" period end must be on or after start\./,
    },
    "member chart": {
      mutate(value) {
        value.chronoGroups[0].members[0].chartId = "missing-chart";
      },
      error: /Time synchronization member chart "missing-chart" does not exist\./,
    },
  };

  for (const [name, { mutate, error }] of Object.entries(cases)) {
    await t.test(name, async () => {
      const dashboard = runtimeDashboard();
      mutate(dashboard);
      await assert.rejects(
        loadDashboardConfig(dashboard, {}),
        error,
        name,
      );
    });
  }
});

async function trackedInputs() {
  const [rawDashboard, aliases, profiles] = await Promise.all([
    readJson("public/config/dashboard.json"),
    readJson("public/config/chart-aliases.json"),
    readJson("public/config/dataset-profiles.json"),
  ]);
  const dashboard = normalizeDashboardSource(rawDashboard, profiles);
  return { dashboard, aliases, profiles };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function structureInventory(dashboard) {
  const landingPage = dashboard.pages.find((page) => page.landing);
  const landingContent = landingPage?.landing;
  const sections = dashboard.pages.flatMap((page) => page.sections);
  return {
    root: keysOf([dashboard]),
    home: keysOf([dashboard.home]),
    page: keysOf(dashboard.pages),
    section: keysOf(sections),
    landing: keysOf(landingContent ? [landingContent] : []),
    hero: keysOf(landingContent ? [landingContent.hero] : []),
    heroAction: keysOf(
      landingContent ? [landingContent.hero.primaryAction] : [],
    ),
    capability: keysOf(landingContent?.capabilities ?? []),
    faq: keysOf(landingContent ? [landingContent.faq] : []),
    faqItem: keysOf(landingContent?.faq?.items ?? []),
    resources: keysOf(landingContent ? [landingContent.resources] : []),
    repository: keysOf(
      landingContent ? [landingContent.resources.repository] : [],
    ),
    globalStyles: keysOf([dashboard.globalStyles]),
    accessibility: keysOf([dashboard.globalStyles.accessibility]),
    panelColors: keysOf([dashboard.globalStyles.panelColors]),
  };
}

function keysOf(records) {
  return [...new Set(records.flatMap((record) => Object.keys(record)))]
    .toSorted();
}

function landing(dashboard) {
  return dashboard.pages.find((page) => page.landing).landing;
}

function pageById(dashboard, pageId) {
  return dashboard.pages.find(({ id }) => id === pageId);
}

function addAuthoredLandingFixture(dashboard) {
  const page = pageById(dashboard, "socio_economic");
  page.pageType = "landing";
  page.landing = {
    capabilities: [{
      number: "01",
      title: "Explore",
      description: "Review the authored dashboard content.",
    }],
    hero: {
      deliveryLabel: "Fixture",
      headline: "Authored landing fixture",
      summary: "A non-reserved landing page for semantic boundary coverage.",
      primaryAction: {
        label: "Open Biomedical",
        pageId: "biomedical",
      },
    },
    faq: {
      heading: "Questions",
      description: "Fixture questions for semantic coverage.",
      items: [
        { question: "What is covered?", answer: "Landing semantics." },
        { question: "Where does it lead?", answer: "Biomedical." },
      ],
    },
    resources: {
      heading: "Resources",
      description: "Fixture resources for semantic coverage.",
      repository: {
        label: "Repository",
        destination: "https://example.test/simex-dashboard",
      },
    },
  };
  return dashboard;
}

function addAuthoredChronoFixture(dashboard) {
  const chart = dashboard.pages
    .flatMap((page) => page.sections)
    .flatMap((section) => section.panels)
    .map((panel) => panel.chart ?? panel)
    .find(({ typeId, roles }) => typeId === "line" && roles.observation);
  assert.ok(chart, "semantic fixture needs a temporal line chart");
  dashboard.chronoGroups = [{
    id: "semantic-clock",
    name: "Semantic clock",
    period: { start: "2027-02-20", end: "2027-08-15" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{ chartId: chart.id, timeRole: "observation" }],
  }];
  return { chartId: chart.id, sourceId: chart.sourceId };
}

function configuredChart(dashboard, chartId) {
  return dashboard.pages
    .flatMap((page) => page.sections)
    .flatMap((section) => section.panels)
    .map((panel) => panel.chart ?? panel)
    .find(({ id }) => id === chartId);
}

function runtimeDashboard() {
  const chart = createChartDraft("line", {
    id: "runtime-line",
    title: "Runtime line",
    sourceId: "measurements",
    roles: {
      measurements: [{
        field: "value",
        interpretation: "number",
        axis: "primary",
      }],
      observation: {
        field: "date",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
        timezone: "date-only",
      },
    },
  });
  return {
    configVersion: 3,
    id: "runtime-dashboard",
    title: "Runtime dashboard",
    timezone: "UTC",
    dataSources: {
      measurements: {
        kind: "dataset",
        type: "uploadedCsv",
        fileName: "measurements.csv",
        csvText: "date,value\n2027-05-01,4\n2027-05-02,7\n",
        parsingMetadata: {
          date: {
            interpretation: "temporal",
            format: "YYYY-MM-DD",
            timezone: "date-only",
          },
        },
      },
    },
    chronoGroups: [{
      id: "runtime-clock",
      name: "Runtime clock",
      period: { start: "2027-05-01", end: "2027-05-02" },
      matching: { policy: "exact" },
      secondsPerFrame: 1,
      members: [{
        chartId: "runtime-line",
        timeRole: "observation",
      }],
    }],
    pages: [{
      id: "runtime-page",
      sections: [{
        id: "runtime-section",
        panels: [chart],
      }],
    }],
  };
}

function nodeSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
