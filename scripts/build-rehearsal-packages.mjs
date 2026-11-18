import { lstat, mkdir, mkdtemp, readFile, realpath, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { safePublicPath } from "../src/lib/loadDashboard.js";
import { sha256HexSync } from "../src/static-content/assets/assetPayloadEnvelope.js";
import { REHEARSAL_CUTOFFS, prepareRehearsalInput, buildRehearsalPhase, rehearsalJsonBytes } from "./lib/rehearsal-packages.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const within = (parent, child) => { const relative = path.relative(parent, child); return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative); };

export function parseRehearsalArgs(argv) {
  const result = { companionPaths: [] };
  const keys = { "--bundle": "bundlePath", "--expected-sha256": "expectedInputSha256", "--out-dir": "outDir", "--static-releases": "staticReleasesPath" };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index], value = argv[++index];
    if (!Object.hasOwn(keys, flag) && flag !== "--companion") throw new Error(`Unknown argument ${flag}.`);
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
    if (flag === "--companion") result.companionPaths.push(value);
    else {
      if (result[keys[flag]] !== undefined) throw new Error(`${flag} may be provided only once.`);
      result[keys[flag]] = value;
    }
  }
  if (!result.bundlePath || !/^[a-f0-9]{64}$/.test(result.expectedInputSha256 ?? "")) throw new Error("--bundle and its explicitly selected --expected-sha256 are required.");
  return result;
}

export async function createLocalRehearsalReaders(rootDir) {
  const publicDir = await realpath(path.join(rootDir, "public"));
  const read = async sourcePath => {
    const target = await realpath(path.resolve(publicDir, safePublicPath(sourcePath)));
    if (!within(publicDir, target)) throw new Error("Rehearsal source must stay inside this checkout's public directory.");
    return readFile(target, "utf8");
  };
  return { readText: read, readJson: async sourcePath => JSON.parse(await read(sourcePath)) };
}

export async function assertRehearsalOutputTarget(rootDir, outDir) {
  const root = await realpath(rootDir);
  const release = path.join(root, "release"), output = path.resolve(outDir);
  if (!within(release, output)) throw new Error("Generated rehearsal files must stay in a child directory of this worktree's ignored release/ directory.");
  let cursor = release;
  for (const segment of ["", ...path.relative(release, output).split(path.sep)]) {
    if (segment) cursor = path.join(cursor, segment);
    try {
      const info = await lstat(cursor);
      if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("Rehearsal output ancestors must be ordinary local directories.");
      if (cursor === output) throw new Error("Rehearsal output already exists; choose a new local release directory.");
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return { release, output };
}

export async function writeRehearsalPackages({ rootDir = ROOT, outDir, inputBytes, expectedInputSha256, staticReleases = {}, companions = [], readers }) {
  const target = await assertRehearsalOutputTarget(rootDir, outDir ?? path.join(rootDir, "release", `rehearsal-${expectedInputSha256?.slice(0, 12)}`));
  const appVersion = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8")).version;
  const prepared = await prepareRehearsalInput({ inputBytes, expectedInputSha256, staticReleases, readers: readers ?? await createLocalRehearsalReaders(rootDir) });
  const names = new Set();
  const companionManifest = companions.map(({ name, bytes }) => {
    if (typeof name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(name) || name.includes("..") || names.has(name.toLowerCase()) || !(bytes instanceof Uint8Array)) throw new Error("Provenance companions need unique, contained filenames and original bytes.");
    names.add(name.toLowerCase());
    return { file: `original/companions/${name}`, sha256: sha256HexSync(bytes), byteLength: bytes.byteLength };
  });
  await mkdir(target.release, { recursive: true });
  const staging = await mkdtemp(path.join(target.release, ".rehearsal-staging-"));
  await mkdir(path.join(staging, "original", "companions"), { recursive: true });
  await writeFile(path.join(staging, "original", "input.json"), prepared.inputBytes);
  for (const companion of companions) await writeFile(path.join(staging, "original", "companions", companion.name), companion.bytes);
  const phases = [];
  for (const [index, cutoff] of REHEARSAL_CUTOFFS.entries()) {
    const phase = buildRehearsalPhase({ prepared, cutoff, appVersion });
    const directory = `phase-${index + 1}-${cutoff}`;
    await mkdir(path.join(staging, directory));
    await writeFile(path.join(staging, directory, "dashboard-bundle.json"), phase.bundleBytes);
    await writeFile(path.join(staging, directory, "release-manifest.json"), rehearsalJsonBytes(phase.manifest));
    phases.push({ directory, ...phase.manifest, review: phase.report });
  }
  const manifest = {
    factory: "simex-rehearsal-packages", manifestVersion: 1, appVersion,
    originalInput: { file: "original/input.json", sha256: prepared.inputSha256, byteLength: inputBytes.byteLength },
    originalCompanions: companionManifest,
    distributionBoundary: "Only individual phase directories contain participant candidates. Keep original/ and this operator review manifest outside participant distribution. Human release review is still required.",
    provenanceScope: "Preserves native source provenance and supplied original companions; does not certify complete scenario provenance or approve undated snapshots.",
    staticReleaseAuthority: staticReleases,
    phases,
  };
  await writeFile(path.join(staging, "rehearsal-release-set.json"), rehearsalJsonBytes(manifest));
  await rename(staging, target.output);
  return { outputDir: target.output, manifest };
}

export async function runRehearsalCli(argv = process.argv.slice(2), rootDir = ROOT) {
  const args = parseRehearsalArgs(argv);
  const result = await writeRehearsalPackages({
    rootDir, outDir: args.outDir, expectedInputSha256: args.expectedInputSha256,
    inputBytes: await readFile(args.bundlePath),
    staticReleases: args.staticReleasesPath ? JSON.parse(await readFile(args.staticReleasesPath, "utf8")) : {},
    companions: await Promise.all(args.companionPaths.map(async file => ({ name: path.basename(file), bytes: await readFile(file) }))),
  });
  console.log(`Prepared three phase candidates at ${result.outputDir}. Human release review remains required; original bytes stay outside phase directories.`);
  return result;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  runRehearsalCli().catch(error => { console.error(error.message); process.exitCode = 1; });
}
