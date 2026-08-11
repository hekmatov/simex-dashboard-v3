import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  buildChartCatalogueSnapshot,
} from "../src/lib/quorumCatalogue.js";

const dashboard = JSON.parse(
  await readFile("public/config/dashboard.json", "utf8"),
);
const aliases = JSON.parse(
  await readFile("public/config/chart-aliases.json", "utf8"),
);
const output = await buildChartCatalogueSnapshot(
  dashboard,
  aliases,
  (bytes) => createHash("sha256").update(bytes).digest("hex"),
);

await mkdir("public/integration", { recursive: true });
await writeFile(
  "public/integration/quorum-chart-catalogue.json",
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);

console.log(
  `Wrote Quorum catalogue v${output.contract_version} with `
  + `${output.chart_types.length} chart type(s) and ${output.charts.length} configured chart(s).`,
);
