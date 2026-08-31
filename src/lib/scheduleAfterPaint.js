export function scheduleAfterPaint(callback, scheduler = globalThis) {
  if (typeof callback !== "function") throw new TypeError("Post-paint work requires a callback.");
  const requestFrame = typeof scheduler?.requestAnimationFrame === "function"
    ? scheduler.requestAnimationFrame.bind(scheduler)
    : (next) => scheduler.setTimeout(next, 0);
  const cancelFrame = typeof scheduler?.cancelAnimationFrame === "function"
    ? scheduler.cancelAnimationFrame.bind(scheduler)
    : scheduler.clearTimeout.bind(scheduler);
  let timerId = null;
  let frameId = requestFrame(() => {
    frameId = null;
    timerId = scheduler.setTimeout(() => {
      timerId = null;
      callback();
    }, 0);
  });
  return () => {
    if (frameId !== null) cancelFrame(frameId);
    if (timerId !== null) scheduler.clearTimeout(timerId);
    frameId = null;
    timerId = null;
  };
}
