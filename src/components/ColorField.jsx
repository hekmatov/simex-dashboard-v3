import React from "react";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export default function ColorField({ label, value, fallback = "#043BCB", onChange }) {
  const normalizedValue = normalizeHexColor(value, fallback);
  const [draft, setDraft] = React.useState(normalizedValue);
  const [message, setMessage] = React.useState("");
  const pickerActiveRef = React.useRef(false);

  React.useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue]);

  function commitColor(nextColor) {
    const normalized = normalizeHexColor(nextColor, "");
    setDraft(nextColor);
    if (!normalized) {
      setMessage("Use #RRGGBB.");
      return;
    }
    setMessage("");
    onChange(normalized);
  }

  function startPicking() {
    if (pickerActiveRef.current) {
      setMessage("A picker window is already open.");
      return;
    }
    if (typeof window === "undefined" || !("EyeDropper" in window)) {
      setMessage("Native picker is unavailable in this browser.");
      return;
    }
    const requestId = makePickerRequestId();
    const pickerWindow = window.open("", `simex-color-picker-${requestId}`, "popup,width=320,height=210,left=120,top=120");
    if (!pickerWindow) {
      setMessage("Popup blocked. Allow popups or type the hex color.");
      return;
    }

    pickerActiveRef.current = true;
    setMessage("Picker window opened. Use it to start the native picker.");

    function cleanup() {
      window.removeEventListener("message", handlePickerMessage);
      clearInterval(closeCheck);
      pickerActiveRef.current = false;
    }

    function handlePickerMessage(event) {
      if (event.origin !== window.location.origin || event.data?.type !== "simex-color-picked" || event.data.requestId !== requestId) {
        return;
      }
      if (event.data.color) {
        commitColor(event.data.color);
      } else if (event.data.error) {
        setMessage(event.data.error);
      }
      cleanup();
    }

    const closeCheck = setInterval(() => {
      if (pickerWindow.closed) {
        cleanup();
      }
    }, 500);

    window.addEventListener("message", handlePickerMessage);
    pickerWindow.document.open();
    pickerWindow.document.write(pickerWindowHtml(requestId, window.location.origin));
    pickerWindow.document.close();
    pickerWindow.focus();
  }

  return (
    <div className="settings-color-field">
      <span>{label}</span>
      <div className="settings-color-row">
        <span className="settings-color-swatch" style={{ backgroundColor: normalizedValue }} aria-hidden="true" />
        <input
          aria-label={label}
          value={draft}
          onChange={(event) => commitColor(event.target.value)}
          onBlur={(event) => setDraft(normalizeHexColor(event.target.value, normalizedValue))}
          spellCheck="false"
        />
        <button
          type="button"
          className="secondary settings-pipette-button"
          onClick={startPicking}
          aria-label={`Pick ${String(label).toLowerCase()} from dashboard`}
          title="Pick color from screen"
        >
          <PipetteIcon />
        </button>
      </div>
      {message ? <small>{message}</small> : null}
    </div>
  );
}

function PipetteIcon() {
  return (
    <svg className="settings-pipette-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14.5 4.5 19.5 9.5" />
      <path d="M8 16 4.5 19.5" />
      <path d="M6.5 17.5 16.5 7.5" />
      <path d="M14 5 19 10 16 13 11 8z" />
      <path d="M5 20h5" />
    </svg>
  );
}

function makePickerRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pickerWindowHtml(requestId, origin) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Pick color</title>
    <style>
      body {
        align-items: center;
        background: #f5f8fb;
        color: #08224a;
        display: grid;
        font-family: Inter, Arial, sans-serif;
        gap: 12px;
        justify-items: center;
        margin: 0;
        min-height: 100vh;
        padding: 18px;
        text-align: center;
      }
      button {
        background: #043bcb;
        border: 0;
        border-radius: 7px;
        color: white;
        cursor: pointer;
        font: inherit;
        font-weight: 700;
        padding: 10px 14px;
      }
      p {
        font-size: 13px;
        line-height: 1.35;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <button id="pick" type="button" autofocus>Start native picker</button>
    <p>Click a screen pixel to apply it. Press Esc or close this window to cancel.</p>
    <script>
      const requestId = ${JSON.stringify(requestId)};
      const origin = ${JSON.stringify(origin)};
      const send = (payload) => window.opener?.postMessage({ type: "simex-color-picked", requestId, ...payload }, origin);
      document.getElementById("pick").addEventListener("click", async () => {
        if (!("EyeDropper" in window)) {
          send({ error: "Native picker is unavailable in this browser." });
          window.close();
          return;
        }
        try {
          const result = await new EyeDropper().open();
          send({ color: result?.sRGBHex });
          window.close();
        } catch (error) {
          send({ error: error?.name === "AbortError" ? "Picker cancelled." : error?.message || "Native picker could not start." });
          window.close();
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          send({ error: "Picker cancelled." });
          window.close();
        }
      });
    </script>
  </body>
</html>`;
}

function normalizeHexColor(value, fallback) {
  const color = String(value ?? "").trim();
  return HEX_COLOR_PATTERN.test(color) ? color.toUpperCase() : fallback;
}
