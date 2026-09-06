import { enterAuthoredDashboard } from "./landingWorkflow.js";

const BUILD_MODE = "Build";
const DASHBOARD_MAP_PANEL_ID = "dashboard-map-panel";

export function dashboardMap(page) {
  return page.locator(`#${DASHBOARD_MAP_PANEL_ID}`);
}

export async function enterBuildMode(page) {
  await enterAuthoredDashboard(page);
  const build = page.getByLabel("Dashboard mode").getByRole("button", {
    name: BUILD_MODE,
    exact: true,
  });
  if (await build.getAttribute("aria-pressed") !== "true") await build.click();
  await page.locator("[data-canonical-mode='build']").waitFor({ state: "visible" });
}

export async function openDashboardMap(page) {
  const map = dashboardMap(page);
  if (!(await map.isVisible())) {
    await page.locator(`[aria-controls="${DASHBOARD_MAP_PANEL_ID}"]`).click();
  }
  await map.waitFor({ state: "visible" });
  return map;
}

export async function closeDashboardMap(page) {
  const map = dashboardMap(page);
  if (await map.isVisible()) {
    await page.locator(`[aria-controls="${DASHBOARD_MAP_PANEL_ID}"]`).click();
  }
  await map.waitFor({ state: "hidden" });
  return map;
}

export async function openSourceContent(page) {
  await enterBuildMode(page);
  await page.locator('[data-build-command-action="source-content"]').click();
  const workspace = page.getByRole("complementary", { name: "Source content authoring" });
  await workspace.waitFor({ state: "visible" });
  return workspace;
}
