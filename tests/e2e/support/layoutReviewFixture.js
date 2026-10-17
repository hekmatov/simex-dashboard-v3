import { SHIPPED_CASE_CHART_ID } from "./importedProfileFixture.js";

export const WRAPPED_CASE_PLACEMENT_ID = "wrapped-national-cases-placement";
export const OTHER_BIOMEDICAL_CHART_ID = "chart-line-mtgytrwj";
export const RETAINED_SOCIO_CHART_ID = "chart-line-a01a017d-96f1-440b-b24a-bcf2e30da1cc";
export const REMOVED_PAGE_GROUP_ID = "page-removal-biomedical-group";
export const RETAINED_PAGE_GROUP_ID = "page-removal-socio-group";

export function withWrappedCasesPanel(dashboard) {
  const fixture = structuredClone(dashboard);
  const page = fixture.pages.find(({ id }) => id === "biomedical");
  const section = page.sections.find(({ panels }) => panels.some(({ id }) => (
    id === SHIPPED_CASE_CHART_ID
  )));
  const index = section.panels.findIndex(({ id }) => id === SHIPPED_CASE_CHART_ID);
  section.panels[index] = {
    id: WRAPPED_CASE_PLACEMENT_ID,
    chart: section.panels[index],
  };
  return fixture;
}

export function withPageRemovalGroups(dashboard) {
  const fixture = structuredClone(dashboard);
  const actualIds = new Set(fixture.pages.flatMap(({ sections }) => sections.flatMap(({ panels }) => panels.map((panel) => (panel.chart ?? panel).id))));
  const historical = actualIds.has(SHIPPED_CASE_CHART_ID);
  fixture.chronoGroups = [
    {
      id: REMOVED_PAGE_GROUP_ID,
      name: "Biomedical page group",
      period: { start: "2027-02-14", end: "2027-02-21" },
      matching: { policy: "exact" },
      secondsPerFrame: 1,
      members: [
        { chartId: historical ? SHIPPED_CASE_CHART_ID : "bio_confirmed_cases", timeRole: "observation" },
        { chartId: historical ? OTHER_BIOMEDICAL_CHART_ID : "bio_daily_cases_bar", timeRole: "observation" },
      ],
    },
    {
      id: RETAINED_PAGE_GROUP_ID,
      name: "Socio-economic page group",
      period: { start: "2021-01-01", end: "2027-12-31" },
      matching: { policy: "exact" },
      secondsPerFrame: 1,
      members: [{ chartId: historical ? RETAINED_SOCIO_CHART_ID : "socio_trust_trend", timeRole: "observation" }],
    },
  ];
  return fixture;
}

export async function installPageRemovalGroups(page) {
  const response = await page.request.get("http://127.0.0.1:4173/config/dashboard.json");
  if (!response.ok()) throw new Error(`Dashboard fixture request failed: ${response.status()}`);
  const fixture = withPageRemovalGroups(await response.json());
  await page.addInitScript((dashboard) => {
    localStorage.setItem("simex-dashboard-config-v3-three-mode-v1", JSON.stringify(dashboard));
  }, fixture);
}
