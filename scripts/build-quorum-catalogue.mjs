import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildChartCatalogue,
  canonicalCatalogueBytes,
} from "../src/lib/quorumCatalogue.js";

const dashboard = JSON.parse(
  await readFile("public/config/dashboard.json", "utf8"),
);
const aliases = JSON.parse(
  await readFile("public/config/chart-aliases.json", "utf8"),
);
const catalogue = buildChartCatalogue(dashboard, aliases);
const digest = createHash("sha256")
  .update(canonicalCatalogueBytes(catalogue))
  .digest("hex");
const output = { ...catalogue, digest };

await mkdir("public/integration", { recursive: true });
await writeFile(
  "public/integration/quorum-chart-catalogue.json",
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);

console.log(
  `Wrote public/integration/quorum-chart-catalogue.json with ${output.charts.length} chart(s).`,
);
