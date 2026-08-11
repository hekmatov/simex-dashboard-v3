export function createProviderRegistry(initialProviders = []) {
  const providers = new Map();

  function register(provider) {
    if (
      !provider
      || typeof provider.kind !== "string"
      || provider.kind.trim() === ""
      || typeof provider.load !== "function"
    ) {
      throw new TypeError("A data provider requires a kind and load function.");
    }
    if (providers.has(provider.kind)) {
      throw new Error(`Data provider "${provider.kind}" is already registered.`);
    }
    providers.set(provider.kind, provider);
    return api;
  }

  function resolve(kind) {
    const provider = providers.get(kind);
    if (!provider) throw new Error(`No data provider is registered for "${kind}".`);
    return provider;
  }

  function kinds() {
    return [...providers.keys()].sort();
  }

  const api = Object.freeze({ register, resolve, kinds });
  for (const provider of initialProviders) register(provider);
  return api;
}
