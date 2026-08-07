export async function pickColorFromPage({
  ownerDocument = typeof document === "undefined" ? null : document,
} = {}) {
  if (!ownerDocument) {
    throw new Error("Color picker is unavailable without a document.");
  }

  const root = ownerDocument.documentElement;
  root.dataset.simexEyedropperActive = "true";
  await nextPaint(ownerDocument.defaultView);

  try {
    return await pickColorFromDocument(ownerDocument);
  } finally {
    delete root.dataset.simexEyedropperActive;
  }
}

function pickColorFromDocument(ownerDocument) {
  const ownerWindow = ownerDocument.defaultView;
  if (!ownerWindow || !ownerDocument.body) {
    throw new Error("Page color picker could not start.");
  }

  const indicator = ownerDocument.createElement("div");
  indicator.className = "simex-page-color-sampler";
  indicator.setAttribute("role", "status");
  indicator.innerHTML = [
    '<span class="simex-page-color-sampler-swatch"></span>',
    '<span class="simex-page-color-sampler-value">Move over a color, then click</span>',
    '<span class="simex-page-color-sampler-help">Esc to cancel</span>',
  ].join("");
  ownerDocument.body.appendChild(indicator);

  const swatch = indicator.querySelector(".simex-page-color-sampler-swatch");
  const value = indicator.querySelector(".simex-page-color-sampler-value");
  let currentColor = "#FFFFFF";
  const escapeArmedAt = ownerWindow.performance.now() + 350;

  function updateAt(clientX, clientY) {
    currentColor = samplePageColor(ownerDocument, clientX, clientY) ?? currentColor;
    swatch.style.backgroundColor = currentColor;
    value.textContent = currentColor;
    const margin = 14;
    const width = indicator.offsetWidth || 210;
    const height = indicator.offsetHeight || 44;
    indicator.style.left = `${Math.max(8, Math.min(clientX + margin, ownerWindow.innerWidth - width - 8))}px`;
    indicator.style.top = `${Math.max(8, Math.min(clientY + margin, ownerWindow.innerHeight - height - 8))}px`;
  }

  return new Promise((resolve, reject) => {
    function cleanup() {
      ownerDocument.removeEventListener("pointermove", handlePointerMove, true);
      ownerDocument.removeEventListener("pointerdown", handlePointerDown, true);
      ownerDocument.removeEventListener("keydown", handleKeyDown, true);
      indicator.remove();
    }

    function handlePointerMove(event) {
      updateAt(event.clientX, event.clientY);
    }

    function handlePointerDown(event) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      updateAt(event.clientX, event.clientY);
      const selected = currentColor;
      cleanup();
      resolve(selected);
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      if (ownerWindow.performance.now() < escapeArmedAt) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      cleanup();
      reject(new DOMException("Picker cancelled.", "AbortError"));
    }

    ownerDocument.addEventListener("pointermove", handlePointerMove, true);
    ownerDocument.addEventListener("pointerdown", handlePointerDown, true);
    ownerDocument.addEventListener("keydown", handleKeyDown, true);
  });
}

function samplePageColor(ownerDocument, clientX, clientY) {
  const element = ownerDocument.elementFromPoint(clientX, clientY);
  if (!element) return null;

  const canvas = element.closest?.("canvas");
  const canvasColor = canvas ? sampleCanvasColor(canvas, clientX, clientY) : null;
  if (canvasColor) return canvasColor;

  if (element instanceof ownerDocument.defaultView.SVGElement) {
    const svgStyle = ownerDocument.defaultView.getComputedStyle(element);
    const svgColor = normalizeCssColor(svgStyle.fill) ?? normalizeCssColor(svgStyle.stroke);
    if (svgColor) return svgColor;
  }

  let current = element;
  while (current instanceof ownerDocument.defaultView.Element) {
    const style = ownerDocument.defaultView.getComputedStyle(current);
    const background = normalizeCssColor(style.backgroundColor);
    if (background) return background;
    current = current.parentElement;
  }

  return normalizeCssColor(ownerDocument.defaultView.getComputedStyle(element).color);
}

function sampleCanvasColor(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  try {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((clientX - rect.left) * canvas.width / rect.width)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((clientY - rect.top) * canvas.height / rect.height)));
    const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
    return alpha > 0 ? rgbToHex(red, green, blue) : null;
  } catch {
    return null;
  }
}

function normalizeCssColor(value) {
  const color = String(value ?? "").trim().toLowerCase();
  if (!color || color === "none" || color === "transparent") return null;
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color.slice(1).split("").map((part) => `${part}${part}`).join("")}`.toUpperCase();
  }
  if (!color.startsWith("rgb")) return null;
  const channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
  if (channels.length < 3 || (channels.length > 3 && channels[3] === 0)) return null;
  return rgbToHex(channels[0], channels[1], channels[2]);
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
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
