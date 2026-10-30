export function gaugeAssessment(actual, target, direction = "increase-is-good") {
  if (!Number.isFinite(actual) || !Number.isFinite(target)) return { status: "", favorability: null };
  const difference = Math.round((actual - target) * 100) / 100;
  if (difference === 0) return { status: "ON TARGET", favorability: "neutral" };
  const comparison = difference > 0 ? "ABOVE TARGET" : "BELOW TARGET";
  const favorable = direction !== "neutral" && ((difference < 0) === (direction === "decrease-is-good"));
  const points = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Math.abs(difference));
  return {
    status: `${favorable ? "ON TRACK" : comparison} · ${points} POINT${Math.abs(difference) === 1 ? "" : "S"} ${comparison}`,
    favorability: direction === "neutral" ? "neutral" : favorable ? "favorable" : "unfavorable",
  };
}
