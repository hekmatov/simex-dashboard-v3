// Selection is a context-local harness cookie. Reset is explicit and one-shot;
// ordinary reloads must retain edits so the tests exercise real persistence.
export async function resetSourceDashboard(page, {
  fixture = "shipped",
  baseURL = "http://127.0.0.1:4173",
} = {}) {
  await page.goto(`${baseURL}/__test__/dashboard`);
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
      await registration.unregister();
    }
    for (const key of await caches.keys()) await caches.delete(key);
    for (const database of await indexedDB.databases()) {
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(database.name);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error(`Fixture reset blocked by open database ${database.name}`));
      });
    }
  });
  const response = await page.request.post(`${baseURL}/__test__/dashboard`, { data: { fixture } });
  if (!response.ok()) throw new Error(`Dashboard fixture selection failed: ${await response.text()}`);
  await page.goto(`${baseURL}/`);
}
