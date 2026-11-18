import { catalogueMatchesDashboardSnapshot } from "./quorumCatalogue.js";

self.addEventListener("message", async ({ data }) => {
  const { dashboard, aliases, catalogue } = data;
  self.postMessage(await catalogueMatchesDashboardSnapshot(dashboard, aliases, catalogue));
});
