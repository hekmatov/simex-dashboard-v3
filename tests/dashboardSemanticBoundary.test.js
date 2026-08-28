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
    "description",
    "globalStyles",
    "home",
    "id",
    "lastUpdated",
    "layout",
    "pages",
    "programLabel",
    "scenarioLabel",
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
    "layout",
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
  assert.deepEqual(semanticDocument, {
    aliases,
    dashboard,
  });
});

test("every packaged dashboard structure family participates in the digest and stale match", async (t) => {
  const { dashboard, aliases } = await trackedInputs();
  addAuthoredLandingFixture(dashboard);
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
      [value.dashboard.pages[1], value.dashboard.pages[2]] =
        [value.dashboard.pages[2], value.dashboard.pages[1]];
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
      value.dashboard.dataSources.bio_cases.path =
        "data/biomedical/cases-revised.csv";
    },
    "time synchronization": (value) => {
      value.dashboard.chronoGroups[0].name += " alternate";
    },
    "chart semantics": (value) => {
      configuredChart(value.dashboard, "bio_confirmed_cases").title +=
        " alternate";
    },
    "alias semantics": (value) => {
      value.aliases.bio_confirmed_cases.aliases[0] += " alternate";
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
  const cases = {
    "unknown root field": (value) => {
      value.legacyDashboard = {};
    },
    "runtime loaded data at semantic root": (value) => {
      value.loadedData = {};
    },
    "runtime profiles at semantic root": (value) => {
      value.datasetProfiles = {};
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
  };

  for (const [name, mutate] of Object.entries(cases)) {
    await t.test(name, () => {
      const changed = structuredClone(dashboard);
      mutate(changed);
      assert.throws(
        () => buildChartCatalogue(changed, aliases),
        undefined,
        name,
      );
    });
  }
});

test("the producer rejects duplicate structural identities and broken landing references", async (t) => {
  const { dashboard, aliases } = await trackedInputs();
  addAuthoredLandingFixture(dashboard);
  const cases = {
    "duplicate page ID": (value) => {
      value.pages[2].id = value.pages[1].id;
    },
    "duplicate section ID in a page": (value) => {
      value.pages[1].sections[1].id = value.pages[1].sections[0].id;
    },
    "duplicate chart ID": (value) => {
      configuredChart(value, "bio_r_values").id = "bio_confirmed_cases";
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

  for (const [name, mutate] of Object.entries(cases)) {
    await t.test(name, () => {
      const changed = structuredClone(dashboard);
      mutate(changed);
      assert.throws(
        () => buildChartCatalogue(changed, aliases),
        undefined,
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
    "duplicate page ID": {
      mutate(value) {
        value.pages[2].id = value.pages[1].id;
      },
      error: /Duplicate dashboard page id "biomedical"\./,
    },
    "broken landing primary action reference": {
      mutate(value) {
        landing(value).hero.primaryAction.pageId = "missing-page";
      },
      error: /Landing primary action for page "old-homepage-content" references unknown page "missing-page"\./,
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
      assert.throws(
        () => validateDashboardConfig(changed),
        error,
        `${name} at bundle boundary`,
      );
      await assert.rejects(
        loadDashboardConfig(changed, profiles),
        error,
        `${name} at runtime loader boundary`,
      );
    });
  }
});

test("structural cycle guards allow shared non-cyclic references", async () => {
  const { dashboard, profiles } = await trackedInputs();
  addAuthoredLandingFixture(dashboard);
  const sharedFaqItem = landing(dashboard).faq.items[0];
  landing(dashboard).faq.items[1] = sharedFaqItem;
  dashboard.datasetProfiles = profiles;

  assert.doesNotThrow(() => validateDashboardConfig(dashboard));
  assert.doesNotThrow(() => normalizeDashboardSource(dashboard, profiles));
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
  const page = pageById(dashboard, "old-homepage-content");
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
