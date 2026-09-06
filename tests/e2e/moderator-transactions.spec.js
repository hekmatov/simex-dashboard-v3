import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";
import { openChartAuthoring } from "./support/chart-authoring-workflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1";

test.beforeEach(async ({ request, page }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await page.addInitScript((storageKey) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE_NON_QUOTA__ === true) {
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
        throw new Error("Dashboard persistence is temporarily unavailable.");
      }
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE_LONG__ === true) {
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
        throw new Error(`Dashboard persistence is unavailable: ${"x".repeat(600)}`);
      }
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE_ONCE__ === true) {
        globalThis.__SIMEX_FAIL_SAVE_ONCE__ = false;
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
        throw new DOMException("Storage full", "QuotaExceededError");
      }
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE__ === true) {
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
        throw new DOMException("Storage full", "QuotaExceededError");
      }
      if (key === storageKey) {
        globalThis.__SIMEX_SAVE_ATTEMPTS__ = (globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0) + 1;
      }
      return setItem.call(this, key, value);
    };
  }, STORAGE_KEY);
});

async function openDashboardEditMode(page) {
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build" }).click();
}

async function openFirstQuickChartEditor(page) {
  await openDashboardEditMode(page);
  await page.locator(".chart-panel").first()
    .getByRole("button", { name: "Edit chart" }).click();
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  return quick;
}

async function openFullChartEditorForPanel(page, panel) {
  await panel.hover();
  await panel.getByRole("button", { name: "Edit chart" }).click();
  const quick = page.locator(".chart-quick-editor");
  await expect(quick).toBeVisible();
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  const full = page.getByRole("dialog", { name: "Edit chart" });
  await expect(full).toBeVisible();
  return full;
}

async function openFirstFullChartEditor(page) {
  await openDashboardEditMode(page);
  return openFullChartEditorForPanel(page, page.locator(".chart-panel").first());
}

async function discardFullChartEditor(page, full, { confirmationExpected = false } = {}) {
  await full.getByRole("button", { name: "Discard changes", exact: true }).click();
  if (confirmationExpected) {
    await page.getByRole("dialog", { name: "Discard changes?" })
      .getByRole("button", { name: "Discard", exact: true }).click();
  }
  await expect(full).toHaveCount(0);
}

async function storedDashboard(page) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)), STORAGE_KEY);
}

test("rendered version-3 layouts drive desktop spans and a taller phone full panel", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const expected = [
    ["bio_current_cases_kpi", "standard", "span 2", "span 8", "0px"],
    ["bio_r_values", "standard", "span 2", "span 8", "0px"],
    ["bio_confirmed_cases", "wide", "span 4", "span 8", "0px"],
    ["bio_municipality_choropleth_animation", "full", "span 4", "span 16", "0px"],
  ];
  for (const [panelId, size, columnEnd, rowEnd, minHeight] of expected) {
    const panel = page.locator(`[data-panel-id="${panelId}"]`);
    await expect(panel).toHaveClass(new RegExp(`\\bchart-panel-${size}\\b`));
    const style = await panel.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        gridColumnStart: computed.gridColumnStart,
        gridRowStart: computed.gridRowStart,
        minHeight: computed.minHeight,
      };
    });
    expect(style).toEqual({
      gridColumnStart: columnEnd,
      gridRowStart: rowEnd,
      minHeight,
    });
  }

  const obsoleteRenderedClasses = await page.locator(".chart-panel").evaluateAll((panels) => (
    panels.flatMap((panel) => [...panel.classList])
      .filter((name) => /^chart-size-(half|normal|tall|large)$/.test(name))
  ));
  expect(obsoleteRenderedClasses).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  const phoneHeights = await page.evaluate(() => {
    const measure = (panelId) => {
      const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
      return Number.parseFloat(getComputedStyle(panel).minHeight);
    };
    return {
      standard: measure("bio_r_values"),
      full: measure("bio_municipality_choropleth_animation"),
    };
  });
  expect(phoneHeights.full).toBeGreaterThan(phoneHeights.standard);
  expect(phoneHeights.full).toBeGreaterThanOrEqual(420);
  expect(await page.evaluate(() => (
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ))).toBe(true);
});

