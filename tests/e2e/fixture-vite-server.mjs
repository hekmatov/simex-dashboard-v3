import { createServer } from "vite";
import { legacyContractMiddleware } from "./support/legacyContractFixture.js";

const port = Number(process.argv[process.argv.indexOf("--port") + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("--port is required");
const server = await createServer({
  // Dedicated component harnesses import this stable optimized dependency URL.
  // Only this server owns the default cache; app servers keep separate caches.
  cacheDir: port === 4175 ? "node_modules/.vite" : `node_modules/.vite-e2e-fixture-${port}`,
  server: { host: "127.0.0.1", port, strictPort: true, hmr: { port } },
  plugins: [{ name: "explicit-contract-fixture", configureServer(vite) { vite.middlewares.use(legacyContractMiddleware); } }],
});
await server.listen();
