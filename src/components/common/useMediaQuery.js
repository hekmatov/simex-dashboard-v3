import React from "react";

export const MOBILE_VIEW_QUERY = "(max-width: 767px)";

function subscribe(query, callback) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const list = window.matchMedia(query);
  list.addEventListener("change", callback);
  return () => list.removeEventListener("change", callback);
}

export function useMediaQuery(query) {
  return React.useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false,
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false,
  );
}