test("edit-mode panel drag reorders through the memoized chart boundary", async ({ page }) => {
  await openDashboardEditMode(page);
  const panels = page.locator("article[data-build-placement-id]");
  const initial = await panels.evaluateAll((items) => items.slice(0, 2).map((item) => (
    item.getAttribute("data-build-placement-id")
  )));
  const source = page.locator(`article[data-build-placement-id="${initial[0]}"]`);
  const target = page.locator(`article[data-build-placement-id="${initial[1]}"]`);
  await expect(source).not.toHaveAttribute("draggable", "true");
  const moveHandle = source.locator("button.panel-move-handle");
  await expect(moveHandle).toHaveAttribute("draggable", "true");
  const targetBox = await target.boundingBox();
  expect(targetBox).toBeTruthy();

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await moveHandle.dispatchEvent("dragstart", { dataTransfer });
  const payload = await dataTransfer.evaluate((transfer) => (
    transfer.getData("application/x-simex-build-layout-move+json")
  ));
  expect(payload).not.toBe("");
  expect(() => JSON.parse(payload)).not.toThrow();
  await expect(source).toHaveClass(/\bdragging\b/);
  const pointer = {
    clientX: targetBox.x + targetBox.width / 2,
    clientY: targetBox.y + targetBox.height * 0.75,
    dataTransfer,
  };
  await target.dispatchEvent("dragover", pointer);
  await expect(target).toHaveClass(/\bdrag-target\b/);
  await target.dispatchEvent("drop", pointer);
  await moveHandle.dispatchEvent("dragend", { dataTransfer });

  await expect.poll(() => panels.evaluateAll((items) => items.slice(0, 2).map((item) => (
    item.getAttribute("data-build-placement-id")
  )))).toEqual([initial[1], initial[0]]);
});

async function armPendingChartDismissal(page, dismissal) {
  await page.evaluate((kind) => {
    globalThis.__SIMEX_PENDING_DISMISSAL__ = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error("Chart save never entered its pending state.")),
        10_000,
      );
      const inspect = () => {
        const editor = document.querySelector(".chart-wizard-v3");
        const saving = editor?.querySelector('button[aria-label="Saving changes"]');
        if (!saving) return;
        clearTimeout(timeoutId);
        observer.disconnect();
        if (kind === "Escape") {
          document.dispatchEvent(new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "Escape",
          }));
        } else {
          document.querySelector(".chart-wizard-backdrop")?.dispatchEvent(
            new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
          );
        }
        resolve({
          editorConnected: editor.isConnected
            && document.querySelector(".chart-wizard-v3") === editor,
          savingDisabled: saving.matches(":disabled"),
        });
      };
      const observer = new MutationObserver(inspect);
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
      inspect();
    });
  }, dismissal);
}

async function armWizardPendingObservation(page) {
  await page.evaluate(() => {
    globalThis.__SIMEX_WIZARD_PENDING_OBSERVATION__ = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error("Chart creation never entered its pending state.")),
        10_000,
      );
      const inspect = () => {
        const wizard = document.querySelector(".chart-wizard-backdrop");
        const creating = wizard?.querySelector('button[aria-label="Creating chart"]');
        if (!creating) return;
        clearTimeout(timeoutId);
        observer.disconnect();
        const discard = [...document.querySelectorAll('[role="dialog"]')]
          .find((dialog) => dialog.getAttribute("aria-labelledby")
            ?.includes("discard-chart"));
        const discardButtons = [...(discard?.querySelectorAll("button") ?? [])];
        resolve({
          creatingDisabled: creating.matches(":disabled"),
          closeDisabled: wizard.querySelector('button[aria-label="Close"]')
            ?.matches(":disabled") ?? false,
          discardVisible: Boolean(discard),
          discardButtonsDisabled: discardButtons.length === 2
            && discardButtons.every((button) => button.matches(":disabled")),
        });
      };
      const observer = new MutationObserver(inspect);
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
      inspect();
    });
  });
}

