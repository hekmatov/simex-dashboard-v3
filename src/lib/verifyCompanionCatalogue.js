import { catalogueMatchesDashboardSnapshot } from "./quorumCatalogue.js";

export function verifyCompanionCatalogue(dashboard, aliases, catalogue, signal) {
  if (typeof Worker === "undefined") {
    return catalogueMatchesDashboardSnapshot(dashboard, aliases, catalogue);
  }
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const worker = new Worker(new URL("./quorumCatalogue.worker.js", import.meta.url), { type: "module" });
    const finish = (callback, result) => {
      signal.removeEventListener("abort", abort);
      worker.terminate();
      callback(result);
    };
    const abort = () => finish(reject, signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    worker.addEventListener("message", ({ data }) => finish(resolve, data === true), { once: true });
    worker.addEventListener("error", () => finish(reject, new Error("Could not verify the Quorum catalogue.")), { once: true });
    worker.addEventListener("messageerror", () => finish(reject, new Error("Could not read the Quorum catalogue verification.")), { once: true });
    try {
      worker.postMessage({ dashboard, aliases, catalogue });
    } catch (error) {
      finish(reject, error);
    }
  });
}
