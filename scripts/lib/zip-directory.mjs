import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateRawSync } from "node:zlib";

const UTF8_FLAG = 0x0800;
const DEFLATE_METHOD = 8;
const UINT32_LIMIT = 0xffffffff;

export async function createZipFromDirectory({ sourceDir, outputFile }) {
  const resolvedSource = path.resolve(sourceDir);
  const resolvedOutput = path.resolve(outputFile);
  const entries = await listFiles(resolvedSource);
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const relativePath of entries) {
    const name = Buffer.from(relativePath, "utf8");
    const content = await readFile(path.join(resolvedSource, ...relativePath.split("/")));
    const compressed = deflateRawSync(content, { level: 9 });
    const crc = crc32(content);
    assertClassicZipSize(content.length, "file");
    assertClassicZipSize(compressed.length, "compressed file");
    assertClassicZipSize(localOffset, "archive offset");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(DEFLATE_METHOD, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(DEFLATE_METHOD, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + compressed.length;
  }

  if (entries.length > 0xffff) throw new Error("ZIP64 is required for more than 65,535 files.");
  const centralDirectory = Buffer.concat(centralParts);
  assertClassicZipSize(centralDirectory.length, "central directory");
  assertClassicZipSize(localOffset, "central directory offset");
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  const archive = Buffer.concat([...localParts, centralDirectory, end]);

  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, archive);
  return Object.freeze({ outputFile: resolvedOutput, entries, bytes: archive.length });
}

async function listFiles(root, relative = "") {
  const directory = path.join(root, ...relative.split("/").filter(Boolean));
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const next = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(root, next));
    else if (entry.isFile()) files.push(next);
    else throw new Error(`Cloudflare ZIP input contains an unsupported filesystem entry: ${next}`);
  }
  return files;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function assertClassicZipSize(value, description) {
  if (!Number.isSafeInteger(value) || value < 0 || value > UINT32_LIMIT) {
    throw new Error(`ZIP64 is required for this ${description}.`);
  }
}

const CRC_TABLE = Object.freeze(Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
}));
