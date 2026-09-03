import { expect, test } from "@playwright/test";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ page, request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await request.post(`${CONTROL_URL}/__test__/catalogue-mode`, { data: { mode: "absent" } });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await enterAuthoredDashboard(page);
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.locator('button[data-dashboard-mode="build"]')).toBeVisible();
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await expect(navigation).toBeVisible();
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();
});

test("selected Page tab toggles its five-action menu while inactive Pages only navigate", async ({ page }) => {
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  const biomedical = navigation.getByRole("button", { name: "Biomedical", exact: true });
  const socioEconomic = navigation.getByRole("button", { name: "Socio-economic", exact: true });

  await socioEconomic.click();
  await expect(socioEconomic).toHaveAttribute("aria-current", "page");
  await expect(navigation.getByRole("group", { name: "Biomedical Page actions", exact: true })).toHaveCount(0);
  await socioEconomic.click();

  const actions = navigation.getByRole("group", { name: "Socio-economic Page actions", exact: true });
  await expect(actions).toBeVisible();
  await expect(actions.getByRole("button")).toHaveText(["Rename", "Move earlier", "Move later", "Merge", "Remove"]);
  await expect(navigation.getByRole("button", { name: /Page actions/ })).toHaveCount(0);
  await expect(page.getByLabel(/Page Orbit/)).toHaveCount(0);
  await expect(actions.getByRole("button", { name: /Edit Page/ })).toHaveCount(0);
  await socioEconomic.click();
  await expect(actions).toHaveCount(0);
  await socioEconomic.click();
  await expect(actions).toBeVisible();

  await biomedical.click();
  await expect(biomedical).toHaveAttribute("aria-current", "page");
  await expect(actions).toHaveCount(0);
  await biomedical.click();
  const biomedicalActions = navigation.getByRole("group", { name: "Biomedical Page actions", exact: true });
  await expect(biomedicalActions).toBeVisible();

  await biomedicalActions.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(biomedicalActions.locator(".build-page-command-form")).toBeVisible();
  await biomedicalActions.getByLabel("Page name").fill("Unsaved Biomedical name");
  await socioEconomic.click();
  await expect(biomedicalActions).toHaveCount(0);
  await expect(socioEconomic).toHaveAttribute("aria-current", "page");
  await socioEconomic.click();
  await expect(actions).toBeVisible();
  await expect(actions.locator(".build-page-command-form")).toHaveCount(0);
  await expect(actions.getByRole("button")).toHaveText(["Rename", "Move earlier", "Move later", "Merge", "Remove"]);

  await biomedical.click();
  await biomedical.click();
  await expect(biomedicalActions).toBeVisible();
  await biomedicalActions.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(biomedicalActions.locator(".build-page-command-form")).toBeVisible();
  await biomedicalActions.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(biomedicalActions.getByRole("button")).toHaveText(["Rename", "Move earlier", "Move later", "Merge", "Remove"]);

  await biomedicalActions.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(biomedicalActions.getByRole("button", { name: "Confirm", exact: true })).toBeDisabled();
  await biomedicalActions.getByLabel("I understand these named consequences.").check();
  await expect(biomedicalActions.getByRole("button", { name: "Confirm", exact: true })).toBeEnabled();
  const reachable = await biomedicalActions.locator(".build-page-command-form").evaluate((form) => {
    const styles = getComputedStyle(form.closest(".build-page-action-menu"));
    return {
      bottom: form.getBoundingClientRect().bottom,
      maxHeight: styles.maxHeight,
      overflowY: styles.overflowY,
    };
  });
  expect(reachable.bottom).toBeLessThanOrEqual(720);
  expect(reachable.maxHeight).not.toBe("none");
  expect(["auto", "scroll"]).toContain(reachable.overflowY);
  await biomedicalActions.getByRole("button", { name: "Cancel", exact: true }).click();

  await biomedicalActions.getByRole("button", { name: "Remove", exact: true }).click();
  await biomedicalActions.getByLabel("Content disposition").selectOption({ index: 1 });
  await biomedicalActions.getByLabel("I understand these named consequences.").check();
  await socioEconomic.click();
  await expect(biomedicalActions).toHaveCount(0);
  await biomedical.click();
  await biomedical.click();
  await biomedicalActions.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(biomedicalActions.getByLabel("Content disposition")).toHaveValue("delete-charts");
  await expect(biomedicalActions.getByLabel("I understand these named consequences.")).not.toBeChecked();
  await expect(biomedicalActions.getByRole("button", { name: "Confirm", exact: true })).toBeDisabled();
  await biomedicalActions.getByRole("button", { name: "Cancel", exact: true }).click();

  await biomedicalActions.getByRole("button", { name: "Move later", exact: true }).click();
  await expect(biomedicalActions).toHaveCount(0);
});

