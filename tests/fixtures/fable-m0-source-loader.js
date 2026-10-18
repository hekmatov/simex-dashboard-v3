import { loadDashboard } from "../../src/lib/loadDashboard.js";

document.querySelector("button").addEventListener("click", async () => {
  try {
    const dashboard = await loadDashboard("config/dashboard.json");
    window.loadedFixture = {
      id: dashboard.id,
      data: dashboard.loadedData,
      states: dashboard.dataSourceStates,
    };
    document.querySelector("output").textContent = "Sources ready";
  } catch (error) {
    document.querySelector("output").textContent = error.message;
  }
});
