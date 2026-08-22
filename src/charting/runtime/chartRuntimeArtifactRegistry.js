import { validateChartRuntimeArtifact } from "./chartRuntimeArtifact.js";
import { createBrowserChartArtifactStore } from "./browserChartArtifactStore.js";

export function createChartRuntimeArtifactRegistry({
  store = null,
  onPersistenceFailure = () => {},
} = {}) {
  const memory = new Map();
  let durableStore = store;
  let reportPersistenceFailure = onPersistenceFailure;

  return Object.freeze({
    configure({ store: nextStore = durableStore, onPersistenceFailure: nextReporter } = {}) {
      durableStore = nextStore;
      if (typeof nextReporter === "function") reportPersistenceFailure = nextReporter;
    },
    get(identity) {
      return memory.get(identity) ?? null;
    },
    publish(artifact) {
      validateChartRuntimeArtifact(artifact);
      memory.set(artifact.identity, artifact);
      const persistence = durableStore?.put
        ? Promise.resolve().then(() => durableStore.put(artifact)).catch((error) => {
            reportPersistenceFailure(error);
            throw error;
          })
        : Promise.resolve({ status: "session-only" });
      return Object.freeze({ artifact, persistence });
    },
    async preload(identities = []) {
      if (!durableStore?.get) return Object.freeze([]);
      const loaded = [];
      for (const identity of identities) {
        try {
          const artifact = await durableStore.get(identity);
          if (!artifact) continue;
          validateChartRuntimeArtifact(artifact, identity);
          memory.set(identity, artifact);
          loaded.push(artifact);
        } catch (error) {
          reportPersistenceFailure(error);
        }
      }
      return Object.freeze(loaded);
    },
    remove(identity) {
      memory.delete(identity);
      return durableStore?.remove ? durableStore.remove(identity) : Promise.resolve();
    },
    clearMemory() {
      memory.clear();
    },
  });
}

export const chartRuntimeArtifactRegistry = createChartRuntimeArtifactRegistry({
  store: createBrowserChartArtifactStore(),
});
