// Project the shipped exercise labels at the UI boundary; authored identity stays intact.
export function sourceDisplayName(value, sourceId) {
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  const prefixed = /^(?:Simulation exercise )?(biomedical|socio-?economic)\s+(.+)$/i.exec(normalized);
  const inferred = /^bio_/i.test(sourceId ?? "") ? "biomedical" : /^socio_/i.test(sourceId ?? "") ? "socio-economic" : null;
  const categoryless = inferred && /^Simulation exercise\s+(.+)$/i.exec(normalized);
  const generated = /^Generated (.+) (biomedical|socio-?economic) dataset(\.csv)?$/i.exec(normalized);
  const category = prefixed?.[1] ?? (categoryless ? inferred : generated?.[2]);
  if (!category) return value;
  const suffix = category.toLowerCase() === "biomedical" ? "Biomedical" : "Socio-economic";
  const datasetLabel = prefixed?.[2] ?? categoryless?.[1] ?? `Generated ${generated[1]} dataset${generated[3] ?? ""}`;
  const extension = /\.csv$/i.exec(datasetLabel)?.[0] ?? "";
  const dataset = (extension ? datasetLabel.slice(0, -extension.length) : datasetLabel).trim();
  if (!dataset) return value;
  return `${dataset.charAt(0).toUpperCase()}${dataset.slice(1)} — ${suffix}${extension}`;
}
