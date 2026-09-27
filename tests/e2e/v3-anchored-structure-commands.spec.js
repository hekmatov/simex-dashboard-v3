import { expect, test } from "@playwright/test";
import { choosePanelAction, chooseSectionAction, panelMenu, sectionMenu } from "./support/buildWorkflow.js";

import { enterAuthoredDashboard } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const MOVED_SECTION = Object.freeze({ id: "biomedical_section", title: "International Situation" });

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
  await expect(navigation.getByRole("button", { name: "Biomedical", exact: true }))
    .toHaveAttribute("aria-current", "page");
});

test("section and panel menus preserve command order, keyboard navigation, and their authoring owners", async ({ page }) => {
  const section = page.locator("[data-canonical-section-id]").first();
  const sectionId = await section.getAttribute("data-canonical-section-id");
  const title = await section.locator(".build-section-title-trigger").innerText();
  const sectionTrigger = sectionMenu(page, sectionId);
  await sectionTrigger.click();
  const sectionActions = page.locator(`[id="section-menu-${sectionId}"][role="menu"]`);
  await expect(sectionActions.getByRole("menuitem")).toHaveText([
    "Rename", "Move earlier", "Move later", "Move to Page…", "Merge…", "Remove…",
  ]);
  await expect(sectionActions.locator('[data-action-menu-item="move-earlier"]')).toBeDisabled();
  await expect(sectionActions.locator('[data-action-menu-item="rename"]')).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(sectionActions.locator('[data-action-menu-item="move-later"]')).toBeFocused();
  await page.keyboard.press("End");
  await expect(sectionActions.locator('[data-action-menu-item="remove"]')).toBeFocused();
  await page.keyboard.press("Home");
  await expect(sectionActions.locator('[data-action-menu-item="rename"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sectionActions).toHaveCount(0);
  await expect(sectionTrigger).toBeFocused();

  await chooseSectionAction(page, sectionId, "rename");
  await section.getByRole("textbox", { name: "Section title", exact: true }).fill(`${title} reviewed`);
  await page.keyboard.press("Enter");
  await expect(section.locator(".build-section-title-trigger")).toHaveText(`${title} reviewed`);
  await expect(page.locator('[data-pending-work-kind="layout"]')).toHaveAttribute("data-pending-work-state", "dirty");
  await page.getByRole("button", { name: "Discard Layout Changes", exact: true }).click();
  await expect(section.locator(".build-section-title-trigger")).toHaveText(title);

  const panel = section.locator("article[data-build-placement-id]").first();
  const placementId = await panel.getAttribute("data-build-placement-id");
  await panel.hover();
  const panelTrigger = panelMenu(page, placementId);
  await expect(panelTrigger).toHaveAttribute("draggable", "true");
  await panelTrigger.click();
  const panelActions = page.locator(`[id="panel-menu-${placementId}"][role="menu"]`);
  await expect(panelActions.getByRole("menuitem")).toHaveText([
    "Edit chart", "Move…", "Start section here", "Remove chart",
  ]);
  await expect(panelActions.locator(`[data-build-edit-for="${placementId}"]`)).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(panelTrigger).toBeFocused();
  await choosePanelAction(page, placementId, "edit");
  await expect(page.locator(".chart-quick-editor")).toBeVisible();
  await expect(panelActions).toHaveCount(0);
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
    const menu = form.closest(".build-page-action-menu");
    const styles = getComputedStyle(menu);
    return {
      menuBottom: menu.getBoundingClientRect().bottom,
      formBottom: form.getBoundingClientRect().bottom,
      scrollable: menu.scrollHeight > menu.clientHeight,
      maxHeight: styles.maxHeight,
      overflowY: styles.overflowY,
    };
  });
  expect(reachable.menuBottom).toBeLessThanOrEqual(720);
  expect(reachable.formBottom <= 720 || reachable.scrollable).toBe(true);
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
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();
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
  await renamedActions.getByLabel("Destination Page").selectOption("socio_economic");
  await expect(renamedActions.getByRole("region", { name: "Named consequences" }))
    .toContainText("International Confirmed Cases (Cumulative)");
  await renamedActions.getByLabel("I understand these named consequences.").check();
  await renamedActions.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(renamedActions).toHaveCount(0);
  await expect(renamed).toHaveCount(0);
  await expect(page.locator(".canonical-dashboard-frame"))
    .toHaveAttribute("data-canonical-page-id", "socio_economic");
  await expect(page.locator(`[data-canonical-section-id="${MOVED_SECTION.id}"]`)).toBeVisible();
});

