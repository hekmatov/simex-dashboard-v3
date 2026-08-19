import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const boundaryModule = await import(
  "../scripts/check-v3-runtime-boundaries.mjs"
).catch(() => null);

const EXPECTED_QUORUM_CONTRACT_HASH =
  "d8b0d7ac09cca77d89c3d14a252054ef8e3eaf560bea90fc10a1966ef86d983d";

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

  assert.deepEqual(inventory.remoteRuntimeDependencies, []);
  assert.equal(inventory.quorumContractHash, EXPECTED_QUORUM_CONTRACT_HASH);
  assert.deepEqual(inventory.canonicalRendererEntrypoints, [
    canonicalEntrypoint("view", "src/components/view/ViewShell.jsx"),
    canonicalEntrypoint("build", "src/components/build/BuildWorkspace.jsx"),
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

  assert.throws(
    () => boundaryModule.inspectRuntimeBoundaries(inputs),
    /src\/components\/presentation\/AudienceDisplay\.jsx import: \.\.\/\.\.\/lib\/quorumCompanionProtocol\.js/,
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
    sourceFiles: await readTextTree("src", new Set([".js", ".jsx"])),
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
