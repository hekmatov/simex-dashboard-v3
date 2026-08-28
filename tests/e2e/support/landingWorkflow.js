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
