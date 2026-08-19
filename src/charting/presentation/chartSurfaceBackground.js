const LEGACY_THEME_OWNED_BACKGROUND = "#FFFFFF";

export function resolveChartSurfaceBackground(
  value,
  { themeDefault = null } = {},
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.transparent === true) return "transparent";
  const color = typeof value.color === "string" ? value.color.trim() : "";
  if (!/^#[0-9a-f]{6}$/i.test(color)) return null;
  const normalized = color.toUpperCase();
  return normalized === LEGACY_THEME_OWNED_BACKGROUND ? themeDefault : normalized;
}
