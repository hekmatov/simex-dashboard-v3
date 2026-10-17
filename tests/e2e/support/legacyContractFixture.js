import { readFile } from "node:fs/promises";

// Historical contract journeys retain their authored IDs independently of the
// package selected by a practitioner. No cookie always means real shipped data.
export const LEGACY_FIXTURE_COOKIE = {
  name: "simex-e2e-fixture", value: "legacy-contract", domain: "127.0.0.1",
  path: "/", httpOnly: true, secure: false, sameSite: "Strict", expires: -1,
};
export const LEGACY_STORAGE_STATE = { cookies: [LEGACY_FIXTURE_COOKIE], origins: [] };
export const legacyDashboard = JSON.parse(await readFile(new URL("../../fixtures/legacy-contract-dashboard.json", import.meta.url), "utf8"));
export const legacyCatalogue = JSON.parse(await readFile(new URL("../../fixtures/legacy-contract-catalogue.json", import.meta.url), "utf8"));
export const legacyAliases = JSON.parse(await readFile(new URL("../../fixtures/legacy-contract-aliases.json", import.meta.url), "utf8"));
export const legacyProfiles = JSON.parse(await readFile(new URL("../../fixtures/legacy-contract-profiles.json", import.meta.url), "utf8"));

export function usesLegacyContractFixture(request) {
  return String(request.headers.cookie ?? "").split(";").some((cookie) => cookie.trim() === "simex-e2e-fixture=legacy-contract");
}

export function legacyContractResponse(request, pathname) {
  if (!usesLegacyContractFixture(request)) return null;
  if (pathname === "/config/dashboard.json") return legacyDashboard;
  if (pathname === "/config/dataset-profiles.json") return legacyProfiles;
  if (pathname === "/integration/quorum-chart-catalogue.json") return legacyCatalogue;
  if (pathname === "/config/chart-aliases.json") return legacyAliases;
  return null;
}

export function legacyContractMiddleware(request, response, next) {
  const value = legacyContractResponse(request, new URL(request.url, "http://127.0.0.1").pathname);
  if (value === null) return next();
  response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}
