import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        dashboard: fileURLToPath(new URL("./index.html", import.meta.url)),
        sourceViewer: fileURLToPath(new URL("./source-viewer.html", import.meta.url)),
      },
    },
  },
  plugins: [react()],
});
