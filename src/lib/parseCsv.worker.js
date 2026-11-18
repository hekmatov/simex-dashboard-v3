import { parseCsvText } from "./loadCsv.js";

self.addEventListener("message", ({ data: { text, label } }) => {
  try {
    self.postMessage({ rows: parseCsvText(text, label) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
});
