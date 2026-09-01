import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const boundaryModule = await import(
  "../scripts/check-v3-runtime-boundaries.mjs"
).catch(() => null);

const EXPECTED_QUORUM_CONTRACT_HASH =
  "a876d0b83c9f40ea5179723b9c4304f8873b393142e4a790711af80ed363662c";

test("runtime boundary inspector is available", () => {
  assert.equal(
    typeof boundaryModule?.inspectRuntimeBoundaries,
    "function",
    "inspectRuntimeBoundaries must be implemented",
  );
});

test("V3 runtime has no remote dependency and preserves Quorum and canonical render paths", async () => {
  assert.ok(boundaryModule, "runtime boundary inspector must be implemented");
  const inputs = await repositoryInputs();
  const inventory = boundaryModule.inspectRuntimeBoundaries(inputs);
  assert.ok(Object.hasOwn(inputs.sourceFiles, "src/styles.css"));

  assert.deepEqual(inventory.remoteRuntimeDependencies, []);
  assert.equal(inventory.quorumContractHash, EXPECTED_QUORUM_CONTRACT_HASH);
  assert.deepEqual(inventory.canonicalRendererEntrypoints, [
    canonicalEntrypoint("view", "src/components/dashboard/DashboardModeWorkspace.jsx"),
    canonicalEntrypoint("build", "src/components/dashboard/DashboardModeWorkspace.jsx"),
    canonicalEntrypoint(
      "present",
      "src/components/presentation/PresentWorkspace.jsx",
    ),
    canonicalEntrypoint(
      "audience",
      "src/components/presentation/AudienceDisplay.jsx",
    ),
  ]);
});

test("axis title graphics may use the audited ECharts text-metrics capability", async () => {
  const inputs = await repositoryInputs();

  assert.doesNotThrow(() => boundaryModule.inspectRuntimeBoundaries(inputs));
});

test("axis title graphics rejects broader ECharts runtime ownership", async () => {
  const inputs = await repositoryInputs();
  const helperPath = "src/charting/rendering/axisTitleGraphics.js";
  inputs.sourceFiles[helperPath] = [
    'import * as echarts from "echarts";',
    inputs.sourceFiles[helperPath],
  ].join("\n");

  assertBoundaryError(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    `${helperPath} canonicalRendererExclusivity: unexpected raw render surface (echarts-runtime)`,
  );
});

test("axis title graphics rejects renderer initialization", async () => {
  const inputs = await repositoryInputs();
  const helperPath = "src/charting/rendering/axisTitleGraphics.js";
  inputs.sourceFiles[helperPath] = [
    inputs.sourceFiles[helperPath],
    "echartsFormat.init(document.createElement(\"div\"));",
  ].join("\n");

  assertBoundaryError(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    `${helperPath} canonicalRendererExclusivity: unexpected raw render surface (echarts-runtime)`,
  );
});

test("axis title graphics rejects another ECharts module reference", async () => {
  const inputs = await repositoryInputs();
  const helperPath = "src/charting/rendering/axisTitleGraphics.js";
  inputs.sourceFiles[helperPath] = [
    inputs.sourceFiles[helperPath],
    'const runtime = import("echarts");',
  ].join("\n");

  assertBoundaryError(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    `${helperPath} canonicalRendererExclusivity: unexpected raw render surface (echarts-runtime)`,
  );
});

test("axis title graphics rejects ECharts React runtime ownership", async () => {
  const inputs = await repositoryInputs();
  const helperPath = "src/charting/rendering/axisTitleGraphics.js";
  inputs.sourceFiles[helperPath] = [
    'import EChartsReact from "echarts-for-react";',
    inputs.sourceFiles[helperPath],
  ].join("\n");

  assertBoundaryError(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    `${helperPath} canonicalRendererExclusivity: unexpected raw render surface (echarts-runtime)`,
  );
});

test("an unapproved reachable helper cannot import ECharts text metrics", async () => {
  const inputs = await repositoryInputs();
  const audiencePath = "src/components/presentation/AudienceDisplay.jsx";
  const helperPath = "src/components/presentation/AudienceTextMetrics.js";
  inputs.sourceFiles[helperPath] = [
    'import { format as echartsFormat } from "echarts";',
    "export const audienceTextRect = echartsFormat.getTextRect(\"Audience\");",
  ].join("\n");
  inputs.sourceFiles[audiencePath] = [
    'import { audienceTextRect } from "./AudienceTextMetrics.js";',
    inputs.sourceFiles[audiencePath],
  ].join("\n");

  assertBoundaryError(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    `${helperPath} canonicalRendererExclusivity: unexpected raw render surface (echarts-runtime)`,
  );
});

test("remote runtime dependencies fail with the exact manifest field", async () => {
  assert.ok(boundaryModule, "runtime boundary inspector must be implemented");
  const inputs = await repositoryInputs();
  inputs.packageJson.dependencies["remote-widget"] =
    "https://cdn.example.invalid/widget.js";

  assert.throws(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    /package\.json dependencies\.remote-widget: https:\/\/cdn\.example\.invalid\/widget\.js/,
  );
});

