import path from "node:path";

const READ_PREFERENCE_EXPORT = "export function readAppearancePreference(";
const PERSIST_PREFERENCE_EXPORT = "export function persistAppearancePreference(";

export function createPdpcLightDefaultPlugin({ themeModulePath }) {
  const target = normalizeModulePath(themeModulePath);
  let transformations = 0;

  return {
    name: "simex-pdpc-light-default",
    enforce: "pre",
    transform(source, id) {
      if (normalizeModulePath(stripQuery(id)) !== target) return null;

      const start = source.indexOf(READ_PREFERENCE_EXPORT);
      const end = source.indexOf(PERSIST_PREFERENCE_EXPORT, start);
      if (start < 0 || end <= start) {
        throw new Error("Could not isolate readAppearancePreference while applying the PDPC Light default.");
      }

      const owner = source.slice(start, end);
      const systemFallbacks = owner.match(/"system"/g) ?? [];
      if (systemFallbacks.length !== 2) {
        throw new Error(
          `Expected exactly two System fallbacks in readAppearancePreference; found ${systemFallbacks.length}.`,
        );
      }

      transformations += 1;
      return {
        code: `${source.slice(0, start)}${owner.replaceAll('"system"', '"light"')}${source.slice(end)}`,
        map: null,
      };
    },
    appliedCount() {
      return transformations;
    },
  };
}

function stripQuery(value) {
  return String(value).split("?", 1)[0];
}

function normalizeModulePath(value) {
  return path.resolve(value).replaceAll("\\", "/").toLowerCase();
}