async function preparePieWizard(page, title) {
  const flow = await openChartAuthoring(page);
  const { wizard } = flow;
  await flow.selectExistingSource("Biomedical mortality by age");
  await flow.chooseChartType("pie", /^Pie\b/i);
  await flow.goToMapAndPrepare();
  await flow.selectRole("category", "Age group");
  await flow.selectRole("value", "deaths");
  await flow.goToConfigure();
  await expect(wizard.locator(".chart-authoring-preview-ready")).toBeVisible();
  await wizard.getByRole("textbox", { name: "Chart title", exact: true }).fill(title);
  await flow.goToReview();
  await expect(wizard.getByRole("button", { name: "Create chart" })).toBeEnabled();
  return wizard;
}

test("queued dashboard mutation survives final edit-session save", async ({ page }) => {
  test.setTimeout(120_000);
  await openDashboardEditMode(page);
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  const createDialog = page.getByRole("dialog", { name: "Create Page" });
  await createDialog.getByLabel("Page name").fill("New page");
  const actionState = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")];
    const addPage = buttons.find((button) => button.textContent?.trim() === "Add page");
    const createPage = buttons.find((button) => button.textContent?.trim() === "Create page");
    const finish = buttons.find((button) => button.textContent?.trim() === "Finish Build");
    const state = {
      addDisabled: addPage.matches(":disabled"),
      createDisabled: createPage.matches(":disabled"),
      finishDisabled: finish.matches(":disabled"),
    };
    createPage.click();
    finish.click();
    return state;
  });
  await expect(page.getByRole("button", { name: "Build", exact: true })).toBeEnabled();

  const saved = await storedDashboard(page);
  const attempts = await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0);
  expect({ actionState, attempts }).toEqual({
    actionState: {
      addDisabled: false,
      createDisabled: false,
      finishDisabled: false,
    },
    attempts: 1,
  });
  expect(saved.pages.map(({ label }) => label)).toContain("New page");
  await page.reload();
  await expect(page.getByRole("button", { name: "New page", exact: true }))
    .toBeVisible();
});

test("chart save preserves session work when browser storage is full", async ({ page }) => {
  const editor = await openFirstFullChartEditor(page);
  const title = "Session fallback chart title";
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  await editor.getByRole("textbox", { name: "Chart title", exact: true }).fill(title);
  await editor.getByRole("button", { name: /^Review\./ }).click();
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Browser storage is full" }))
    .toBeVisible();
  await expect(page.getByLabel(`${title} actions`)).toBeVisible();
  const durable = await storedDashboard(page);
  expect((durable?.pages ?? []).flatMap(({ sections }) => sections)
    .flatMap(({ panels }) => panels)
    .some((panel) => panel.title === title)).toBe(false);

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
});

for (const dismissal of ["Escape", "backdrop"]) {
  test(`chart modal ignores ${dismissal} while save is pending`, async ({ page }) => {
    test.setTimeout(90_000);
    const editor = await openFirstFullChartEditor(page);
    await editor.getByRole("button", { name: /^Configure\./ }).click();
    await editor.getByRole("textbox", { name: "Chart title", exact: true }).fill(`Pending ${dismissal} save`);
    await editor.getByRole("button", { name: /^Review\./ }).click();
    await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
    await armPendingChartDismissal(page, dismissal);
    await editor.getByRole("button", { name: "Save changes", exact: true }).click();
    expect(await page.evaluate(() => globalThis.__SIMEX_PENDING_DISMISSAL__)).toEqual({
      editorConnected: true,
      savingDisabled: true,
    });
    await expect(editor).toBeHidden();
    await expect(page.getByRole("status").filter({ hasText: "Browser storage is full" }))
      .toBeVisible();
    await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  });
}

test("chart removal preserves session work when browser storage is full", async ({ page }) => {
  test.setTimeout(120_000);
  const quick = await openFirstQuickChartEditor(page);
  const removedPanelId = await page.locator(".chart-panel").first()
    .getAttribute("data-panel-id");
  const durableBefore = await storedDashboard(page);
  await quick.getByRole("button", { name: "Remove chart" }).click();
  const confirmation = page.getByRole("dialog", { name: "Remove this chart?" });
  await expect(confirmation).toBeVisible();

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await confirmation.getByRole("button", { name: "Remove chart" }).click();
  await expect(confirmation).toBeHidden();
  await expect(quick).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Browser storage is full" }))
    .toBeVisible();
  await expect(page.locator(`[data-panel-id="${removedPanelId}"]`)).toHaveCount(0);

  const durable = await storedDashboard(page);
  expect(durable).toEqual(durableBefore);

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
});

