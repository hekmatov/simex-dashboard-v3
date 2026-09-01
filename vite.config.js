import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  optimizeDeps: {
    include: [
      "react-dom/client",
      "@tiptap/core",
      "@tiptap/react",
      "@tiptap/pm/model",
      "@tiptap/starter-kit",
      "@tiptap/extension-underline",
      "@tiptap/extension-link",
      "@tiptap/extension-table",
      "@tiptap/pm/state",
      "dompurify",
      "echarts",
      "html2canvas",
      "katex",
      "markdown-it",
      "papaparse",
    ],
  },
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
