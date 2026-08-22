import { validateChartRuntimeArtifact } from "./chartRuntimeArtifact.js";

export function createChartRuntimeArtifactRegistry({
  store = null,
  onPersistenceFailure = () => {},
} = {}) {
  const memory = new Map();

  return Object.freeze({
    get(identity) {
      return memory.get(identity) ?? null;
    },
    publish(artifact) {
      validateChartRuntimeArtifact(artifact);
      memory.set(artifact.identity, artifact);
      const persistence = store?.put
        ? Promise.resolve().then(() => store.put(artifact)).catch((error) => {
            onPersistenceFailure(error);
            throw error;
          })
        : Promise.resolve({ status: "session-only" });
      return Object.freeze({ artifact, persistence });
    },
    async preload(identities = []) {
      if (!store?.get) return Object.freeze([]);
      const loaded = [];
      for (const identity of identities) {
        try {
          const artifact = await store.get(identity);
          if (!artifact) continue;
          validateChartRuntimeArtifact(artifact, identity);
          memory.set(identity, artifact);
          loaded.push(artifact);
        } catch (error) {
          onPersistenceFailure(error);
        }
      }
      return Object.freeze(loaded);
    },
    remove(identity) {
      memory.delete(identity);
      return store?.remove ? store.remove(identity) : Promise.resolve();
    },
    clearMemory() {
      memory.clear();
    },
  });
}

export const chartRuntimeArtifactRegistry = createChartRuntimeArtifactRegistry();