test("non-quota chart removal preserves session work with a bounded fallback", async ({ page }) => {
  test.setTimeout(120_000);
  const quick = await openFirstQuickChartEditor(page);
  const removedPanelId = await page.locator(".chart-panel").first()
    .getAttribute("data-panel-id");
  const durableBefore = await storedDashboard(page);
  await quick.getByRole("button", { name: "Remove chart" }).click();
  const confirmation = page.getByRole("dialog", { name: "Remove this chart?" });
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE_NON_QUOTA__ = true; });
  await confirmation.getByRole("button", { name: "Remove chart" }).click();

  await expect(confirmation).toBeHidden();
  await expect(quick).toBeHidden();
  await expect(page.getByRole("status").filter({
    hasText: "Dashboard changes are applied for this session but cannot be retained after reload.",
  })).toBeVisible();
  await expect(page.locator(`[data-panel-id="${removedPanelId}"]`)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Dashboard configuration error" }))
    .toHaveCount(0);

  const durable = await storedDashboard(page);
  expect(durable).toEqual(durableBefore);

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE_NON_QUOTA__ = false; });
});

test("timer-owned pending edit uses the bounded session fallback", async ({ page }) => {
  await openDashboardEditMode(page);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE_LONG__ = true; });
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await map.getByLabel("Page title", { exact: true }).fill("Timer-owned failed edit");

  const status = page.getByRole("status").filter({
    hasText: "Dashboard changes are applied for this session but cannot be retained after reload.",
  });
  await expect(status).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timer-owned failed edit", exact: true }))
    .toBeVisible();
  const message = await status.textContent();
  expect(message.length).toBeLessThanOrEqual(240);
  expect(await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0))
    .toBeGreaterThan(0);
});

test("clean Full discard publishes neither persistence nor fallback", async ({ page }) => {
  const editor = await openFirstFullChartEditor(page);
  const durableBefore = await storedDashboard(page);
  const attemptsBeforeDiscard = await page.evaluate(() => (
    globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0
  ));
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE_NON_QUOTA__ = true; });
  await discardFullChartEditor(page, editor);

  await expect(editor).toBeHidden();
  await expect(page.getByRole("status").filter({
    hasText: "Dashboard changes are applied for this session but cannot be retained after reload.",
  })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Dashboard configuration error" }))
    .toHaveCount(0);
  expect(await storedDashboard(page)).toEqual(durableBefore);
  expect(await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0))
    .toBe(attemptsBeforeDiscard);
});

test("removal followed by another clean Full discard does not resurrect the chart", async ({ page }) => {
  test.setTimeout(120_000);
  const quick = await openFirstQuickChartEditor(page);
  const removedPanelId = await page.locator(".chart-panel").first()
    .getAttribute("data-panel-id");
  const initialPanelCount = await page.locator(".chart-panel").count();

  await quick.getByRole("button", { name: "Remove chart" }).click();
  await page.getByRole("dialog", { name: "Remove this chart?" })
    .getByRole("button", { name: "Remove chart" }).click();
  await expect(quick).toBeHidden();
  await expect(page.locator(".chart-panel")).toHaveCount(initialPanelCount - 1);

  const editor = await openFullChartEditorForPanel(page, page.locator(".chart-panel").first());
  const attemptsBeforeDiscard = await page.evaluate(() => (
    globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0
  ));
  await discardFullChartEditor(page, editor);
  expect(await page.evaluate(() => (
    globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0
  ))).toBe(attemptsBeforeDiscard);

  const saved = await storedDashboard(page);
  const panelIds = saved.pages.flatMap(({ sections }) => (
    sections.flatMap(({ panels }) => panels.map(({ id }) => id))
  ));
  const synchronizedChartIds = (saved.chronoGroups ?? []).flatMap(({ members }) => (
    members.map(({ chartId }) => chartId)
  ));
  expect(panelIds).not.toContain(removedPanelId);
  expect(synchronizedChartIds).not.toContain(removedPanelId);

  await page.reload();
  await expect(page.locator(`[data-panel-id="${removedPanelId}"]`)).toHaveCount(0);
});