test("successful Page Rename and Merge confirmations close their in-menu forms", async ({ page }) => {
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  const actions = navigation.getByRole("group", { name: "Biomedical Page actions", exact: true });
  await expect(actions).toBeVisible();
  await actions.getByRole("button", { name: "Rename", exact: true }).click();
  await actions.getByLabel("Page name").fill("Epidemiological briefing");
  await actions.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(actions).toHaveCount(0);

  const renamed = navigation.getByRole("button", { name: "Epidemiological briefing", exact: true });
  await expect(renamed).toHaveAttribute("aria-current", "page");
  await renamed.click();
  const renamedActions = navigation.getByRole("group", { name: "Epidemiological briefing Page actions", exact: true });
  await renamedActions.getByRole("button", { name: "Merge", exact: true }).click();
  await expect(renamedActions.locator(".build-page-command-form")).toBeVisible();
  await renamedActions.getByLabel("I understand these named consequences.").check();
  await renamedActions.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(renamedActions).toHaveCount(0);
});

test("Page actions retain the final-page protections", async ({ page }) => {
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  const biomedicalActions = navigation.getByRole("group", { name: "Biomedical Page actions", exact: true });
  await expect(biomedicalActions).toBeVisible();
  await biomedicalActions.getByRole("button", { name: "Remove", exact: true }).click();
  await biomedicalActions.getByLabel("I understand these named consequences.").check();
  await biomedicalActions.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(biomedicalActions).toHaveCount(0);

  const socioEconomic = navigation.getByRole("button", { name: "Socio-economic", exact: true });
  await expect(socioEconomic).toHaveAttribute("aria-current", "page");
  await socioEconomic.click();
  const actions = navigation.getByRole("group", { name: "Socio-economic Page actions", exact: true });
  await expect(actions.getByRole("button", { name: "Merge", exact: true })).toBeDisabled();
  await expect(actions.getByRole("button", { name: "Remove", exact: true })).toBeDisabled();
});

test("anchored Section commands preview and discard through the live layout draft", async ({ page }) => {
  const navigation = page.locator('[data-build-page-navigation="anchored"]');

  await page.getByRole("button", { name: "Move Outbreak dynamics to Page" }).click();
  const move = page.getByRole("dialog", { name: "move Outbreak dynamics" });
  await expect(move.getByLabel("Destination Page")).toHaveValue("socio_economic");
  await expect(move.getByLabel("Placement")).toHaveValue("first");
  await expect(move.getByRole("region", { name: "Named consequences" })).toContainText("Confirmed cases");
  await expect(move.getByRole("region", { name: "Named consequences" })).toContainText("Municipal outbreak playback");
  await move.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByRole("button", { name: "Edit Section title: Outbreak dynamics" })).toHaveCount(0);
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await expect(page.locator('[data-pending-work-kind="layout"]'))
    .toHaveAttribute("data-pending-work-state", "dirty");
  await page.getByRole("button", { name: "Discard Layout Changes" }).click();
  await expect(page.getByRole("button", { name: "Edit Section title: Outbreak dynamics" })).toBeVisible();
  await navigation.getByRole("button", { name: "Socio-economic", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit Section title: Outbreak dynamics" })).toHaveCount(0);
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit Section title: Outbreak dynamics" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
