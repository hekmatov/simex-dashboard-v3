import { loadCsv, parseCsvText } from "./loadCsv.js";

const WORKER_MINIMUM_CHARACTERS = 1024 * 1024;

export function loadBrowserCsv(path) {
  return loadCsv(path, (text, label) => {
    if (text.length < WORKER_MINIMUM_CHARACTERS || typeof Worker === "undefined") {
      return parseCsvText(text, label);
    }
    return new Promise((resolve, reject) => {
      let worker;
      const fallback = () => {
        worker?.terminate();
        try {
          resolve(parseCsvText(text, label));
        } catch (error) {
          reject(error);
        }
      };
      try {
        worker = new Worker(new URL("./parseCsv.worker.js", import.meta.url), { type: "module" });
      } catch {
        fallback();
        return;
      }
      const finish = (callback, result) => {
        worker.terminate();
        callback(result);
      };
      worker.addEventListener("error", fallback, { once: true });
      worker.addEventListener("messageerror", fallback, { once: true });
      worker.addEventListener("message", ({ data }) => {
        if (data.error) finish(reject, new Error(data.error));
        else finish(resolve, data.rows);
      }, { once: true });
      try {
        worker.postMessage({ text, label });
      } catch {
        fallback();
      }
    });
  });
}