test("reset completes with session fallback when browser storage is full", async ({ page }) => {
  test.setTimeout(120_000);
  await openDashboardEditMode(page);
  const baselineTitle = (await page.locator(".dashboard-brand-block h1").textContent()).trim();
  const durableBefore = await storedDashboard(page);
  const editedLabel = "Draft retained after reset failure";
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  const pageTitleInput = map.getByLabel("Page title", { exact: true });
  await pageTitleInput.fill(editedLabel);
  await page.locator(".build-command-header")
    .getByRole("button", { name: "Discard Build changes", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Discard Build changes?" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Discard Build changes", exact: true })
    .evaluate((button) => {
      globalThis.__SIMEX_FAIL_SAVE_ONCE__ = true;
      button.click();
    });

  await expect(confirmation).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Browser storage is full" }))
    .toBeVisible();
  await expect(page.getByRole("button", { name: "View", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".dashboard-brand-block h1")).toHaveText(baselineTitle);
  expect(await storedDashboard(page)).toEqual(durableBefore);
});

test("successful reset clears renderer drafts and preserves the chart baseline", async ({ page }) => {
  test.setTimeout(120_000);
  await openDashboardEditMode(page);
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  const pageTitleInput = map.getByLabel("Page title", { exact: true });
  const pageTitle = await pageTitleInput.inputValue();
  await pageTitleInput.fill("Reset-only page draft");
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  await page.getByRole("button", { name: /^Edit Section title:/ }).first().click();
  const sectionTitleInput = page.getByLabel("Section title", { exact: true }).first();
  const baseline = {
    pageTitle,
    sectionTitle: await sectionTitleInput.inputValue(),
  };
  await sectionTitleInput.fill("Reset-only section draft");
  await sectionTitleInput.press("Enter");
  await expect(page.getByRole("button", {
    name: "Edit Section title: Reset-only section draft",
    exact: true,
  }))
    .toBeVisible();
  let editor = await openFullChartEditorForPanel(page, page.locator(".chart-panel").first());
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  const chartTitle = editor.getByRole("textbox", { name: "Chart title", exact: true });
  const baselineChartTitle = await chartTitle.inputValue();
  await discardFullChartEditor(page, editor);
  await expect(page.getByRole("navigation", { name: "Pending Build work" })
    .getByText("Chart changes", { exact: true })).toHaveCount(0);

  await page.locator(".build-command-header")
    .getByRole("button", { name: "Discard Build changes", exact: true }).click();
  await page.getByRole("dialog", { name: "Discard Build changes?" })
    .getByRole("button", { name: "Discard Build changes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Build" })).toBeVisible();
  await expect(page.locator(".dashboard-brand-block h1")).toHaveText(baseline.pageTitle);
  await expect(page.getByRole("heading", { name: baseline.sectionTitle, exact: true }))
    .toBeVisible();

  await page.getByRole("button", { name: "Build" }).click();
  await expect(page.getByRole("navigation", { name: "Pending Build work" })).toHaveCount(0);
  const attemptsBeforeDiscard = await page.evaluate(() => (
    globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0
  ));
  editor = await openFullChartEditorForPanel(page, page.locator(".chart-panel").first());
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  await expect(editor.getByRole("textbox", { name: "Chart title", exact: true })).toHaveValue(baselineChartTitle);
  await discardFullChartEditor(page, editor);
  expect(await page.evaluate(() => (
    globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0
  ))).toBe(attemptsBeforeDiscard);

  await page.reload();
  await openDashboardPage(page, "biomedical");
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.getByRole("heading", { name: baseline.pageTitle, exact: true }))
    .toBeVisible();
  await expect(page.getByRole("button", {
    name: `Edit Section title: ${baseline.sectionTitle}`,
    exact: true,
  }))
    .toBeVisible();
  editor = await openFullChartEditorForPanel(page, page.locator(".chart-panel").first());
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  await expect(editor.getByRole("textbox", { name: "Chart title", exact: true })).toHaveValue(baselineChartTitle);
  await discardFullChartEditor(page, editor);
});

