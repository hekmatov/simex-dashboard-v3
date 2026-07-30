export async function pickColorFromPage({
  ownerDocument = typeof document === "undefined" ? null : document,
  EyeDropperCtor = typeof EyeDropper === "undefined" ? null : EyeDropper,
} = {}) {
  if (!ownerDocument || !EyeDropperCtor) {
    throw new Error("Native picker is unavailable in this browser.");
  }

  const root = ownerDocument.documentElement;
  root.dataset.simexEyedropperActive = "true";
  await nextPaint(ownerDocument.defaultView);

  try {
    const result = await new EyeDropperCtor().open();
    return result?.sRGBHex ?? "";
  } finally {
    delete root.dataset.simexEyedropperActive;
  }
}

function nextPaint(ownerWindow) {
  return new Promise((resolve) => {
    if (typeof ownerWindow?.requestAnimationFrame !== "function") {
      resolve();
      return;
    }
    ownerWindow.requestAnimationFrame(() => {
      ownerWindow.requestAnimationFrame(resolve);
    });
  });
}
