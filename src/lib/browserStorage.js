function isStorageQuotaError(error) {
  return Boolean(
    error
    && (
      error.name === "QuotaExceededError"
      || error.name === "NS_ERROR_DOM_QUOTA_REACHED"
      || error.code === 22
      || error.code === 1014
    )
  );
}

export function createSafeBrowserStorage(
  storageProvider = () => globalThis.localStorage,
) {
  return Object.freeze({
    getItem(key) {
      try {
        return storageProvider()?.getItem?.(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        const storage = storageProvider();
        if (typeof storage?.setItem !== "function") return false;
        storage.setItem(key, value);
        return true;
      } catch (error) {
        if (isStorageQuotaError(error)) throw error;
        return false;
      }
    },
    removeItem(key) {
      try {
        const storage = storageProvider();
        if (typeof storage?.removeItem !== "function") return false;
        storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  });
}

export const browserStorage = createSafeBrowserStorage();
