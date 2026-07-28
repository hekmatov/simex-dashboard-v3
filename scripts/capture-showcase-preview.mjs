import { chromium } from "@playwright/test";
import { resolve } from "node:path";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4175";
const outputPath = resolve("public/assets/showcase-dashboard-preview.png");
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  const section = page.locator(".dashboard-section").first();
  await section.scrollIntoViewIfNeeded();
  await section.locator(".chart-panel").first().waitFor({ state: "visible" });
  const box = await section.boundingBox();
  if (!box) {
    throw new Error("Could not locate the biomedical dashboard section.");
  }
  await page.screenshot({
    path: outputPath,
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.min(box.width, 1280),
      height: Math.min(box.height, 720),
    },
  });
  console.log(`Captured ${outputPath}`);
} finally {
  await browser.close();
}