test("Audience cannot import Quorum directly", async () => {
  assert.ok(boundaryModule, "runtime boundary inspector must be implemented");
  const inputs = await repositoryInputs();
  const audiencePath = "src/components/presentation/AudienceDisplay.jsx";
  inputs.sourceFiles[audiencePath] =
    `import quorum from "../../lib/quorumCompanionProtocol.js";\n${inputs.sourceFiles[audiencePath]}`;

  assertBoundaryError(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    `${audiencePath} quorumBoundary.audience: reaches src/lib/quorumCompanionProtocol.js`,
  );
});

test("Audience cannot reach Quorum through an intermediate helper", async () => {
  const inputs = await repositoryInputs();
  const audiencePath = "src/components/presentation/AudienceDisplay.jsx";
  const helperPath = "src/components/presentation/SceneThemeBridge.js";
  inputs.sourceFiles[helperPath] =
    'import "../../lib/quorumCompanionProtocol.js";\nexport const audienceHelper = true;';
  inputs.sourceFiles[audiencePath] =
    `import { audienceHelper } from "./SceneThemeBridge.js";\n${inputs.sourceFiles[audiencePath]}`;

  assertBoundaryError(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    `${audiencePath} quorumBoundary.audience: reaches src/lib/quorumCompanionProtocol.js via ${helperPath}`,
  );
});

test("a forked mode renderer fails with the exact entrypoint field", async () => {
  assert.ok(boundaryModule, "runtime boundary inspector must be implemented");
  const inputs = await repositoryInputs();
  const audiencePath = "src/components/presentation/AudienceDisplay.jsx";
  inputs.sourceFiles[audiencePath] = inputs.sourceFiles[audiencePath]
    .replace(
      /import DisplayedChartGrid from "\.\.\/display\/DisplayedChartGrid\.jsx";\r?\n/,
      "",
    );

  assert.throws(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    /src\/components\/presentation\/PresentWorkspace\.jsx canonicalRendererEntrypoints\.present\.chartView/,
  );
});

test("a reachable renderer fork fails even when canonical imports remain", async () => {
  const inputs = await repositoryInputs();
  const audiencePath = "src/components/presentation/AudienceDisplay.jsx";
  const forkPath = "src/components/presentation/ForkedAudienceChart.jsx";
  inputs.sourceFiles[forkPath] = [
    'import { resolveChartRendering } from "../../charting/rendering/resolveChartRendering.js";',
    "export default function ForkedAudienceChart(props) {",
    "  const rendering = resolveChartRendering(props);",
    "  return rendering.kind;",
    "}",
  ].join("\n");
  inputs.sourceFiles[audiencePath] = [
    'import ForkedAudienceChart from "./ForkedAudienceChart.jsx";',
    inputs.sourceFiles[audiencePath],
  ].join("\n");

  assertBoundaryError(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    `${forkPath} canonicalRendererExclusivity: unexpected renderer consumer`,
  );
});

test("a reachable raw copied renderer fails while canonical reachability remains", async () => {
  const inputs = await repositoryInputs();
  const audiencePath = "src/components/presentation/AudienceDisplay.jsx";
  const forkPath = "src/components/presentation/RawAudienceChart.jsx";
  inputs.sourceFiles[forkPath] = [
    'import React from "react";',
    "export default function RawAudienceChart() {",
    "  const canvasRef = React.useRef(null);",
    "  React.useEffect(() => {",
    "    const context = canvasRef.current?.getContext(\"2d\");",
    "    context?.fillRect(0, 0, 20, 20);",
    "  }, []);",
    '  return React.createElement("canvas", { ref: canvasRef });',
    "}",
  ].join("\n");
  inputs.sourceFiles[audiencePath] = [
    'import RawAudienceChart from "./RawAudienceChart.jsx";',
    inputs.sourceFiles[audiencePath],
  ].join("\n");

  assertBoundaryError(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    `${forkPath} canonicalRendererExclusivity: unexpected raw render surface (canvas-element, canvas-context)`,
  );
});

test("source CSS and JSX remote assets report exact paths and fields", async () => {
  const inputs = await repositoryInputs();
  const fixtures = [
    {
      path: "src/runtime-boundary-fixture.css",
      source: '@import "https://cdn.example.invalid/theme.css";',
      field: "asset URL",
      value: "https://cdn.example.invalid/theme.css",
    },
    {
      path: "src/runtime-boundary-fixture.css",
      source: '.fixture { background: url("https://cdn.example.invalid/texture.png"); }',
      field: "asset URL",
      value: "https://cdn.example.invalid/texture.png",
    },
    {
      path: "src/runtime-boundary-fixture.jsx",
      source: 'export default <img src="https://cdn.example.invalid/plot.png" />;',
      field: "asset URL",
      value: "https://cdn.example.invalid/plot.png",
    },
    {
      path: "src/runtime-boundary-fixture.jsx",
      source: 'export default <img src={"https://cdn.example.invalid/expression.png"} />;',
      field: "asset URL",
      value: "https://cdn.example.invalid/expression.png",
    },
  ];

  for (const fixture of fixtures) {
    const changed = {
      ...inputs,
      sourceFiles: { ...inputs.sourceFiles, [fixture.path]: fixture.source },
    };
    assertBoundaryError(
      () => boundaryModule.inspectRuntimeBoundaries(changed),
      `Remote runtime dependency at ${fixture.path} ${fixture.field}: ${fixture.value}`,
    );
  }
});

