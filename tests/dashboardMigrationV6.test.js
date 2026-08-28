import assert from "node:assert/strict";
import test from "node:test";

import {
  LEGACY_HOME_CONTENT_TITLE,
  isLegacyHomePage,
  migrateDashboardV5ToV6,
  normalizeDashboardHomePreference,
} from "../src/charting/config/migrateDashboardV5ToV6.js";
import {
  normalizeStoredDashboardConfig,
  validateDashboardConfig,
} from "../src/charting/config/dashboardBundleV3.js";
import { makeDashboardV5, makeDashboardV6 } from "./helpers/contentLibraryFixtures.js";

function ordinaryPage(id) {
  return {
    id,
    title: id,
    sections: [{ id: `${id}-section`, panels: [] }],
  };
}

function legacyHome({ sections = [] } = {}) {
  return {
    id: "home",
    label: "Home",
    title: "SimEx Dashboard",
    pageType: "landing",
    description: "Legacy homepage.",
    landing: { hero: { primaryAction: { pageId: "before" } } },
    sections,
  };
}

test("V5 reserved Home analytical sections migrate at the same index", () => {
  const overview = { id: "home-overview", title: "Overview", panels: [] };
  const source = makeDashboardV5({
    pages: [ordinaryPage("before"), legacyHome({ sections: [overview] }), ordinaryPage("after")],
    scenes: [{ id: "briefing", pageId: "home", chartIds: ["home-case-map"] }],
  });

  const migrated = migrateDashboardV5ToV6(source);

  assert.equal(migrated.configVersion, 6);
  assert.deepEqual(migrated.home, { enabled: true });
  assert.deepEqual(migrated.pages.map(({ id }) => id), ["before", "old-homepage-content", "after"]);
  assert.equal(migrated.pages[1].title, LEGACY_HOME_CONTENT_TITLE);
  assert.deepEqual(migrated.pages[1].sections, source.pages[1].sections);
  assert.equal(migrated.scenes[0].pageId, "old-homepage-content");
  assert.equal(source.pages[1].id, "home");
});

test("V5 Home migration suffixes collisions and remaps retained landing references", () => {
  const retainedLanding = {
    ...legacyHome({ sections: [{ id: "keep", panels: [] }] }),
    id: "showcase",
    landing: {
      hero: { primaryAction: { pageId: "home" } },
      domainRoutes: [{ pageId: "home" }],
    },
  };
  const migrated = migrateDashboardV5ToV6(makeDashboardV5({
    pages: [
      ordinaryPage("old-homepage-content"),
      { ...ordinaryPage("other"), title: "Old Homepage Content" },
      legacyHome({ sections: [{ id: "migrated", panels: [] }] }),
      retainedLanding,
    ],
  }));

  assert.deepEqual(migrated.pages.map(({ id, title }) => [id, title]), [
    ["old-homepage-content", "old-homepage-content"],
    ["other", "Old Homepage Content"],
    ["old-homepage-content-2", "Old Homepage Content 2"],
    ["showcase", "SimEx Dashboard"],
  ]);
  assert.equal(migrated.pages[3].landing.hero.primaryAction.pageId, "old-homepage-content-2");
  assert.equal(migrated.pages[3].landing.domainRoutes[0].pageId, "old-homepage-content-2");
});

test("V5 empty reserved Home is removed without a placeholder and non-reserved landing pages remain", () => {
  const retainedLanding = {
    ...legacyHome({ sections: [{ id: "retained", panels: [] }] }),
    id: "showcase",
  };
  const migrated = migrateDashboardV5ToV6(makeDashboardV5({
    pages: [legacyHome(), retainedLanding],
  }));

  assert.deepEqual(migrated.pages, [retainedLanding]);
  assert.equal(isLegacyHomePage(retainedLanding), false);
});

test("V6 rejects malformed explicit Home and repairs only false plus zero pages", () => {
  for (const home of [null, {}, { enabled: "false" }, { enabled: true, copy: {} }]) {
    assert.throws(() => validateDashboardConfig({ ...makeDashboardV6(), home }));
  }
  assert.deepEqual(
    normalizeStoredDashboardConfig({ ...makeDashboardV6(), pages: [], home: { enabled: false } }).home,
    { enabled: true },
  );
  assert.deepEqual(normalizeDashboardHomePreference({ enabled: false }, { ordinaryPageCount: 1 }), { enabled: false });
  assert.throws(() => normalizeDashboardHomePreference({ enabled: false, copy: {} }, { ordinaryPageCount: 0 }));
});

test("V6 rejects the reserved canonical Home page identity", () => {
  const dashboard = makeDashboardV6();
  dashboard.pages[0].id = "home";

  assert.throws(() => validateDashboardConfig(dashboard), /reserved.*home|home.*reserved/i);
});

test("V6 normalization is idempotent", () => {
  const source = makeDashboardV6();
  assert.deepEqual(migrateDashboardV5ToV6(migrateDashboardV5ToV6(source)), source);
});

test("V5 and V6 migration normalize partial content-library collections", () => {
  const v5 = makeDashboardV5();
  v5.contentLibrary = {};
  const v6 = makeDashboardV6();
  v6.contentLibrary = {};

  assert.deepEqual(migrateDashboardV5ToV6(v5).contentLibrary, {
    mediaItems: {},
    sourceEntries: {},
  });
  assert.deepEqual(migrateDashboardV5ToV6(v6).contentLibrary, {
    mediaItems: {},
    sourceEntries: {},
  });
});