test("Page actions retain the final-page protections", async ({ page }) => {
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await removePage(navigation, "Biomedical");
  await expect(navigation.getByRole("button", { name: "Biomedical", exact: true })).toHaveCount(0);
  await removePage(navigation, "Scenario");
  await expect(navigation.getByRole("button", { name: "Scenario", exact: true })).toHaveCount(0);

  const socioEconomic = navigation.getByRole("button", { name: "Socio-economic", exact: true });
  await expect(socioEconomic).toHaveAttribute("aria-current", "page");
  await expect(navigation.locator(".build-page-tab")).toHaveCount(1);
  await socioEconomic.click();
  const actions = navigation.getByRole("group", { name: "Socio-economic Page actions", exact: true });
  await expect(actions.getByRole("button", { name: "Merge", exact: true })).toBeDisabled();
  await expect(actions.getByRole("button", { name: "Remove", exact: true })).toBeDisabled();
});

test("anchored Section commands preview and discard through the live layout draft", async ({ page }) => {
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  const frame = page.locator(".canonical-dashboard-frame");
  const section = page.locator(`[data-canonical-section-id="${MOVED_SECTION.id}"]`);

  await chooseSectionAction(page, MOVED_SECTION.id, "move-page");
  const move = page.getByRole("dialog", { name: `move ${MOVED_SECTION.title}` });
  await move.getByLabel("Destination Page").selectOption("socio_economic");
  await expect(move.getByLabel("Destination Page")).toHaveValue("socio_economic");
  await expect(move.getByLabel("Placement")).toHaveValue("first");
  await expect(move.getByRole("region", { name: "Named consequences" }))
    .toContainText("International Confirmed Cases (Cumulative)");
  await expect(move.getByRole("region", { name: "Named consequences" }))
    .toContainText("Epidemiological Characteristics");
  await move.getByRole("button", { name: "Confirm" }).click();

  await expect(page.locator('[data-pending-work-kind="layout"]'))
    .toHaveAttribute("data-pending-work-state", "dirty");
  await expect(frame).toHaveAttribute("data-canonical-page-id", "biomedical");
  await expect(section).toHaveCount(0);
  const tree = page.getByRole("tree");
  await expect(tree.getByRole("treeitem", { name: "Socio-economic", exact: true })
    .getByRole("treeitem", { name: MOVED_SECTION.title, exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Discard Layout Changes" }).click();
  await expect(section).toBeVisible();
  await expect(tree.getByRole("treeitem", { name: "Biomedical", exact: true })
    .getByRole("treeitem", { name: MOVED_SECTION.title, exact: true })).toHaveCount(1);
  await navigation.getByRole("button", { name: "Socio-economic", exact: true }).click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "socio_economic");
  await expect(section).toHaveCount(0);
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "biomedical");
  await expect(section).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

async function removePage(navigation, name) {
  const tab = navigation.getByRole("button", { name, exact: true });
  if (await tab.getAttribute("aria-current") !== "page") await tab.click();
  await tab.click();
  const actions = navigation.getByRole("group", { name: `${name} Page actions`, exact: true });
  await actions.getByRole("button", { name: "Remove", exact: true }).click();
  await actions.getByLabel("I understand these named consequences.").check();
  await actions.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(actions).toHaveCount(0);
}
