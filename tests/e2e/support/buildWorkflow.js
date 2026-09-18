import { enterAuthoredDashboard } from "./landingWorkflow.js";

const BUILD_MODE = "Build";

export async function enterBuildMode(page) {
  await enterAuthoredDashboard(page);
  const build = page.getByLabel("Dashboard mode").getByRole("button", {
    name: BUILD_MODE,
    exact: true,
  });
  if (await build.getAttribute("aria-pressed") !== "true") await build.click();
  await page.locator("[data-canonical-mode='build']").waitFor({ state: "visible" });
}



export async function openSourceContent(page) {
  await enterBuildMode(page);
  await page.locator('[data-build-command-action="source-content"]').click();
  const workspace = page.getByRole("complementary", { name: "Source content authoring" });
  await workspace.waitFor({ state: "visible" });
  return workspace;
}

export function structureRail(page) {
  return page.locator('[data-build-rail="structure"]');
}

export function propertiesPane(page) {
  return page.locator('[data-build-rail="properties"]');
}
