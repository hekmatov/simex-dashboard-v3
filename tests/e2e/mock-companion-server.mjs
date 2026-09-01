import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";

const APP_HOST = "127.0.0.1";
requireSourceMode();
const APP_PORT = numericArgument("--app-port", 4173);
const CONTROL_PORT = numericArgument("--control-port", 4174);
const vite = await createViteServer({
  root: process.cwd(),
  appType: "spa",
  logLevel: "error",
  server: { middlewareMode: true, hmr: false },
});
const catalogue = JSON.parse(
  await readFile(
    resolve("public", "integration/quorum-chart-catalogue.json"),
    "utf8",
  ),
);
const credential = "e2e-opaque-credential";
const sessionId = "e2e-session";
const clients = new Map();
let catalogueMode = "match";
let receivedEvents = [];

const socketServer = new WebSocketServer({ noServer: true });
socketServer.on("connection", (socket) => {
  const connection = { serverSequence: 0 };
  clients.set(socket, connection);

  socket.on("message", (bytes) => {
    let message;
    try {
      message = JSON.parse(bytes.toString());
    } catch {
      return;
    }
    receivedEvents.push(redacted(message));
    if (message.type === "dashboard_hello") {
      send(socket, "companion_ready", "accepted", {
        accepted_dashboard_instance_id: message.payload.dashboard_instance_id,
        accepted_display_revision: message.payload.display_revision,
        catalogue_id: catalogue.catalogue_id,
        catalogue_digest: catalogue.digest,
      });
    }
  });
  socket.on("close", () => clients.delete(socket));
});

const appServer = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === "/__test_ready__") {
    return json(response, 200, { ready: true });
  }
  if (url.pathname === "/companion/bootstrap") {
    if (catalogueMode === "absent") {
      return json(response, 404, { available: false });
    }
    return json(response, 200, {
      protocol_version: "1",
      session_id: sessionId,
      catalogue_id: catalogue.catalogue_id,
      catalogue_digest:
        catalogueMode === "stale" ? "b".repeat(64) : catalogue.digest,
      credential,
      gateway_path: "/companion/ws",
    });
  }
  return vite.middlewares(request, response, () => (
    json(response, 404, { error: "not found" })
  ));
});

appServer.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname !== "/companion/ws" || catalogueMode !== "match") {
    socket.destroy();
    return;
  }
  socketServer.handleUpgrade(request, socket, head, (webSocket) => {
    socketServer.emit("connection", webSocket, request);
  });
});

const controlServer = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === "/__test__/events" && request.method === "GET") {
    return json(response, 200, receivedEvents);
  }
  if (request.method !== "POST") {
    return json(response, 404, { error: "not found" });
  }

  const body = await readJsonBody(request);
  if (url.pathname === "/__test__/reset") {
    catalogueMode = "match";
    receivedEvents = [];
    closeClients();
    return json(response, 200, { reset: true });
  }
  if (url.pathname === "/__test__/catalogue-mode") {
    if (!["match", "stale", "absent"].includes(body?.mode)) {
      return json(response, 400, { error: "invalid mode" });
    }
    catalogueMode = body.mode;
    closeClients();
    return json(response, 200, { mode: catalogueMode });
  }
  if (url.pathname === "/__test__/display-set") {
    for (const socket of clients.keys()) {
      send(socket, "display_set_requested", "required", {
        chart_ids: body?.chart_ids,
        expected_display_revision: body?.expected_display_revision,
        reason_code: "operator_selected_recommendation",
      });
    }
    return json(response, 200, { recipients: clients.size });
  }
  if (url.pathname === "/__test__/disconnect") {
    const count = clients.size;
    for (const socket of clients.keys()) {
      socket.terminate();
    }
    return json(response, 200, { disconnected: count });
  }
  return json(response, 404, { error: "not found" });
});

await Promise.all([
  listen(appServer, APP_PORT),
  listen(controlServer, CONTROL_PORT),
]);

function send(socket, type, acknowledgementStatus, payload) {
  if (socket.readyState !== socket.OPEN) {
    return;
  }
  const connection = clients.get(socket);
  connection.serverSequence += 1;
  const sequence = connection.serverSequence;
  socket.send(
    JSON.stringify({
      protocol_version: "1",
      message_id: `server-${sequence}-${Date.now()}`,
      session_id: sessionId,
      sequence,
      idempotency_key: `${type}:${sequence}`,
      type,
      acknowledgement_status: acknowledgementStatus,
      payload,
    }),
  );
}

function closeClients() {
  for (const socket of clients.keys()) {
    socket.close(1000, "test reset");
  }
  clients.clear();
}

function redacted(message) {
  const copy = structuredClone(message);
  if (copy.type === "dashboard_hello" && copy.payload) {
    copy.payload.credential = "[redacted]";
  }
  return copy;
}

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function listen(server, port) {
  return new Promise((resolvePromise) => {
    server.listen(port, APP_HOST, resolvePromise);
  });
}

function numericArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new Error(`${name} must be an integer TCP port`);
  }
  return value;
}

function requireSourceMode() {
  if (!process.argv.includes("--source")) {
    throw new Error("The companion E2E harness requires --source");
  }
}