test("wizard create transaction coalesces, locks dismissal, and preserves session work when storage is full", async ({ page }) => {
  test.setTimeout(240_000);
  await openDashboardEditMode(page);
  const title = "Retried transaction chart";
  const wizard = await preparePieWizard(page, title);
  await wizard.getByRole("button", { name: "Discard chart draft" }).click();
  const discard = page.getByRole("dialog", { name: "Discard chart?" });
  await expect(discard).toBeVisible();

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await armWizardPendingObservation(page);
  await page.evaluate(() => {
    const create = document.querySelector(
      '.chart-wizard-backdrop button[aria-label="Create chart"]',
    );
    create.click();
    create.click();
    document.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Escape",
    }));
  });
  const pending = await page.evaluate(() => globalThis.__SIMEX_WIZARD_PENDING_OBSERVATION__);
  await expect(page.getByRole("status").filter({ hasText: "Browser storage is full" }))
    .toBeVisible();
  expect(await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0)).toBe(1);
  expect(pending).toEqual({
    creatingDisabled: true,
    closeDisabled: true,
    discardVisible: true,
    discardButtonsDisabled: true,
  });

  await expect(wizard).toBeHidden();
  await expect(discard).toHaveCount(0);
  await expect(page.getByLabel(`${title} actions`)).toBeVisible();
  const durable = await storedDashboard(page);
  expect((durable?.pages ?? []).flatMap(({ sections }) => sections)
    .flatMap(({ panels }) => panels)
    .some((panel) => panel.title === title && panel.typeId === "pie"))
    .toBe(false);
});

test("edit-session save and reset use session fallback when storage is full", async ({ page }) => {
  await openDashboardEditMode(page);
  const sessionTitle = "Unsaved exercise label";
  await page.getByRole("button", { name: "Dashboard map", exact: true }).click();
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await map.getByRole("treeitem", { name: "Biomedical", exact: true }).click();
  await map.getByLabel("Page title", { exact: true }).fill(sessionTitle);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE_ONCE__ = true; });
  await page.getByRole("button", { name: "Finish Build", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Browser storage is full" }))
    .toBeVisible();
  await expect(page.locator(".dashboard-brand-block h1")).toHaveText(sessionTitle);

  await page.getByRole("button", { name: "Build", exact: true }).click();
  const sectionTitleTrigger = page.getByRole("button", { name: /^Edit Section title:/ }).first();
  const sectionTitle = (await sectionTitleTrigger.textContent()).trim();
  await sectionTitleTrigger.click();
  await page.getByLabel("Section title", { exact: true }).first()
    .fill("Reset-only pending title");
  await page.locator(".build-command-header")
    .getByRole("button", { name: "Discard Build changes", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Discard Build changes?" });
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE_ONCE__ = true; });
  await confirmation.getByRole("button", { name: "Discard Build changes", exact: true }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByRole("button", { name: "View", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".dashboard-brand-block h1")).toHaveText(sessionTitle);
  await expect(page.getByRole("heading", { name: sectionTitle, exact: true }))
    .toBeVisible();
});

test("final Build remains locked until dirty chart edit context resolves", async ({ page }) => {
  const editor = await openFirstFullChartEditor(page);
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  await editor.getByRole("textbox", { name: "Chart title", exact: true }).fill("Finish-locked chart draft");
  const finishBuild = page.getByRole("button", { name: "Finish Build", exact: true });
  await expect(finishBuild).toBeDisabled();
  await expect(editor).toBeVisible();
  await expect(editor.getByRole("button", { name: "Discard changes", exact: true })).toBeVisible();

  const attemptsBeforeDiscard = await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0);
  await discardFullChartEditor(page, editor, { confirmationExpected: true });
  await expect(editor).toBeHidden();
  await expect(finishBuild).toBeEnabled();
  expect(await page.evaluate(() => globalThis.__SIMEX_SAVE_ATTEMPTS__ ?? 0))
    .toBe(attemptsBeforeDiscard);
});
