export const LANDING_CONTRACT = Object.freeze({
  headline: "SimEx Dashboard",
  primaryAction: "Open the dashboard",
  faqHeading: "Getting started with building",
  repositoryLink: "View the repository",
  issuesLink: "https://github.com/hekmatov/simex-dashboard-v3/issues",
});

export async function openLanding(page) {
  await page.goto("/");
  await page.getByRole("heading", { name: LANDING_CONTRACT.headline }).waitFor({ state: "visible" });
}

export async function openDashboardFromLanding(page) {
  await page.getByRole("button", { name: LANDING_CONTRACT.primaryAction }).click();
}

export async function enterAuthoredDashboard(page) {
  const modes = page.getByLabel("Dashboard mode");
  await modes.waitFor({ state: "visible" });
  const home = modes.getByRole("button", { name: "Home", exact: true });
  if (await home.getAttribute("aria-pressed") === "true") {
    await openDashboardFromLanding(page);
  }
}

export async function openDashboardPage(page, pageId) {
  await enterAuthoredDashboard(page);
  const modes = page.getByLabel("Dashboard mode");
  const view = modes.getByRole("button", { name: "View", exact: true });
  if (await view.getAttribute("aria-pressed") !== "true") {
    await view.click();
  }
  await page.locator(`[data-dashboard-page-id="${pageId}"]`).click();
}
