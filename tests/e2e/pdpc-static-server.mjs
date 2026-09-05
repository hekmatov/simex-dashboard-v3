import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const releaseRoot = path.resolve(
  process.env.SIMEX_PDPC_RELEASE_ROOT ?? "release/pdpc",
);
const variant = argument("--variant");
const port = Number(argument("--port"));
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("--port must be a valid TCP port.");
}
if (!new Set(["biomedical", "socioeconomic"]).has(variant)) {
  throw new Error("--variant must be biomedical or socioeconomic.");
}
const root = path.join(releaseRoot, variant);
await access(path.join(root, "index.html"));

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === "/__test_ready__") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"ready":true}');
    return;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const filePath = path.resolve(root, relative);
  const contained = path.relative(root, filePath);
  if (contained.startsWith("..") || path.isAbsolute(contained)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const information = await stat(filePath);
    if (!information.isFile()) throw Object.assign(new Error("Not a file"), { code: "ENOENT" });
    response.writeHead(200, {
      "content-type": contentType(filePath),
      "cache-control": "no-store",
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(error?.code === "ENOENT" ? 404 : 500, {
      "content-type": "text/plain; charset=utf-8",
    });
    response.end(error?.code === "ENOENT" ? "Not found" : "Server error");
  }
});

server.listen(port, "127.0.0.1");

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`${name} is required.`);
  return process.argv[index + 1];
}

function contentType(filePath) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".geojson": "application/geo+json; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ttf": "font/ttf",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  })[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}
