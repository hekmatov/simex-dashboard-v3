import { expect, test } from "@playwright/test";

async function openBuildStructure(page) {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto("/");
  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
  await page.getByLabel("Dashboard mode")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await page.getByRole("button", { name: "Build panel", exact: true }).click();
  await expect(page.getByRole("tree")).toBeVisible();
}

test("cross-page tree selection reveals the canonical target before opening Unit Orbit", async ({ page }) => {
  await openBuildStructure(page);
  const frame = page.locator(".canonical-dashboard-frame");
  const tree = page.getByRole("tree");

  await tree.getByRole("treeitem", { name: "Public response and policy signals", exact: true }).click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "socio_economic");
  const section = page.locator('[data-canonical-section-id="public_response"]');
  await expect(section).toBeInViewport();

  await page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Biomedical", exact: true })
    .click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "biomedical");

  await tree.getByRole("treeitem", { name: "Risk perception over time", exact: true }).click();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "socio_economic");
  const chart = page.locator('[data-canonical-placement-id="socio_risk_perception"]');
  await expect(chart).toBeVisible();
  await expect(chart).toBeInViewport();
  await expect(page.getByRole("complementary", { name: "Chart settings for Risk perception over time" }))
    .toBeVisible();
  await expect(page.getByText(
    "Finish or cancel the open chart editor before changing Page.", { exact: true },
  )).toHaveCount(0);
});

test("double-click rename navigates and highlights without opening Unit Orbit", async ({ page }) => {
  await openBuildStructure(page);
  const frame = page.locator(".canonical-dashboard-frame");
  const tree = page.getByRole("tree");
  const target = tree.getByRole("treeitem", { name: "Trust and wellbeing", exact: true });

  await target.dblclick();
  await expect(frame).toHaveAttribute("data-canonical-page-id", "socio_economic");
  await expect(page.locator('[data-canonical-section-id="trust_wellbeing"]')).toBeInViewport();
  const rename = tree.getByRole("textbox", { name: "Rename section Trust and wellbeing" });
  await expect(rename).toBeFocused();
  await expect(rename.locator("xpath=.." )).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".unit-orbit")).toHaveCount(0);
});

test("double-click rename persists complete Page Section and Chart owner updates", async ({ page }) => {
  await openBuildStructure(page);
  const tree = page.getByRole("tree");

  await tree.getByRole("treeitem", { name: "Socio-economic", exact: true }).dblclick();
  const pageRename = tree.getByRole("textbox", { name: "Rename page Socio-economic" });
  await pageRename.fill("Community response");
  await pageRename.press("Enter");
  await expect(tree.getByRole("treeitem", { name: "Community response", exact: true })).toBeVisible();
  await expect(page.locator(".dashboard-command-page-scroller")
    .getByRole("button", { name: "Community response", exact: true })).toBeVisible();

  await tree.getByRole("treeitem", { name: "Public response and policy signals", exact: true }).dblclick();
  const sectionRename = tree.getByRole("textbox", {
    name: "Rename section Public response and policy signals",
  });
  await sectionRename.fill("Public response signals");
  await sectionRename.press("Enter");
  await expect(tree.getByRole("treeitem", { name: "Public response signals", exact: true })).toBeVisible();
  await expect(page.locator('[data-canonical-section-id="public_response"] h2'))
    .toHaveText("Public response signals");

  await tree.getByRole("treeitem", { name: "Risk perception over time", exact: true }).dblclick();
  const chartRename = tree.getByRole("textbox", {
    name: "Rename chart Risk perception over time",
  });
  await chartRename.fill("Risk perception trend");
  await chartRename.press("Enter");
  await expect(tree.getByRole("treeitem", { name: "Risk perception trend", exact: true })).toBeVisible();
  await expect(page.locator('[data-canonical-placement-id="socio_risk_perception"] .panel-actions'))
    .toHaveAttribute("aria-label", "Risk perception trend actions");
  await expect(page.locator(".unit-orbit")).toHaveCount(0);
});

test("chart activation acknowledges the canonical reveal before mounting Unit Orbit", async ({ page }) => {
  await openBuildStructure(page);
  await page.evaluate(() => {
    globalThis.__task3ActivationOrder = [];
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function task3ScrollIntoView(...args) {
      if (this.getAttribute?.("data-canonical-placement-id") === "socio_risk_perception") {
        globalThis.__task3ActivationOrder.push("reveal");
      }
      return scrollIntoView?.apply(this, args);
    };
    const observer = new MutationObserver(() => {
      if (
        document.querySelector(".unit-orbit")
        && !globalThis.__task3ActivationOrder.includes("orbit")
      ) globalThis.__task3ActivationOrder.push("orbit");
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  await page.getByRole("tree")
    .getByRole("treeitem", { name: "Risk perception over time", exact: true })
    .click();
  await expect(page.locator(".unit-orbit")).toBeVisible();
  const order = await page.evaluate(() => globalThis.__task3ActivationOrder);
  expect(order).toContain("reveal");
  expect(order).toContain("orbit");
  expect(order.indexOf("reveal")).toBeLessThan(order.indexOf("orbit"));
});

test("an untouched chart editor closes transactionally when tree navigation changes target", async ({ page }) => {
  await openBuildStructure(page);
  const tree = page.getByRole("tree");
  await tree.getByRole("treeitem", { name: "Risk perception over time", exact: true }).click();
  await expect(page.locator(".unit-orbit")).toBeVisible();

  await tree.getByRole("treeitem", { name: "Public response and policy signals", exact: true }).click();
  await expect(page.locator('[data-canonical-section-id="public_response"]')).toBeInViewport();
  await expect(page.locator(".unit-orbit")).toHaveCount(0);
  await expect(page.getByText(
    "Finish or cancel the open chart editor before changing Page.", { exact: true },
  )).toHaveCount(0);
});

test("a rejected delayed Page rename retains the inline value for retry", async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function rejectTask3Rename(key, value) {
      if (key === "simex-dashboard-config-v3-three-mode-v1") {
        throw new DOMException("Storage full", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    };
  });
  await openBuildStructure(page);
  const tree = page.getByRole("tree");
  await tree.getByRole("treeitem", { name: "Socio-economic", exact: true }).dblclick();
  const rename = tree.getByRole("textbox", { name: "Rename page Socio-economic" });
  await rename.fill("Rejected rename");
  await rename.press("Enter");

  await expect(rename).toBeVisible();
  await expect(rename).toHaveValue("Rejected rename");
});