test("source import and runtime URL variants report exact paths and fields", async () => {
  const inputs = await repositoryInputs();
  const filePath = "src/runtime-boundary-fixture.js";
  const fixtures = [
    {
      source: 'import "https://cdn.example.invalid/static.js";',
      field: "import",
      value: "https://cdn.example.invalid/static.js",
    },
    {
      source: 'const module = import("https://cdn.example.invalid/dynamic.js");',
      field: "import",
      value: "https://cdn.example.invalid/dynamic.js",
    },
    {
      source: 'fetch("https://api.example.invalid/state");',
      field: "runtime URL",
      value: "https://api.example.invalid/state",
    },
    {
      source: 'const asset = new URL("https://cdn.example.invalid/asset.bin", import.meta.url);',
      field: "runtime URL",
      value: "https://cdn.example.invalid/asset.bin",
    },
  ];

  for (const fixture of fixtures) {
    const changed = {
      ...inputs,
      sourceFiles: { ...inputs.sourceFiles, [filePath]: fixture.source },
    };
    assertBoundaryError(
      () => boundaryModule.inspectRuntimeBoundaries(changed),
      `Remote runtime dependency at ${filePath} ${fixture.field}: ${fixture.value}`,
    );
  }
});

test("recursive catalogue schema reports exact contract and nested field drift", async () => {
  const cataloguePath = "public/integration/quorum-chart-catalogue.json";
  const fixtures = [
    {
      mutate: (catalogue) => {
        catalogue.contract_version = "3";
      },
      message: `${cataloguePath} contract_version: expected literal "2"`,
    },
    {
      mutate: (catalogue) => {
        catalogue.chart_types[0].capabilities.remote_origin = true;
      },
      message: `${cataloguePath} chart_types[0].capabilities.remote_origin: unexpected field`,
    },
    {
      mutate: (catalogue) => {
        delete catalogue.chart_types[0].capabilities.zoom;
      },
      message: `${cataloguePath} chart_types[0].capabilities.zoom: missing required field`,
    },
    {
      mutate: (catalogue) => {
        delete catalogue.charts[0].title;
      },
      message: `${cataloguePath} charts[0].title: missing required field`,
    },
  ];

  for (const fixture of fixtures) {
    const inputs = await repositoryInputs();
    const catalogue = JSON.parse(inputs.publicFiles[cataloguePath]);
    fixture.mutate(catalogue);
    inputs.publicFiles[cataloguePath] = JSON.stringify(catalogue);
    assertBoundaryError(
      () => boundaryModule.inspectRuntimeBoundaries(inputs),
      fixture.message,
    );
  }

  const contentInputs = await repositoryInputs();
  const changedContent = JSON.parse(contentInputs.publicFiles[cataloguePath]);
  changedContent.catalogue_revision = "2099-12-31";
  changedContent.charts[0].title = "Mutable content change";
  contentInputs.publicFiles[cataloguePath] = JSON.stringify(changedContent);
  assert.equal(
    boundaryModule.inspectRuntimeBoundaries(contentInputs).quorumContractHash,
    EXPECTED_QUORUM_CONTRACT_HASH,
  );
});

function assertBoundaryError(action, expectedMessage) {
  assert.throws(action, (error) => {
    assert.equal(error.message, expectedMessage);
    return true;
  });
}

function canonicalEntrypoint(mode, entrypoint) {
  return {
    mode,
    entrypoint,
    chartView: "src/components/charts/ChartView.jsx",
    registry: "src/charting/schemas/chartSchemaRegistry.js",
    renderer: "src/charting/rendering/resolveChartRendering.js",
  };
}

async function repositoryInputs() {
  const publicFiles = await readTextTree(
    "public",
    new Set([".css", ".html", ".js", ".json", ".svg"]),
  );
  publicFiles["index.html"] = await readFile("index.html", "utf8");
  return {
    packageJson: JSON.parse(await readFile("package.json", "utf8")),
    sourceFiles: await readTextTree("src", new Set([".css", ".html", ".js", ".jsx"])),
    publicFiles,
  };
}

async function readTextTree(root, extensions) {
  const files = {};
  await visit(root);
  return files;

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = path.posix.join(directory.replaceAll("\\", "/"), entry.name);
      if (entry.isDirectory()) {
        await visit(filePath);
      } else if (extensions.has(path.extname(entry.name))) {
        files[filePath] = await readFile(filePath, "utf8");
      }
    }
  }
}
