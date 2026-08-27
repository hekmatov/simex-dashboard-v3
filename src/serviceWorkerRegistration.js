export function registerServiceWorker({
  navigatorRef = navigator,
  windowRef = window,
  serviceWorkerUrl,
} = {}) {
  const serviceWorker = navigatorRef?.serviceWorker;
  if (!serviceWorker || !serviceWorkerUrl) return Promise.resolve();

  const hadController = Boolean(serviceWorker.controller);
  let reloaded = false;
  serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    windowRef.location.reload();
  });

  return serviceWorker.register(serviceWorkerUrl, { updateViaCache: "none" })
    .then((registration) => registration?.update?.())
    .catch(() => undefined);
}
